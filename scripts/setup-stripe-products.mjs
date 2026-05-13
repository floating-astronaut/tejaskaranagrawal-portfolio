#!/usr/bin/env node
/**
 * One-time Stripe setup script.
 *
 * Creates a Stripe Product + one-time Price + Payment Link for every SKU in
 * src/lib/products.ts and the bundle in src/lib/bundles.ts. Writes the
 * resulting Payment Link URLs back into those files (replacing the
 * GUMROAD_BASE placeholders).
 *
 * Idempotent-ish: if a Product with the same SKU metadata already exists,
 * we re-use it. Prices are immutable in Stripe, so if pricing changes you
 * deactivate the old Price and the script creates a new one.
 *
 * Run:
 *   set -a && . ~/.config/glitch-stripe/env && set +a
 *   node scripts/setup-stripe-products.mjs
 *
 * Or:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe-products.mjs
 */
import Stripe from 'stripe';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) {
  console.error('STRIPE_SECRET_KEY not set. Source ~/.config/glitch-stripe/env first.');
  process.exit(1);
}

const SUCCESS_URL = 'https://grow.glitchexecutor.com/thanks?session_id={CHECKOUT_SESSION_ID}';

const stripe = new Stripe(SECRET, { apiVersion: '2025-04-30.basil' });

// Catalog mirror — kept inline so the script doesn't have to import the .ts files.
// If you change pricing in src/lib/products.ts or src/lib/bundles.ts, mirror here.
//
// BSK-001 (MCP Builder Pack) was discontinued 2026-05-08; deliberately
// excluded from this catalog so the script doesn't recreate it. Existing
// buyers keep fulfilment via their original session_id; the Stripe Product
// + Payment Link should be archived in the dashboard manually.
const catalog = [
  { sku: 'BSK-002', slug: 'ads-agent',         name: 'AI Ads Agent',           priceUsd: 149, kind: 'product', tagline: 'Autonomous ads agent across Meta, Google, TikTok, Amazon, LinkedIn — Claude Code MCP with Telegram + Discord HITL.' },
  { sku: 'BSK-003', slug: 'sales-agent',       name: 'AI Sales Agent',         priceUsd: 99,  kind: 'product', tagline: 'Autonomous outbound — discover, enrich, draft, Discord-approve, send, learn. Plugs into Claude Code.' },
  { sku: 'BSK-004', slug: 'social-media-agent',name: 'AI Social Media Agent',  priceUsd: 129, kind: 'product', tagline: 'Multi-brand social ops + ORM stack across 10+ platforms. Claude Code MCP.' },
  { sku: 'BSK-005', slug: 'cod-confirm',       name: 'Voice AI Agent',         priceUsd: 149, kind: 'product', tagline: 'Production voice agent (LiveKit + Sarvam). Sub-second latency. 10 Indian languages.' },
  { sku: 'BSK-006', slug: 'seo-agent',         name: 'AI SEO Agent',           priceUsd: 99,  kind: 'product', tagline: 'SEO + AI-search MCP — audits, schema, llms.txt, internal links, Shopify metafields. Plugs into Claude Code.' },
  { sku: 'BSK-007', slug: 'ugc-agent',         name: 'AI UGC Agent',           priceUsd: 149, kind: 'product', tagline: 'Production UGC video ad pipeline — brief → 5–8 hook variants → HeyGen + ElevenLabs + b-roll → Meta/TikTok Ads draft.' },
  { sku: 'BSK-ALL', slug: 'founder-stack',     name: 'AI Digital Marketing Stack', priceUsd: 499, kind: 'bundle',  tagline: 'Six AI agents (ads, sales, social, voice, SEO, UGC) + Discord lifetime + 30-min 1:1 architecture call.' },
];

async function findOrCreateProduct(item) {
  // Search by metadata.sku — the canonical id we control.
  const existing = await stripe.products.search({
    query: `metadata['sku']:'${item.sku}'`,
    limit: 1,
  });
  if (existing.data.length > 0) {
    const found = existing.data[0];
    // Sync name + description + slug-URL if they've drifted from the
    // catalog (e.g. SKU was renamed in src/lib/products.ts but Stripe
    // product still carries the old name). The dashboard receipt /
    // checkout-page header pulls from product.name, so keeping these
    // in sync matters for buyer-facing copy.
    const expectedName = `${item.sku} · ${item.name}`;
    const expectedUrl = `https://grow.glitchexecutor.com/products/${item.slug}`;
    const drift =
      found.name !== expectedName ||
      found.description !== item.tagline ||
      found.url !== expectedUrl ||
      found.metadata?.slug !== item.slug;
    if (drift) {
      const updated = await stripe.products.update(found.id, {
        name: expectedName,
        description: item.tagline,
        url: expectedUrl,
        metadata: {
          ...(found.metadata || {}),
          sku: item.sku,
          slug: item.slug,
          kind: item.kind,
          catalog: 'glitch-builder-stack',
        },
      });
      console.log(`[${item.sku}] product updated: ${updated.id} (synced name/description/slug)`);
      return updated;
    }
    console.log(`[${item.sku}] product exists: ${found.id}`);
    return found;
  }
  const created = await stripe.products.create({
    name: `${item.sku} · ${item.name}`,
    description: item.tagline,
    metadata: {
      sku: item.sku,
      slug: item.slug,
      kind: item.kind,
      catalog: 'glitch-builder-stack',
    },
    url: `https://grow.glitchexecutor.com/products/${item.slug}`,
  });
  console.log(`[${item.sku}] product created: ${created.id}`);
  return created;
}

async function findOrCreatePrice(product, item) {
  const expectedAmount = item.priceUsd * 100;
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find(
    (p) => p.unit_amount === expectedAmount && p.currency === 'usd' && p.type === 'one_time',
  );
  if (match) {
    console.log(`[${item.sku}] price exists: ${match.id} ($${item.priceUsd})`);
    return { price: match, isNew: false };
  }
  // Deactivate previous active prices for this product (stale amounts) so the
  // dashboard doesn't accumulate dead price rows.
  for (const p of prices.data) {
    if (p.type === 'one_time' && p.currency === 'usd') {
      await stripe.prices.update(p.id, { active: false });
      console.log(`[${item.sku}] deactivated stale price ${p.id} ($${(p.unit_amount ?? 0) / 100})`);
    }
  }
  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: expectedAmount,
    currency: 'usd',
    metadata: { sku: item.sku },
  });
  console.log(`[${item.sku}] price created: ${created.id} ($${item.priceUsd})`);
  return { price: created, isNew: true };
}

async function findOrCreatePaymentLink(price, item, priceIsNew) {
  // Search by metadata.sku — we tag every link we create.
  const existing = await stripe.paymentLinks.list({ active: true, limit: 100 });
  const match = existing.data.find((l) => l.metadata?.sku === item.sku);
  if (match && !priceIsNew) {
    console.log(`[${item.sku}] payment link exists: ${match.url}`);
    return match;
  }
  if (match) {
    // Price changed in this run → deactivate the old link and recreate.
    await stripe.paymentLinks.update(match.id, { active: false });
    console.log(`[${item.sku}] deactivated stale payment link ${match.id} (new price)`);
  }
  const created = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    after_completion: {
      type: 'redirect',
      redirect: { url: SUCCESS_URL },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    metadata: {
      sku: item.sku,
      slug: item.slug,
      kind: item.kind,
      catalog: 'glitch-builder-stack',
    },
    payment_intent_data: {
      metadata: {
        sku: item.sku,
        slug: item.slug,
      },
    },
    custom_text: {
      submit: { message: `${item.sku} · Lifetime updates · 14-day refund · BSL 1.1` },
    },
  });
  console.log(`[${item.sku}] payment link created: ${created.url}`);
  return created;
}

async function rewriteSourceFile(filePath, replacements) {
  const original = await readFile(filePath, 'utf8');
  let updated = original;
  for (const [sku, url] of Object.entries(replacements)) {
    // Find the entry block whose `sku: 'BSK-XXX'` matches, then replace the
    // first `buyUrl: "..."` that follows it. Works for both products.ts
    // (multiple entries) and bundles.ts (single entry).
    const skuPattern = new RegExp(
      `(sku:\\s*['"]${sku}['"][\\s\\S]*?buyUrl:\\s*)["'][^"']*["']`,
      'g',
    );
    if (!skuPattern.test(updated)) {
      // Re-test with global flag reset (test() advances lastIndex).
      const fresh = new RegExp(skuPattern.source, 'g');
      if (!fresh.test(updated)) {
        // Truly absent — this SKU lives in a different file. Skip silently.
        continue;
      }
    }
    updated = updated.replace(
      new RegExp(skuPattern.source, 'g'),
      (_match, prefix) => `${prefix}${JSON.stringify(url)}`,
    );
  }
  if (updated !== original) {
    await writeFile(filePath, updated);
    console.log(`  wrote ${filePath}`);
  }
}

async function main() {
  console.log('Setting up Stripe products + payment links for the Glitch Builder Stack…\n');
  const linksBySku = {};
  for (const item of catalog) {
    const product = await findOrCreateProduct(item);
    const { price, isNew: priceIsNew } = await findOrCreatePrice(product, item);
    const link = await findOrCreatePaymentLink(price, item, priceIsNew);
    linksBySku[item.sku] = link.url;
    console.log('');
  }

  console.log('All payment links:');
  for (const [sku, url] of Object.entries(linksBySku)) {
    console.log(`  ${sku}  ${url}`);
  }
  console.log('');

  // Persist the resulting URLs to source files.
  const productsTs = resolve(repoRoot, 'src/lib/products.ts');
  const bundlesTs = resolve(repoRoot, 'src/lib/bundles.ts');
  console.log('Updating source files…');
  await rewriteSourceFile(productsTs, linksBySku);
  await rewriteSourceFile(bundlesTs, linksBySku);

  console.log('\nDone. Verify with: pnpm build && pnpm test');
}

main().catch((err) => {
  console.error('Stripe setup failed:', err);
  process.exit(1);
});
