#!/usr/bin/env node
/**
 * scripts/process-refund.mjs
 *
 * One-command refund processor for Glitch Grow agent purchases.
 * Auto-detects Stripe vs Razorpay from the payment ID prefix, issues the
 * refund, revokes the buyer's access to the private repo + paid Discord
 * channels, and prints a clean summary you can paste into the buyer's
 * confirmation email.
 *
 * USAGE
 *   # Dry run — shows what would happen, no API calls that change state.
 *   node scripts/process-refund.mjs --payment <id>
 *
 *   # Execute — issues the refund + revokes access.
 *   node scripts/process-refund.mjs --payment <id> --yes
 *
 *   # Optional access revocation if the auto-lookup can't find the buyer's
 *   # GitHub username or Discord ID (we'll surface that in the dry-run):
 *   node scripts/process-refund.mjs --payment <id> --github <user> --discord <id> --yes
 *
 * PAYMENT ID FORMATS
 *   pi_*  → Stripe PaymentIntent
 *   ch_*  → Stripe Charge
 *   pay_* → Razorpay Payment
 *
 * REQUIRED ENV (read from /home/support/.config/glitch-{razorpay,stripe,discord}/env)
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET — for Razorpay refunds
 *   STRIPE_SECRET_KEY                    — for Stripe refunds
 *   DISCORD_BOT_TOKEN, COMMUNITY_GUILD_ID — for Discord role removal
 *
 * GITHUB
 *   Uses the `gh` CLI (must be authed). Set GITHUB_PRIVATE_REPO env var
 *   to the org/repo of the private buyer repo, e.g. glitch-exec-labs/agents-private.
 *
 * EXIT CODES
 *   0 success / dry run; 1 user error; 2 API failure during execution.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

// ─── env loading ─────────────────────────────────────────────────────────
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvFile('/home/support/.config/glitch-razorpay/env');
loadEnvFile('/home/support/.config/glitch-stripe/env');
loadEnvFile('/home/support/.config/glitch-discord/env');

// ─── arg parsing ─────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, tok, i, all) => {
    if (tok.startsWith('--')) {
      const key = tok.slice(2);
      const next = all[i + 1];
      acc.push([key, next && !next.startsWith('--') ? next : true]);
    }
    return acc;
  }, [])
);

const PAYMENT_ID = args.payment;
const EXECUTE   = !!args.yes;
const GITHUB_USER  = args.github  || null;
const DISCORD_USER = args.discord || null;
const REPO        = process.env.GITHUB_PRIVATE_REPO || 'glitch-exec-labs/agents-private';
const COMMUNITY_GUILD = process.env.COMMUNITY_GUILD_ID;

if (!PAYMENT_ID) {
  console.error('usage: node scripts/process-refund.mjs --payment <id> [--yes] [--github <user>] [--discord <id>]');
  process.exit(1);
}

// ─── role IDs we want to strip from the buyer ────────────────────────────
const PAID_ROLE_NAMES = ['Agent Buyer', 'Founder Stack Buyer'];

// ─── small helpers ───────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const log  = (...a) => console.log(...a);
const dim  = (s) => `\x1b[90m${s}\x1b[0m`;
const grn  = (s) => `\x1b[32m${s}\x1b[0m`;
const red  = (s) => `\x1b[31m${s}\x1b[0m`;
const ylw  = (s) => `\x1b[33m${s}\x1b[0m`;

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: r.ok, status: r.status, body };
}

// ─── provider routers ────────────────────────────────────────────────────
function detectProvider(id) {
  if (id.startsWith('pi_') || id.startsWith('ch_') || id.startsWith('cs_')) return 'stripe';
  if (id.startsWith('pay_')) return 'razorpay';
  return null;
}

// ─── Stripe lookup + refund ──────────────────────────────────────────────
async function stripeLookup(id) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  const auth = `Basic ${Buffer.from(key + ':').toString('base64')}`;
  // Resolve to a charge regardless of whether we got pi_, ch_, or cs_.
  let chargeId, paymentIntentId, amount, currency, email, metadata;
  if (id.startsWith('cs_')) {
    const { ok, body } = await fetchJson(`https://api.stripe.com/v1/checkout/sessions/${id}?expand[]=payment_intent`,
      { headers: { Authorization: auth } });
    if (!ok) throw new Error(`stripe: checkout/sessions GET ${body?.error?.message}`);
    paymentIntentId = body.payment_intent?.id || body.payment_intent;
    email = body.customer_details?.email;
    metadata = body.metadata;
  }
  if (id.startsWith('pi_') || paymentIntentId) {
    const piId = paymentIntentId || id;
    const { ok, body } = await fetchJson(`https://api.stripe.com/v1/payment_intents/${piId}?expand[]=latest_charge`,
      { headers: { Authorization: auth } });
    if (!ok) throw new Error(`stripe: payment_intents GET ${body?.error?.message}`);
    chargeId = body.latest_charge?.id || body.latest_charge;
    amount = body.amount;
    currency = body.currency;
    email = email || body.receipt_email;
    metadata = metadata || body.metadata;
  }
  if (id.startsWith('ch_')) {
    const { ok, body } = await fetchJson(`https://api.stripe.com/v1/charges/${id}`, { headers: { Authorization: auth } });
    if (!ok) throw new Error(`stripe: charges GET ${body?.error?.message}`);
    chargeId = body.id;
    amount = body.amount;
    currency = body.currency;
    email = email || body.receipt_email || body.billing_details?.email;
    metadata = metadata || body.metadata;
  }
  return { provider: 'stripe', id: chargeId, amount, currency, email, metadata, raw: { paymentIntentId, chargeId } };
}

async function stripeRefund(chargeId) {
  const key = process.env.STRIPE_SECRET_KEY;
  const auth = `Basic ${Buffer.from(key + ':').toString('base64')}`;
  const { ok, body } = await fetchJson('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ charge: chargeId, reason: 'requested_by_customer' }),
  });
  if (!ok) throw new Error(`stripe refund failed: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

// ─── Razorpay lookup + refund ────────────────────────────────────────────
async function razorpayLookup(id) {
  const k = process.env.RAZORPAY_KEY_ID, s = process.env.RAZORPAY_KEY_SECRET;
  if (!k || !s) throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set');
  const auth = `Basic ${Buffer.from(`${k}:${s}`).toString('base64')}`;
  const { ok, body } = await fetchJson(`https://api.razorpay.com/v1/payments/${id}`, { headers: { Authorization: auth } });
  if (!ok) throw new Error(`razorpay: GET payments/${id} → ${body?.error?.description || JSON.stringify(body).slice(0,200)}`);
  return {
    provider: 'razorpay',
    id: body.id,
    amount: body.amount,
    currency: body.currency,
    email: body.email,
    metadata: body.notes || {},
    capturedAt: body.captured_at,
    raw: body,
  };
}

async function razorpayRefund(paymentId) {
  const k = process.env.RAZORPAY_KEY_ID, s = process.env.RAZORPAY_KEY_SECRET;
  const auth = `Basic ${Buffer.from(`${k}:${s}`).toString('base64')}`;
  const { ok, body } = await fetchJson(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed: 'normal' }), // 5-7 working days, free; "optimum" costs extra
  });
  if (!ok) throw new Error(`razorpay refund failed: ${body?.error?.description || JSON.stringify(body).slice(0,300)}`);
  return body;
}

// ─── access revocation ───────────────────────────────────────────────────
function revokeGithub(user) {
  if (!user) return { skipped: 'no github username supplied' };
  try {
    execSync(`gh api -X DELETE /repos/${REPO}/collaborators/${user}`, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.stderr || e.message).slice(0, 300) };
  }
}

async function revokeDiscord(userId) {
  if (!userId) return { skipped: 'no discord user id supplied' };
  if (!process.env.DISCORD_BOT_TOKEN || !COMMUNITY_GUILD) {
    return { skipped: 'DISCORD_BOT_TOKEN or COMMUNITY_GUILD_ID missing' };
  }
  const headers = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' };
  // Fetch role IDs for the named paid roles
  const { ok: ro, body: roles } = await fetchJson(
    `https://discord.com/api/v10/guilds/${COMMUNITY_GUILD}/roles`, { headers });
  if (!ro) return { ok: false, error: `roles list: ${JSON.stringify(roles).slice(0,200)}` };
  const targets = roles.filter((r) => PAID_ROLE_NAMES.includes(r.name));
  const results = [];
  for (const role of targets) {
    const r = await fetch(
      `https://discord.com/api/v10/guilds/${COMMUNITY_GUILD}/members/${userId}/roles/${role.id}`,
      { method: 'DELETE', headers });
    results.push({ role: role.name, status: r.status });
  }
  return { ok: true, results };
}

// ─── refund window guard ─────────────────────────────────────────────────
const SKU_WINDOWS = {
  'BSK-001': 14, 'BSK-002': 14, 'BSK-003': 14,
  'BSK-004': 14, 'BSK-005': 14, 'BSK-006': 14,
  'BSK-ALL': 7,
};
function checkWindow(meta, providerCapturedAtUnix) {
  const sku = meta?.sku || meta?.SKU;
  const days = SKU_WINDOWS[sku] || 14;
  if (!providerCapturedAtUnix) return { ok: true, days, sku, note: 'no capture timestamp; window check skipped' };
  const ageDays = (Date.now() / 1000 - providerCapturedAtUnix) / 86400;
  return { ok: ageDays <= days, days, sku, ageDays: ageDays.toFixed(2) };
}

// ─── main ────────────────────────────────────────────────────────────────
const provider = detectProvider(PAYMENT_ID);
if (!provider) {
  console.error(red('!'), `unrecognised payment ID prefix: ${PAYMENT_ID}`);
  process.exit(1);
}

log(dim(`provider: ${provider}`));
let lookup;
try {
  lookup = await (provider === 'stripe' ? stripeLookup(PAYMENT_ID) : razorpayLookup(PAYMENT_ID));
} catch (e) {
  console.error(red('✗'), e.message);
  process.exit(1);
}
const capturedAt = provider === 'razorpay' ? lookup.capturedAt : null;
const window = checkWindow(lookup.metadata, capturedAt);
const amountHuman = provider === 'razorpay' ? fmt(lookup.amount / 100)
                                            : `${(lookup.amount / 100).toFixed(2)} ${lookup.currency?.toUpperCase()}`;

log('');
log(`payment id      ${lookup.id}`);
log(`buyer email     ${lookup.email || dim('(not on record)')}`);
log(`amount          ${amountHuman}`);
log(`sku             ${window.sku || dim('(not in metadata)')}`);
log(`refund window   ${window.days}d  ${window.note ? dim(window.note) : window.ageDays != null ? `(age: ${window.ageDays}d)` : ''}`);
log('');

if (!window.ok) {
  log(red('✗ outside refund window — refusing to issue.'));
  log(dim('  override would require a manual refund via the dashboard.'));
  process.exit(EXECUTE ? 2 : 0);
}

if (!EXECUTE) {
  log(ylw('— DRY RUN —'));
  log(`would issue ${provider} refund for ${amountHuman}`);
  log(`would revoke github access (repo=${REPO}, user=${GITHUB_USER || dim('(none supplied)')})`);
  log(`would remove paid Discord roles (user=${DISCORD_USER || dim('(none supplied)')})`);
  log('');
  log('to execute, re-run with --yes');
  process.exit(0);
}

// ─── execute ─────────────────────────────────────────────────────────────
log(grn('→') + ' issuing refund …');
const refund = provider === 'stripe'
  ? await stripeRefund(lookup.id).catch((e) => ({ error: e.message }))
  : await razorpayRefund(lookup.id).catch((e) => ({ error: e.message }));
if (refund.error) {
  log(red('✗'), 'refund failed:', refund.error);
  process.exit(2);
}
log(grn('  ✓'), 'refund id', refund.id || refund.refund_id || dim('(provider returned no id)'));

log(grn('→') + ' revoking github access …');
const gh = revokeGithub(GITHUB_USER);
if (gh.skipped) log(ylw('  ⚠'), gh.skipped);
else if (gh.ok) log(grn('  ✓'), `removed ${GITHUB_USER} from ${REPO}`);
else log(red('  ✗'), 'github:', gh.error);

log(grn('→') + ' removing Discord paid roles …');
const dc = await revokeDiscord(DISCORD_USER);
if (dc.skipped) log(ylw('  ⚠'), dc.skipped);
else if (dc.ok) log(grn('  ✓'), 'role removals:', dc.results.map((r) => `${r.role}=${r.status}`).join(' '));
else log(red('  ✗'), 'discord:', dc.error);

log('');
log(grn('done.') + ' next steps:');
log(`  1. send confirmation email to ${lookup.email || '<buyer>'}`);
log(`  2. log this refund in your tracking sheet (Refunds tab) for the rate KPI`);
log(`     fields: ${PAYMENT_ID}, ${window.sku}, ${amountHuman}, ${new Date().toISOString().slice(0,10)}`);
