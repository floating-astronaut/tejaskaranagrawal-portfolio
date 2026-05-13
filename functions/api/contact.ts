/**
 * Cloudflare Pages Function — POST /api/contact
 *
 * Responsibilities:
 *   1. Verify Turnstile token server-side (required — server trusts nothing from the client).
 *   2. Validate + sanitize form fields.
 *   3. Drop honeypot submissions silently.
 *   4. Deliver the message to any configured sink (Resend email, Slack, generic
 *      webhook). Multiple sinks can be active at once; each fires in parallel.
 *
 * Env (wire in Cloudflare Pages dashboard):
 *   TURNSTILE_SECRET      — Turnstile secret key (required in prod).
 *   RESEND_API_KEY        — Resend API key. When set, sends the message to RESEND_TO.
 *   RESEND_FROM           — optional override; default uses the per-site BRAND
 *                           from _email.ts, i.e. '<Brand> <support@glitchexecutor.com>'.
 *                           Must be an address on a domain verified in your Resend account.
 *   RESEND_TO             — optional override; default = BRAND.supportEmail.
 *   RESEND_AUTOREPLY      — when set to "true", also sends the submitter a
 *                           branded thank-you email. Off by default.
 *   SLACK_WEBHOOK_URL     — optional; POSTs a formatted Block Kit message.
 *   CONTACT_FORWARD_URL   — optional; POSTs raw JSON to any endpoint.
 *   META_CAPI_TOKEN       — Meta Conversions API token (encrypted).
 *   META_PIXEL_ID         — per-site pixel ID for the CAPI call (server-only).
 *   META_TEST_EVENT_CODE  — optional; include to route events to
 *                           Events Manager → Test Events (staging).
 *
 * No third-party SDKs — just `fetch` — so the worker stays under the Cloudflare
 * free-tier CPU budget on a cold start.
 */

import {
  BRAND,
  renderNotification,
  renderAutoReply,
  type ContactPayload,
  type RequestContext,
  type RenderedEmail,
} from '../_email';

export interface Env {
  TURNSTILE_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  RESEND_TO?: string;
  RESEND_AUTOREPLY?: string;
  SLACK_WEBHOOK_URL?: string;
  CONTACT_FORWARD_URL?: string;
  META_CAPI_TOKEN?: string;
  META_PIXEL_ID?: string;
  META_TEST_EVENT_CODE?: string;
}

interface FormFields extends ContactPayload {
  token: string;
}

const MAX_LEN = { name: 200, email: 200, company: 200, message: 4000 } as const;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const eventId = crypto.randomUUID();
  const contentType = request.headers.get('content-type') ?? '';
  let form: FormData;
  try {
    form = contentType.includes('application/json')
      ? jsonToForm(await request.json())
      : await request.formData();
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400);
  }

  // Honeypot: drop silently.
  if (form.get('company_url')) {
    return json({ ok: true }, 200);
  }

  const payload: FormFields = {
    name:    clean(form.get('name'),    MAX_LEN.name),
    email:   clean(form.get('email'),   MAX_LEN.email),
    company: clean(form.get('company'), MAX_LEN.company),
    message: clean(form.get('message'), MAX_LEN.message),
    token:   clean(form.get('cf-turnstile-response'), 4096),
  };

  if (!payload.name || !payload.email || !payload.message) {
    return json({ ok: false, error: 'missing-fields' }, 400);
  }
  if (!isEmail(payload.email)) {
    return json({ ok: false, error: 'bad-email' }, 400);
  }

  // Verify Turnstile — skipped only when TURNSTILE_SECRET is absent (dev).
  if (env.TURNSTILE_SECRET) {
    const ok = await verifyTurnstile(payload.token, env.TURNSTILE_SECRET, clientIp(request));
    if (!ok) return json({ ok: false, error: 'turnstile-failed' }, 403);
  }

  await forward(payload, env, request, eventId);
  return json({ ok: true, event_id: eventId });
};

function jsonToForm(obj: unknown): FormData {
  const fd = new FormData();
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      fd.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }
  return fd;
}

function clean(v: FormDataEntryValue | null, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body,
  });
  if (!r.ok) return false;
  const data = (await r.json()) as { success: boolean };
  return data.success === true;
}

async function forward(p: FormFields, env: Env, req: Request, eventId: string): Promise<void> {
  const ref = req.headers.get('referer') ?? '';
  const ua  = req.headers.get('user-agent') ?? '';
  const ip  = clientIp(req);
  const ts  = new Date().toISOString();

  // Derive a site label for subject lines: prefer the hostname from the
  // Referer header, fall back to the request's Host header, fall back to
  // the BRAND's configured siteUrl host.
  let site = BRAND.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  try {
    if (ref) site = new URL(ref).hostname;
    else site = (req.headers.get('host') || '').replace(/^www\./, '') || site;
  } catch { /* ignore bad referer */ }

  const ctx: RequestContext = { ip, ua, ref, ts, site };
  const contactData: ContactPayload = {
    name:    p.name,
    email:   p.email,
    company: p.company,
    message: p.message,
  };

  const tasks: Promise<unknown>[] = [];

  // ── Resend: branded admin notification + optional auto-reply ───────────
  if (env.RESEND_API_KEY) {
    const defaultFrom = `${BRAND.name} <${BRAND.supportEmail}>`;
    const from = env.RESEND_FROM || defaultFrom;
    const to   = env.RESEND_TO   || BRAND.supportEmail;

    const notification = renderNotification(contactData, ctx);
    tasks.push(sendEmail(env.RESEND_API_KEY, {
      from,
      to: [to],
      reply_to: p.email,
      ...notification,
    }));

    if (env.RESEND_AUTOREPLY === 'true') {
      const auto = renderAutoReply(contactData);
      tasks.push(sendEmail(env.RESEND_API_KEY, {
        from,
        to: [p.email],
        reply_to: BRAND.supportEmail,
        ...auto,
      }));
    }
  }

  // ── Slack webhook (optional) ───────────────────────────────────────────
  if (env.SLACK_WEBHOOK_URL) {
    tasks.push(fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `:cobra: New contact on ${site}: *${p.name}* (${p.email})`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: `New contact on ${site}` } },
          { type: 'section', fields: [
            { type: 'mrkdwn', text: `*Name*\n${p.name}` },
            { type: 'mrkdwn', text: `*Email*\n${p.email}` },
            { type: 'mrkdwn', text: `*Company*\n${p.company || '—'}` },
            { type: 'mrkdwn', text: `*IP*\n${ip || '—'}` },
          ]},
          { type: 'section', text: { type: 'mrkdwn', text: `*Message*\n${p.message}` } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `ref: ${ref} · ua: ${ua}` }] },
        ],
      }),
    }));
  }

  // ── Generic JSON forward (optional) ────────────────────────────────────
  if (env.CONTACT_FORWARD_URL) {
    tasks.push(fetch(env.CONTACT_FORWARD_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...p, token: undefined, site, ref, ua, ip, ts }),
    }));
  }


  // ── Meta Conversions API (server-side Lead event) ──────────────────────
  if (env.META_CAPI_TOKEN && env.META_PIXEL_ID) {
    const emHash = p.email ? await sha256Hex(p.email.toLowerCase().trim()) : undefined;
    const userData: Record<string, unknown> = {};
    if (emHash) userData.em = [emHash];
    if (ip)     userData.client_ip_address = ip;
    if (ua)     userData.client_user_agent = ua;
    const capiBody: Record<string, unknown> = {
      data: [{
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: ref || `https://${site}/`,
        event_id: eventId,
        user_data: userData,
        custom_data: {
          content_name: 'contact',
          content_category: site,
          form_location: ref || '/',
        },
      }],
      access_token: env.META_CAPI_TOKEN,
    };
    if (env.META_TEST_EVENT_CODE) capiBody.test_event_code = env.META_TEST_EVENT_CODE;

    tasks.push(fetch(
      `https://graph.facebook.com/v19.0/${env.META_PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(capiBody),
      },
    ));
  }

  await Promise.allSettled(tasks);
}

function sendEmail(apiKey: string, payload: {
  from: string;
  to: string[];
  reply_to?: string;
} & RenderedEmail): Promise<Response> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  });
}

function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? '';
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
