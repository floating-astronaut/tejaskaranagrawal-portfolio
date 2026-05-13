#!/usr/bin/env node
/**
 * One-time setup: create a percentage-off promotion code in Stripe.
 * Idempotent — re-running with the same PROMO_CODE skips creation.
 *
 * Usage:
 *   set -a && . ~/.config/glitch-stripe/env && set +a
 *   PROMO_CODE=GLITCH20 PROMO_PERCENT=20 node scripts/setup-stripe-promo.mjs
 *
 * Defaults:
 *   PROMO_CODE     LAUNCH25
 *   PROMO_PERCENT  25
 *   COUPON_ID      glitch-promo-<lowercase code>
 */
import Stripe from 'stripe';

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) {
  console.error('STRIPE_SECRET_KEY not set.');
  process.exit(1);
}
const stripe = new Stripe(SECRET, { apiVersion: '2025-04-30.basil' });

const CODE = (process.env.PROMO_CODE || 'LAUNCH25').toUpperCase();
const PERCENT = Number(process.env.PROMO_PERCENT || 25);
const COUPON_ID = process.env.COUPON_ID || `glitch-promo-${CODE.toLowerCase()}`;
if (!Number.isFinite(PERCENT) || PERCENT <= 0 || PERCENT >= 100) {
  console.error(`PROMO_PERCENT must be a positive number < 100, got: ${process.env.PROMO_PERCENT}`);
  process.exit(1);
}

async function ensureCoupon() {
  try {
    const existing = await stripe.coupons.retrieve(COUPON_ID);
    console.log(`coupon exists: ${existing.id} (-${existing.percent_off}%)`);
    return existing;
  } catch (e) {
    if (e.statusCode !== 404) throw e;
  }
  const created = await stripe.coupons.create({
    id: COUPON_ID,
    percent_off: PERCENT,
    duration: 'once',
    name: `Glitch — ${PERCENT}% off (${CODE})`,
    metadata: { source: 'glitch-grow', purpose: 'launch-promo' },
  });
  console.log(`coupon created: ${created.id} (-${PERCENT}%)`);
  return created;
}

async function ensurePromoCode(coupon) {
  const list = await stripe.promotionCodes.list({ code: CODE, limit: 1 });
  if (list.data.length > 0) {
    const p = list.data[0];
    const couponId = typeof p.coupon === 'string' ? p.coupon : p.coupon.id;
    console.log(`promo code exists: ${p.code} → ${couponId} (active=${p.active})`);
    return p;
  }
  const created = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: CODE,
    metadata: { source: 'glitch-grow' },
  });
  console.log(`promo code created: ${created.code}`);
  return created;
}

async function main() {
  const coupon = await ensureCoupon();
  await ensurePromoCode(coupon);
  console.log(`\nUse "${CODE}" at any /buy.stripe.com/* checkout to apply ${PERCENT}% off.`);
  console.log(`(Each Payment Link must have "Allow promotion codes" enabled — see Dashboard.)`);
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
