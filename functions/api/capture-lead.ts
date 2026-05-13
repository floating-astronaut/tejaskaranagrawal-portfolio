/**
 * Cloudflare Pages Function — POST /api/capture-lead
 *
 * Receives the LeadFormModal POST. Forwards captured leads to all configured
 * sinks in parallel, each gracefully skipped when its env var is absent so
 * dev/preview deploys still work without full secret wiring.
 *
 * Forwarders (each independent):
 *   1. Resend Audience       → adds the contact to the kit-leads audience
 *   2. Resend welcome email  → sends a branded welcome to the buyer
 *   3. Google Sheet append   → backup row written via service-account JWT
 *   4. Discord webhook       → optional ping in #vibe-kit-help for visibility
 *   5. Meta CAPI Lead event  → server-side conversion for ad retargeting
 *
 * Required env vars (set in Cloudflare Pages dashboard for prod + preview):
 *   TURNSTILE_SECRET     — server-side Turnstile secret (skipped if absent)
 *   RESEND_API_KEY       — same key already wired for /api/contact
 *   RESEND_AUDIENCE_ID   — created via scripts/setup-resend-audience.mjs
 *   RESEND_FROM          — e.g. "Glitch Grow <support@glitchexecutor.com>"
 *   SHEETS_SA_JSON       — full service-account JSON (single string env var)
 *   SHEETS_LEADS_ID      — created via scripts/setup-leads-sheet.mjs
 *
 * Optional env vars:
 *   DISCORD_LEAD_WEBHOOK — Discord webhook URL for visibility pings
 *   META_CAPI_TOKEN      — Meta Conversions API token
 *   META_PIXEL_ID        — Meta pixel ID
 *   META_TEST_EVENT_CODE — route to Events Manager Test Events for staging
 *
 *   TIKTOK_CAPI_TOKEN    — TikTok Events API access token
 *   TIKTOK_PIXEL_ID      — TikTok pixel ID (server-side identifier)
 *   TIKTOK_TEST_EVENT_CODE — optional TikTok Events Manager test_event_code
 */

export interface Env {
  TURNSTILE_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_AUDIENCE_ID?: string;
  RESEND_FROM?: string;
  SHEETS_SA_JSON?: string;
  SHEETS_LEADS_ID?: string;
  DISCORD_LEAD_WEBHOOK?: string;
  /** Permanent invite URL to the community Discord (e.g. https://discord.gg/HBZFKMts).
   *  When set, the welcome email includes this as a clickable join link.
   *  When unset, falls back to a generic "we'll send a Discord invite shortly" line. */
  DISCORD_INVITE_URL?: string;
  META_CAPI_TOKEN?: string;
  META_PIXEL_ID?: string;
  META_TEST_EVENT_CODE?: string;
  TIKTOK_CAPI_TOKEN?: string;
  TIKTOK_PIXEL_ID?: string;
  TIKTOK_TEST_EVENT_CODE?: string;
}

interface LeadPayload {
  name: string;
  email: string;
  phone: string;
  profession: string;
  utm_source: string;
  token: string;
}

interface RequestCtx {
  event_id: string;
  timestamp: string;
  ip: string;
  ua: string;
  ref: string;
  country: string;
}

const PROFESSION_VALUES = new Set([
  'indie-dev',
  'marketing-freelancer',
  'agency-owner',
  'in-house-marketing',
  'student',
  'other',
]);

const PROFESSION_LABELS: Record<string, string> = {
  'indie-dev': 'Indie developer / solo founder',
  'marketing-freelancer': 'Marketing freelancer / consultant',
  'agency-owner': 'Agency owner',
  'in-house-marketing': 'Marketing or growth at a company',
  'student': 'Student / learning AI',
  'other': 'Other',
};

const MAX_LEN = {
  name: 200,
  email: 200,
  phone: 50,
  profession: 50,
  utm_source: 200,
} as const;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const eventId = crypto.randomUUID();
  const contentType = request.headers.get('content-type') ?? '';

  let raw: Record<string, FormDataEntryValue | string> = {};
  try {
    if (contentType.includes('application/json')) {
      raw = (await request.json()) as Record<string, string>;
    } else {
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) raw[k] = v;
    }
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400);
  }

  // Honeypot — drop silently with OK
  if (clean(raw.company_url, 200)) {
    return json({ ok: true, event_id: eventId, status: 'honeypot' });
  }

  const payload: LeadPayload = {
    name:       clean(raw.name,       MAX_LEN.name),
    email:      clean(raw.email,      MAX_LEN.email),
    phone:      clean(raw.phone,      MAX_LEN.phone),
    profession: clean(raw.profession, MAX_LEN.profession),
    utm_source: clean(raw.utm_source, MAX_LEN.utm_source),
    token:      clean((raw as Record<string, FormDataEntryValue | string>)['cf-turnstile-response'], 4096),
  };

  if (!payload.name || !payload.email || !payload.phone || !payload.profession) {
    return json({ ok: false, error: 'missing-fields' }, 400);
  }
  if (!isEmail(payload.email)) {
    return json({ ok: false, error: 'bad-email' }, 400);
  }
  if (!isPhone(payload.phone)) {
    return json({ ok: false, error: 'bad-phone' }, 400);
  }
  if (!PROFESSION_VALUES.has(payload.profession)) {
    return json({ ok: false, error: 'bad-profession' }, 400);
  }

  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(payload.token, env.TURNSTILE_SECRET, clientIp(request));
    if (!ok) return json({ ok: false, error: 'turnstile-failed' }, 403);
  }

  const ctx: RequestCtx = {
    event_id:  eventId,
    timestamp: new Date().toISOString(),
    ip:        clientIp(request),
    ua:        request.headers.get('user-agent') ?? '',
    ref:       request.headers.get('referer') ?? '',
    country:   (request.headers.get('cf-ipcountry') ?? '').toUpperCase() || 'XX',
  };

  // Forward to all configured sinks in parallel — each gracefully no-ops
  // when its env var is missing.
  await Promise.allSettled([
    forwardResendAudience(payload, env),
    forwardResendWelcomeEmail(payload, env),
    forwardGoogleSheet(payload, ctx, env),
    forwardDiscordWebhook(payload, ctx, env),
    forwardMetaCapi(payload, ctx, env),
    forwardTikTokCapi(payload, ctx, env),
  ]);

  return json({ ok: true, event_id: eventId, status: 'captured' });
};

// ── Forwarders ───────────────────────────────────────────────────────────

async function forwardResendAudience(p: LeadPayload, env: Env): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESEND_AUDIENCE_ID) return;
  const [firstName, ...rest] = p.name.split(/\s+/);
  const lastName = rest.join(' ') || undefined;
  await fetch(`https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: p.email,
      first_name: firstName,
      last_name: lastName,
      unsubscribed: false,
    }),
  }).catch(() => { /* swallow — concurrent sinks shouldn't fail capture */ });
}

async function forwardResendWelcomeEmail(p: LeadPayload, env: Env): Promise<void> {
  if (!env.RESEND_API_KEY) return;
  const from = env.RESEND_FROM || 'Glitch Grow <support@glitchexecutor.com>';
  const firstName = (p.name.split(/\s+/)[0] || 'there').slice(0, 60);
  const tpl = welcomeTemplate(firstName, p.profession, env.DISCORD_INVITE_URL);

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [p.email],
      reply_to: 'support@glitchexecutor.com',
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    }),
  }).catch(() => { /* swallow */ });
}

async function forwardGoogleSheet(p: LeadPayload, ctx: RequestCtx, env: Env): Promise<void> {
  if (!env.SHEETS_SA_JSON || !env.SHEETS_LEADS_ID) return;
  let sa: { client_email: string; private_key: string };
  try {
    sa = JSON.parse(env.SHEETS_SA_JSON) as typeof sa;
  } catch {
    return;
  }

  const accessToken = await mintGoogleAccessToken(sa, [
    'https://www.googleapis.com/auth/spreadsheets',
  ]).catch(() => null);
  if (!accessToken) return;

  const row = [
    ctx.timestamp,
    ctx.event_id,
    p.name,
    p.email,
    p.phone,
    PROFESSION_LABELS[p.profession] || p.profession,
    p.utm_source,
    ctx.country,
    ctx.ip,
    ctx.ua,
    ctx.ref,
  ];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEETS_LEADS_ID}/values/leads:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [row] }),
  }).catch(() => { /* swallow */ });
}

async function forwardDiscordWebhook(p: LeadPayload, ctx: RequestCtx, env: Env): Promise<void> {
  if (!env.DISCORD_LEAD_WEBHOOK) return;
  await fetch(env.DISCORD_LEAD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Vibe Kit',
      embeds: [{
        title: 'New free-kit signup',
        color: 0x00ff9d,
        fields: [
          { name: 'Name', value: p.name, inline: true },
          { name: 'Email', value: maskEmail(p.email), inline: true },
          { name: 'Phone', value: maskPhone(p.phone), inline: true },
          { name: 'Profession', value: PROFESSION_LABELS[p.profession] || p.profession, inline: true },
          { name: 'Country', value: ctx.country, inline: true },
          { name: 'Source', value: p.utm_source || '—', inline: true },
        ],
        timestamp: ctx.timestamp,
        footer: { text: ctx.event_id },
      }],
    }),
  }).catch(() => { /* swallow */ });
}

async function forwardMetaCapi(p: LeadPayload, ctx: RequestCtx, env: Env): Promise<void> {
  if (!env.META_CAPI_TOKEN || !env.META_PIXEL_ID) return;
  const emHash = await sha256Hex(p.email.toLowerCase().trim());
  const phHash = await sha256Hex(p.phone.replace(/[^\d]/g, ''));
  const fnHash = await sha256Hex((p.name.split(/\s+/)[0] || '').toLowerCase());

  const userData: Record<string, unknown> = {
    em: [emHash],
    ph: [phHash],
    fn: [fnHash],
  };
  if (ctx.ip) userData.client_ip_address = ctx.ip;
  if (ctx.ua) userData.client_user_agent = ctx.ua;

  const body: Record<string, unknown> = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: ctx.ref || 'https://grow.glitchexecutor.com/',
      event_id: ctx.event_id,
      user_data: userData,
      custom_data: {
        content_name: 'vibe-kit',
        content_category: 'free-kit-capture',
        profession: p.profession,
      },
    }],
    access_token: env.META_CAPI_TOKEN,
  };
  if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE;

  // v22.0 was the latest stable when this was last reviewed (2026-05).
  // Bumping older versions is harmless; v19.0 was nearing its 2-year deprecation.
  await fetch(`https://graph.facebook.com/v22.0/${env.META_PIXEL_ID}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => { /* swallow */ });
}

/** TikTok Events API server-side conversion event. Mirrors the Meta CAPI
 *  forwarder structurally — same hashed PII fields, same dedupe via
 *  event_id with the browser-side ttq.track('CompleteRegistration') if
 *  one ever fires. The pixel ID is sent in `pixel_code`; PII is SHA-256
 *  hashed exactly the same way Meta requires. Endpoint is v1.3 of the
 *  Events API (current as of Q1 2026). */
async function forwardTikTokCapi(p: LeadPayload, ctx: RequestCtx, env: Env): Promise<void> {
  if (!env.TIKTOK_CAPI_TOKEN || !env.TIKTOK_PIXEL_ID) return;
  const emHash = await sha256Hex(p.email.toLowerCase().trim());
  const phHash = await sha256Hex(p.phone.replace(/[^\d]/g, ''));

  // TikTok's user-data shape: properties at the top of the user object,
  // not arrays. Hashed values only for em / ph; ip / ua sent in the clear
  // because TikTok hashes them server-side itself.
  const user: Record<string, unknown> = {
    email: emHash,
    phone: phHash,
  };
  if (ctx.ip) user.ip = ctx.ip;
  if (ctx.ua) user.user_agent = ctx.ua;

  const body: Record<string, unknown> = {
    event_source: 'web',
    event_source_id: env.TIKTOK_PIXEL_ID,
    // partner_name omitted — TikTok rejects strings with spaces; optional.
    data: [{
      event: 'CompleteRegistration',
      event_time: Math.floor(Date.now() / 1000),
      event_id: ctx.event_id,
      user,
      page: { url: ctx.ref || 'https://grow.glitchexecutor.com/' },
      properties: {
        content_id: 'vibe-kit-lead',
        content_name: 'vibe-kit',
        content_type: 'product',
        currency: 'USD',
        value: 0,
        description: `profession=${p.profession}`,
      },
    }],
  };
  // test_event_code goes at the TOP LEVEL of the request, NOT inside the
  // data[] item. TikTok silently ignores it when nested under data[],
  // which makes staging traffic land in production conversion data.
  if (env.TIKTOK_TEST_EVENT_CODE) body.test_event_code = env.TIKTOK_TEST_EVENT_CODE;

  await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': env.TIKTOK_CAPI_TOKEN,
    },
    body: JSON.stringify(body),
  }).catch(() => { /* swallow — never block the lead capture */ });
}

// ── Welcome email template (placeholder content for v1) ──────────────────

function welcomeTemplate(
  firstName: string,
  profession: string,
  discordInviteUrl?: string,
): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `${firstName}, welcome to the Glitch Vibe Coder Kit`;
  const role = PROFESSION_LABELS[profession] || 'builder';

  // Discord copy varies based on whether DISCORD_INVITE_URL is set.
  const discordTextLine = discordInviteUrl
    ? `  • Join the community Discord right now — ${discordInviteUrl}
    Free-kit help, agent-deployment Q&A, ship-it announcements.`
    : `  • You'll also get a Discord invite shortly. That's where buyers
    help buyers — I drop in weekly.`;

  const discordHtmlBlock = discordInviteUrl
    ? `<li>
        Join the community Discord right now —
        <a href="${escapeHtml(discordInviteUrl)}" style="color:#00ff9d;text-decoration:underline;">${escapeHtml(discordInviteUrl)}</a>.
        Free-kit help, agent-deployment Q&amp;A, ship-it announcements.
      </li>`
    : `<li>
        You'll also get a Discord invite shortly. That's where buyers
        help buyers — I drop in weekly.
      </li>`;

  const text = `Hey ${firstName},

Welcome to the Glitch Vibe Coder Kit. You signed up as a ${role} — that's the audience this kit is built for.

What happens next:
  • Within 24 hours, I'll personally DM you the GitHub repo link with the
    full .claude/ directory + cross-tool wrappers (Claude Code, Codex,
    OpenClaws). Founding-buyer onboarding is hand-rolled while we're under
    the first 100 captures.
${discordTextLine}
  • Reply to this email if you don't hear from me within 24h, or if you
    have a specific question about your stack.

While you wait, the agents storefront is live at
https://grow.glitchexecutor.com/#agents — six production AI agents you
can deploy on top of the kit, for yourself or to resell to clients.

Thanks for being early.

Tejas
Glitch Executor Labs · Toronto`;

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e7e7ea;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#e7e7ea;">
      ${escapeHtml(firstName)}, welcome to the Glitch Vibe Coder Kit
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#c4c4c8;">
      You signed up as a <strong style="color:#00ff9d;">${escapeHtml(role)}</strong> — that's the audience this kit is built for.
    </p>
    <h3 style="margin:28px 0 8px;font-size:14px;font-weight:600;color:#00ff9d;text-transform:uppercase;letter-spacing:0.05em;">What happens next</h3>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.7;color:#c4c4c8;">
      <li>Within 24 hours I'll personally DM you the GitHub repo link with the full <code style="background:#23232c;padding:2px 6px;border-radius:4px;">.claude/</code> directory + cross-tool wrappers (Claude Code, Codex, OpenClaws). Founding-buyer onboarding is hand-rolled while we're under the first 100 captures.</li>
      ${discordHtmlBlock}
      <li>Reply to this email if you don't hear from me within 24h, or if you have a specific question about your stack.</li>
    </ul>
    ${discordInviteUrl ? `
    <p style="margin:24px 0 0;text-align:center;">
      <a href="${escapeHtml(discordInviteUrl)}" style="display:inline-block;padding:12px 24px;background:#00ff9d;color:#062816;text-decoration:none;font-weight:600;border-radius:6px;">Join the Discord →</a>
    </p>` : ''}
    <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#c4c4c8;">
      While you wait, the agents storefront is live —
      <a href="https://grow.glitchexecutor.com/#agents" style="color:#00ff9d;text-decoration:underline;">six production AI agents</a>
      you can deploy on top of the kit, for yourself or to resell to clients.
    </p>
    <p style="margin:32px 0 0;font-size:15px;line-height:1.6;color:#c4c4c8;">Thanks for being early.</p>
    <p style="margin:8px 0 0;font-size:15px;color:#e7e7ea;"><strong>Tejas</strong><br><span style="color:#8a8a92;font-size:13px;">Glitch Executor Labs · Toronto</span></p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

// ── Google access-token minting via Web Crypto (RS256) ───────────────────

async function mintGoogleAccessToken(
  sa: { client_email: string; private_key: string },
  scopes: string[],
): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = b64url(new TextEncoder().encode(JSON.stringify(header)));
  const claimB64 = b64url(new TextEncoder().encode(JSON.stringify(claim)));
  const unsigned = `${headerB64}.${claimB64}`;

  const cryptoKey = await importPrivateKey(sa.private_key);
  const sigBuf = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );
  const sig = b64url(new Uint8Array(sigBuf));
  const jwt = `${unsigned}.${sig}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) return null;
  const data = await tokenRes.json() as { access_token?: string };
  return data.access_token ?? null;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Strip PEM header/footer + newlines, base64-decode → DER
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ── Helpers ──────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function maskEmail(s: string): string {
  const [user, domain] = s.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

function maskPhone(s: string): string {
  return s.length > 4 ? `***${s.slice(-4)}` : '***';
}

function clean(v: FormDataEntryValue | string | undefined | null, max: number): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isPhone(s: string): boolean {
  const digits = s.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15 && /^[+\d\s()\-]+$/.test(s);
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  if (!r.ok) return false;
  const data = (await r.json()) as { success?: boolean };
  return data.success === true;
}

function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? '';
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
