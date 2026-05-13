/**
 * Cloudflare Pages Function — POST /api/fulfill/grant-access
 *
 * Central fulfillment endpoint. Called by:
 *   • Stripe webhook handler (Flask payment service on the VPS) after
 *     a `checkout.session.completed` event.
 *   • Razorpay verify-payment (this same Functions runtime) after a
 *     successful HMAC signature check.
 *
 * Responsibilities (in parallel, each gracefully no-ops when its
 * env var is missing):
 *   1. Add the buyer to the private Codeberg repo(s) for their SKU
 *      via the Forgejo REST API. Bundle (BSK-ALL) gets all six repos.
 *   2. Append a row to the buyers Google Sheet (fallback paper trail).
 *   3. Send the welcome email via Resend with: Codeberg invite hint,
 *      Discord invite URL, playbook reference, support escape.
 *   4. Post a notification to a Discord operator-webhook so the
 *      founder sees every purchase land in real time.
 *   5. Persist the buyer in Postgres via Flask /api/grow/record-buyer.
 *
 * Auth: this endpoint is shared-secret protected via `FULFILL_SECRET`
 * in the request header `x-fulfill-secret`. The Stripe webhook handler
 * and the Razorpay verify-payment Function both know the secret;
 * external callers cannot fire it.
 *
 * Required env (Cloudflare Pages → Production):
 *   FULFILL_SECRET            shared secret with payment webhooks
 *   CODEBERG_FULFILL_TOKEN    Forgejo personal access token with
 *                             write:repository scope on the org's
 *                             private buyer repos. Replaces the prior
 *                             GitHub PAT after the org migration to
 *                             codeberg.org/glitch-executor.
 *   CODEBERG_API_BASE         optional override for the Forgejo API
 *                             root. Defaults to https://codeberg.org/api/v1.
 *   RESEND_API_KEY            already used by capture-lead.ts
 *   RESEND_FROM               'Glitch Grow <support@glitchexecutor.com>'
 *   DISCORD_OPS_WEBHOOK       operator alert webhook URL
 *   DISCORD_INVITE_URL        community invite (e.g. discord.gg/HBZFKMts)
 *   BUYERS_SHEET_ID           Google Sheet ID for the buyers tab
 *   SHEETS_SA_JSON            same SA used by capture-lead Sheet append
 *
 * Idempotency: keyed on the upstream payment_id (Stripe session_id or
 * Razorpay payment_id). Re-firing with the same id should never invite
 * the buyer to the same repo twice or send the welcome email twice.
 * Implementation: Forgejo's collaborator-add endpoint is idempotent
 * (returns 204 if already a collaborator); the Postgres ledger keys on
 * the unique payment_id (UPSERT). Email + Discord webhook are fire-and-
 * forget; a duplicate from a webhook retry is acceptable — the buyer
 * just gets a second copy.
 */

import { reposFor, SKU_CATALOG } from '../../_sku-catalog';

export interface Env {
  FULFILL_SECRET?: string;
  CODEBERG_FULFILL_TOKEN?: string;
  CODEBERG_API_BASE?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  DISCORD_OPS_WEBHOOK?: string;
  DISCORD_INVITE_URL?: string;
  /** Primary buyer ledger — Flask /api/grow/record-buyer on the VPS,
   *  reached via the gray-clouded mcp.glitchexecutor.com host nginx. */
  BUYER_LEDGER_URL?: string;
  /** Secondary fallback ledger — Google Sheet append. Optional safety
   *  net so we don't lose data if Postgres is unreachable. */
  BUYERS_SHEET_ID?: string;
  SHEETS_SA_JSON?: string;
  /** Meta Conversions API — server-side Purchase fire that dedupes with
   *  the browser fbq.track('Purchase', …, { eventID: payment_id }). */
  META_CAPI_TOKEN?: string;
  META_PIXEL_ID?: string;
  META_TEST_EVENT_CODE?: string;
  /** TikTok Events API — server-side Purchase fire dedup'd with the
   *  browser ttq.track('Purchase', …, { event_id: payment_id }). */
  TIKTOK_CAPI_TOKEN?: string;
  TIKTOK_PIXEL_ID?: string;
  TIKTOK_TEST_EVENT_CODE?: string;
}

interface FulfillRequest {
  /** Provider that captured the payment. */
  provider: 'stripe' | 'razorpay';
  /** Stripe session_id or Razorpay payment_id. Used as the idempotency key. */
  payment_id: string;
  /** SKU purchased (BSK-001..006 or BSK-ALL). */
  sku: string;
  /** Buyer email, from Stripe customer or Razorpay payment. */
  email: string;
  /** Optional buyer Codeberg username — captured at checkout under
   *  the (legacy-named) `github_username` schema key so existing
   *  Stripe Payment Link custom_fields and Razorpay order.notes keep
   *  working unchanged. The value is now treated as a Codeberg
   *  account name when the invite fires. */
  github_username?: string;
  /** Buyer name, if available. */
  name?: string;
  /** Total paid in major-currency units (e.g. 499 for $499). */
  amount?: number;
  /** Currency ISO. */
  currency?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Shared-secret gate.
  const incomingSecret = request.headers.get('x-fulfill-secret') || '';
  if (!env.FULFILL_SECRET || incomingSecret !== env.FULFILL_SECRET) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  let body: FulfillRequest;
  try {
    body = (await request.json()) as FulfillRequest;
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400);
  }

  const sku = (body.sku ?? '').trim().toUpperCase();
  const entry = SKU_CATALOG[sku];
  if (!entry) {
    return json({ ok: false, error: 'unknown-sku', sku }, 400);
  }
  if (!body.payment_id || !body.email) {
    return json({ ok: false, error: 'missing-fields' }, 400);
  }

  // Block synthetic smoke-test payment_ids from ever hitting the fan-out.
  // An external scheduled job (CF Pages cron or similar — still tracing it)
  // was firing 'smoke_<unix-ts>' POSTs every ~26s for 5 days, which fanned
  // out 16K+ fake Purchase events to Meta CAPI + TikTok CAPI + 16K Resend
  // welcome emails to smoke-test@glitchexecutor.com. Stops the bleed at the
  // choke point until the scheduler is found and disabled. Returns 200 so
  // the caller treats it as success and stops retrying.
  const pid = String(body.payment_id);
  const em  = String(body.email ?? '').toLowerCase();
  if (pid.startsWith('smoke_') || pid.startsWith('capi_verify_') ||
      em === 'smoke-test@glitchexecutor.com' || em === 'capi-verify@glitchexecutor.com') {
    return json({
      ok: true,
      no_op: true,
      reason: 'smoke-or-verify-test-blocked',
      payment_id: body.payment_id,
    });
  }

  // Five side-effects in parallel; each gracefully no-ops when its
  // dependent env var is missing. Failure of one doesn't prevent the
  // others. The buyer ledger is now Postgres (Flask endpoint); Sheets
  // stays as a secondary fallback writer so a DB outage doesn't lose
  // the paper trail.
  const [cb, ledger, sheet, mail, ops, metaCapi, ttCapi] = await Promise.allSettled([
    inviteToCodeberg(body, entry, env),
    recordBuyerInLedger(body, entry, env),
    appendBuyerSheet(body, entry, env),
    sendWelcomeEmail(body, entry, env),
    notifyOps(body, entry, env),
    forwardMetaCapiPurchase(body, entry, env),
    forwardTikTokCapiPurchase(body, entry, env),
  ]);

  return json({
    ok: true,
    payment_id: body.payment_id,
    sku,
    invited_repos: cb.status === 'fulfilled' ? cb.value : null,
    ledger:        ledger.status === 'fulfilled' ? ledger.value : { error: 'failed' },
    sheet:         sheet.status === 'fulfilled' ? sheet.value : null,
    email_sent:    mail.status === 'fulfilled' ? mail.value : null,
    ops_notified:  ops.status === 'fulfilled' ? ops.value : null,
    meta_capi:     metaCapi.status === 'fulfilled' ? metaCapi.value : null,
    tiktok_capi:   ttCapi.status   === 'fulfilled' ? ttCapi.value   : null,
  });
};

// ── Primary buyer ledger — Flask /api/grow/record-buyer (Postgres) ────
async function recordBuyerInLedger(
  body: FulfillRequest,
  entry: typeof SKU_CATALOG[string],
  env: Env,
): Promise<{ ok: boolean; status?: number; id?: number; error?: string }> {
  if (!env.BUYER_LEDGER_URL || !env.FULFILL_SECRET) return { ok: false, error: 'not-configured' };
  try {
    const r = await fetch(env.BUYER_LEDGER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-fulfill-secret': env.FULFILL_SECRET,
      },
      body: JSON.stringify({
        provider:        body.provider,
        payment_id:      body.payment_id,
        sku:             body.sku,
        email:           body.email,
        github_username: body.github_username,
        buyer_name:      body.name,
        amount:          body.amount,
        currency:        body.currency,
        notes:           { product_name: entry.name, role: entry.role },
        fulfilled:       true,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: number; error?: string };
    return { ok: r.ok, status: r.status, id: j.id, error: j.error };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 120) };
  }
}

// ── 1. Codeberg repo collaborator invite ──────────────────────────────
// Codeberg runs Forgejo (a Gitea fork). The collaborator-add endpoint
// is `PUT /api/v1/repos/{owner}/{repo}/collaborators/{username}` and
// permission value is `read | write | admin` (not `pull` like GitHub).
// Token is a Forgejo personal access token with `write:repository`.
async function inviteToCodeberg(
  body: FulfillRequest,
  entry: typeof SKU_CATALOG[string],
  env: Env,
): Promise<{ repo: string; status: number }[]> {
  if (!env.CODEBERG_FULFILL_TOKEN || !body.github_username) return [];
  const apiBase = env.CODEBERG_API_BASE || 'https://codeberg.org/api/v1';
  const username = encodeURIComponent(body.github_username);
  const repos = entry.repos ?? (entry.repo ? [entry.repo] : []);
  const results: { repo: string; status: number }[] = [];
  for (const repo of repos) {
    const r = await fetch(
      `${apiBase}/repos/${repo}/collaborators/${username}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${env.CODEBERG_FULFILL_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'glitch-grow-fulfill',
        },
        body: JSON.stringify({ permission: 'read' }),
      },
    );
    results.push({ repo, status: r.status });
  }
  return results;
}

// ── 2. Buyers Sheet append ────────────────────────────────────────────
async function appendBuyerSheet(
  body: FulfillRequest,
  entry: typeof SKU_CATALOG[string],
  env: Env,
): Promise<boolean> {
  if (!env.BUYERS_SHEET_ID || !env.SHEETS_SA_JSON) return false;
  let sa: { client_email: string; private_key: string };
  try {
    sa = JSON.parse(env.SHEETS_SA_JSON);
  } catch {
    return false;
  }
  const accessToken = await sheetsToken(sa);
  if (!accessToken) return false;

  const row = [
    new Date().toISOString(),
    body.provider,
    body.payment_id,
    body.sku,
    entry.name,
    body.email,
    body.github_username || '',
    body.name || '',
    String(body.amount ?? ''),
    body.currency || '',
  ];

  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.BUYERS_SHEET_ID}/values/Buyers!A:J:append?valueInputOption=RAW`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    },
  );
  return r.ok;
}

async function sheetsToken(sa: { client_email: string; private_key: string }): Promise<string | null> {
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signed = `${header}.${claim}`;
  const keyPem = sa.private_key.replace(/\\n/g, '\n');
  const keyBuf = pemToArrayBuffer(keyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBuf, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, enc.encode(signed));
  const jwt = `${signed}.${b64uBuf(new Uint8Array(sig))}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { access_token?: string };
  return j.access_token ?? null;
}
function b64u(s: string): string {
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64uBuf(b: Uint8Array): string {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// ── 3. Welcome email via Resend ───────────────────────────────────────
async function sendWelcomeEmail(
  body: FulfillRequest,
  entry: typeof SKU_CATALOG[string],
  env: Env,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const from = env.RESEND_FROM || 'Glitch Grow <support@glitchexecutor.com>';
  const discord = env.DISCORD_INVITE_URL || 'https://discord.gg/HBZFKMts';
  const repos = (entry.repos ?? (entry.repo ? [entry.repo] : [])).filter(Boolean);
  // manualOnly = no automated invite path. Tell the buyer access lands
  // by hand within a few hours instead of pretending we already invited.
  const repoLine = entry.manualOnly
    ? `Access to your private repo will be granted manually within a few hours. We'll reply to this email when it's ready.`
    : body.github_username
    ? `We've sent a Codeberg collaborator invite to <strong>@${esc(body.github_username)}</strong>. Accept it from your Codeberg notifications.`
    : `Reply to this email with your Codeberg username and we'll add you as a collaborator on the private repo within a few minutes.`;

  // The "no terminal needed" install pitch — drop into Claude Code (or
  // Codex / Cursor / any AI coding client), paste this, agent installs
  // itself by reading AGENTS.md at the repo root. Same prompt regardless
  // of SKU; the AGENTS.md per repo carries the SKU-specific install logic.
  const installPrompt =
    'Read AGENTS.md and set this agent up for me. Ask me for any keys or config values you need, then run the smoke test and tell me when I\'m live.';
  const portalUrl = `https://grow.glitchexecutor.com/buyer-portal?payment_id=${encodeURIComponent(body.payment_id)}`;

  const subject = `Your ${entry.name} access is ready`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:560px;line-height:1.55;color:#1d1d1f">
      <h2 style="margin:0 0 18px">You're in. Welcome to ${esc(entry.name)}.</h2>
      <p>You don't need to be a developer to run this. Open it in any AI coding agent — <strong>Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor</strong> — and paste the prompt below. The agent installs itself.</p>
      <ol style="padding-left:20px">
        <li style="margin-bottom:14px"><strong>Repo access.</strong> ${repoLine}<br>
          ${repos.map((r) => `<a href="https://codeberg.org/${r}" style="color:#0a7;text-decoration:none">${esc(r)}</a>`).join('<br>')}
        </li>
        <li style="margin-bottom:14px"><strong>Open the repo in your AI coding agent, then paste this:</strong>
          <pre style="background:#0f0f0f;color:#fff;padding:14px;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.5;white-space:pre-wrap;margin-top:10px">${esc(installPrompt)}</pre>
          Claude reads <code>AGENTS.md</code> at the repo root and walks you through every key + config in plain language. Total time, ~30 minutes.
        </li>
        <li style="margin-bottom:14px"><strong>Discord buyer community.</strong>
          <a href="${esc(discord)}" style="color:#0a7">${esc(discord)}</a> — your <em>${esc(entry.role)}</em> role is granted automatically.
        </li>
        <li style="margin-bottom:14px"><strong>Buyer portal.</strong>
          <a href="${esc(portalUrl)}" style="color:#0a7">${esc(portalUrl)}</a> — buyer PDF, demo videos, support links, all in one place.
        </li>
      </ol>
      <p style="margin-top:22px;color:#666;font-size:13px">If anything is missing in the next 60 minutes, reply to this email with your payment ID
        (<code>${esc(body.payment_id)}</code>) and we'll move it to the front of the queue.</p>
      <p style="margin-top:28px;color:#aaa;font-size:12px">— Tejas, Glitch Grow</p>
    </div>
  `;
  const text = [
    `You're in. Welcome to ${entry.name}.`,
    '',
    'You don\'t need to be a developer. Open the repo in any AI coding agent (Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor) and paste the prompt below — the agent installs itself by reading AGENTS.md.',
    '',
    body.github_username
      ? `Repo access: we sent a Codeberg collaborator invite to @${body.github_username}.`
      : `Repo access: reply with your Codeberg username and we'll add you within a few minutes.`,
    `Repos: ${repos.map((r) => 'https://codeberg.org/' + r).join(', ')}`,
    '',
    'Open the repo in your AI coding agent, then paste:',
    `  ${installPrompt}`,
    '',
    `Discord: ${discord}  (you'll receive the ${entry.role} role)`,
    `Buyer portal: ${portalUrl}`,
    '',
    `If anything is missing, reply with payment_id ${body.payment_id}.`,
    '',
    '— Tejas',
  ].join('\n');

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: body.email,
      reply_to: 'support@glitchexecutor.com',
      subject,
      html,
      text,
    }),
  });
  return r.ok;
}

// ── 4. Operator Discord webhook ──────────────────────────────────────
async function notifyOps(
  body: FulfillRequest,
  entry: typeof SKU_CATALOG[string],
  env: Env,
): Promise<boolean> {
  if (!env.DISCORD_OPS_WEBHOOK) return false;
  // Loud, visually distinct ping when the SKU needs a manual repo grant
  // (BSK-004 social blocked on GitHub restore, BSK-006 Shopify undecided,
  // or BSK-ALL — the bundle includes both). Title and color flip so the
  // founder sees it in 2 seconds and acts.
  const manual = entry.manualOnly === true || entry.manualReason;
  const title = manual
    ? `⚠️ ${entry.name} purchased — MANUAL repo grant required`
    : `💸 ${entry.name} purchased`;
  const color = manual ? 0xffaa00 : 0x00ff9d;
  const fields = [
    { name: 'SKU', value: body.sku, inline: true },
    { name: 'Provider', value: body.provider, inline: true },
    { name: 'Amount', value: `${body.amount ?? '?'} ${body.currency ?? ''}`, inline: true },
    { name: 'Email', value: body.email },
    { name: 'Codeberg user', value: body.github_username || '_(asked via email)_', inline: true },
    { name: 'Payment ID', value: body.payment_id, inline: true },
  ];
  if (manual && entry.manualReason) {
    fields.push({ name: 'Why manual', value: entry.manualReason, inline: false });
  }
  const r = await fetch(env.DISCORD_OPS_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{ title, color, fields, timestamp: new Date().toISOString() }],
    }),
  });
  return r.ok;
}

// ── 5. Meta Conversions API — server-side Purchase ──────────────────
//
// Mirrors the Meta CAPI Lead forwarder in capture-lead.ts (same hashing,
// same v22.0 endpoint). Uses body.payment_id as event_id so that the
// browser-side fbq.track('Purchase', …, { eventID: payment_id }) on
// /thanks dedupes against this server-side fire. ~25% of buyers have
// ad-blockers that swallow the browser fbq call; CAPI closes that gap.
async function forwardMetaCapiPurchase(
  body: FulfillRequest,
  entry: typeof SKU_CATALOG[string],
  env: Env,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!env.META_CAPI_TOKEN || !env.META_PIXEL_ID) {
    return { ok: false, error: 'not-configured' };
  }
  const emHash = await sha256Hex(body.email.toLowerCase().trim());
  const fnHash = body.name
    ? await sha256Hex((body.name.split(/\s+/)[0] || '').toLowerCase())
    : '';

  const userData: Record<string, unknown> = { em: [emHash] };
  if (fnHash) userData.fn = [fnHash];

  const payload: Record<string, unknown> = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: 'https://grow.glitchexecutor.com/thanks',
      event_id: body.payment_id,
      user_data: userData,
      custom_data: {
        currency: body.currency || 'USD',
        value: body.amount ?? 0,
        content_ids: [body.sku],
        content_name: entry.name,
        content_type: 'product',
        contents: [{ id: body.sku, quantity: 1, item_price: body.amount ?? 0 }],
        num_items: 1,
        order_id: body.payment_id,
      },
    }],
    access_token: env.META_CAPI_TOKEN,
  };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  try {
    const r = await fetch(
      `https://graph.facebook.com/v22.0/${env.META_PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 120) };
  }
}

// ── 6. TikTok Events API — server-side Purchase ──────────────────────
//
// Same idea as Meta CAPI — server-side fire deduped against the browser
// ttq.track via shared event_id = payment_id.
async function forwardTikTokCapiPurchase(
  body: FulfillRequest,
  entry: typeof SKU_CATALOG[string],
  env: Env,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!env.TIKTOK_CAPI_TOKEN || !env.TIKTOK_PIXEL_ID) {
    return { ok: false, error: 'not-configured' };
  }
  const emHash = await sha256Hex(body.email.toLowerCase().trim());

  const payload: Record<string, unknown> = {
    event_source: 'web',
    event_source_id: env.TIKTOK_PIXEL_ID,
    // partner_name omitted — TikTok rejects strings containing spaces
    // ("Invalid value for partner_name: not a valid string"), and it's
    // optional anyway. Only used for partner-co-branded integrations.
    data: [{
      event: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.payment_id,
      user: { email: emHash },
      page: { url: 'https://grow.glitchexecutor.com/thanks' },
      properties: {
        order_id: body.payment_id,
        contents: [{
          content_id: body.sku,
          content_name: entry.name,
          content_type: 'product',
          quantity: 1,
          price: body.amount ?? 0,
        }],
        content_type: 'product',
        currency: body.currency || 'USD',
        value: body.amount ?? 0,
      },
    }],
  };
  // test_event_code goes top-level, NOT inside data[] — TikTok silently
  // ignores nested ones (same gotcha as the lead-capture forwarder).
  if (env.TIKTOK_TEST_EVENT_CODE) payload.test_event_code = env.TIKTOK_TEST_EVENT_CODE;

  try {
    const r = await fetch(
      'https://business-api.tiktok.com/open_api/v1.3/event/track/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': env.TIKTOK_CAPI_TOKEN,
        },
        body: JSON.stringify(payload),
      },
    );
    // TikTok always returns HTTP 200 — actual success is encoded in the
    // body's `code` field (0 = success, anything else = failure with
    // `message`). The HTTP layer alone is misleading; surface the body
    // so smoke tests can spot per-field validation errors.
    const j = (await r.json().catch(() => ({}))) as { code?: number; message?: string };
    const ok = r.ok && j.code === 0;
    return ok
      ? { ok: true, status: r.status }
      : { ok: false, status: r.status, error: `tt_code=${j.code ?? '?'} ${j.message ?? ''}`.trim().slice(0, 200) };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 120) };
  }
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function esc(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
