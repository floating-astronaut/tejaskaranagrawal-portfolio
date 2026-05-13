#!/usr/bin/env node
/**
 * One-time setup: create the `glitch-grow-vibe-kit-leads` Resend audience.
 * Idempotent — re-runs are safe and just print the existing audience ID.
 *
 * Usage:
 *   set -a && . ~/.config/glitch-resend/env && set +a
 *   node scripts/setup-resend-audience.mjs
 *
 * Env required:
 *   RESEND_API_KEY  — same key already wired for the contact form
 *
 * Output: prints `RESEND_AUDIENCE_ID=re_xxx` line; copy into the Cloudflare
 * Pages env (or your local ~/.config/glitch-resend/env) so /api/capture-lead
 * can append captured leads to it.
 */

const AUDIENCE_NAME = 'Glitch Grow — Vibe Kit Leads';
const RESEND_BASE = 'https://api.resend.com';

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('RESEND_API_KEY not set. Source ~/.config/glitch-resend/env or pass it inline.');
  process.exit(1);
}

async function resend(method, path, body) {
  const res = await fetch(`${RESEND_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`Resend ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function findAudience() {
  const list = await resend('GET', '/audiences');
  // Resend list shape: { data: [{ id, name, created_at }, ...] }
  const items = list?.data ?? [];
  return items.find((a) => a.name === AUDIENCE_NAME);
}

async function main() {
  console.log(`Looking for Resend audience "${AUDIENCE_NAME}"…`);
  const existing = await findAudience();
  if (existing) {
    console.log(`✓ Audience exists: ${existing.id}`);
    console.log('');
    console.log(`RESEND_AUDIENCE_ID=${existing.id}`);
    return;
  }

  console.log('Audience not found, creating…');
  const created = await resend('POST', '/audiences', { name: AUDIENCE_NAME });
  console.log(`✓ Audience created: ${created.id}`);
  console.log('');
  console.log(`RESEND_AUDIENCE_ID=${created.id}`);
  console.log('');
  console.log('Add this line to your CF Pages env (Production + Preview)');
  console.log('and to ~/.config/glitch-resend/env so /api/capture-lead can find it.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
