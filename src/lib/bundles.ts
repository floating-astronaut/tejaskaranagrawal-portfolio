// Bundle SKUs — collections of multiple products at a discount.
// Currently one bundle: Founder Stack — every shipping AI agent + Discord lifetime + 1:1 call.

import { products } from './products';
import type { Geo } from './geo';

export interface Bundle {
  sku: string;
  slug: string;
  name: string;
  tagline: string;
  subline: string;
  /** Slugs of products included. */
  includes: string[];
  /** Bonus inclusions beyond the products themselves. */
  bonuses: string[];
  /** Bundle price in USD — global / Stripe variant. */
  priceUsd: number;
  /** Bundle price in INR — India / Razorpay variant.
   *  PPP-adjusted, NOT a direct FX conversion of priceUsd. */
  priceInr: number;
  /** Buy URL — Stripe Payment Link.
   *  Recreate via scripts/setup-stripe-products.mjs. */
  buyUrl: string;
  /** Buy URL — Razorpay Payment Link (India rail).
   *  Recreate via scripts/setup-razorpay-products.mjs. Empty until provisioned. */
  buyUrlInr: string;
}

// Buy URLs are live Stripe Payment Links — managed by
// scripts/setup-stripe-products.mjs.

export const bundles: Bundle[] = [
  {
    sku: 'BSK-ALL',
    // Slug stays 'founder-stack' to preserve SEO equity on the existing
    // /products/founder-stack URL, even though the bundle is now branded
    // 'AI Digital Marketing Stack'. The bundle.name is what's displayed
    // everywhere; the slug only governs the URL.
    slug: 'founder-stack',
    name: 'AI Digital Marketing Stack',
    tagline: 'Every shipping AI agent + Discord lifetime + 30-min 1:1 architecture call.',
    subline:
      'Six production AI agents that plug into Claude Code as MCPs — ads, sales, social, voice, SEO, and UGC creative. The full digital-marketing stack you used to assemble from five different SaaS subscriptions, bought once. Plus a 30-min 1:1 with the founder, lifetime Discord access, and every new SKU we ship in the next 12 months free.',
    includes: [
      'ads-agent',
      'sales-agent',
      'social-media-agent',
      'cod-confirm',
      'seo-agent',
      'ugc-agent',
    ],
    bonuses: [
      '30-min 1:1 architecture call with the founder (otherwise $197)',
      'Discord lifetime access (otherwise $19/mo recurring)',
      'All future SKU additions free for 12 months (one new SKU per quarter)',
      'Founding-buyer badge in the catalog Discord',
    ],
    priceUsd: 499,
    priceInr: 9999,
    buyUrl: "https://buy.stripe.com/3cIdRa6IU3mE9HB26bgjC0h",
    buyUrlInr: "",  // TODO: fill via setup-razorpay-products.mjs
  },
];

/** À la carte total of all products in the bundle, used to display savings.
 *  Geo-aware — totals priceUsd or priceInr depending on which variant of the
 *  site is rendering the bundle card. */
export function bundleAlaCarteTotal(bundle: Bundle, geo: Geo = 'GL'): number {
  return bundle.includes.reduce((total, slug) => {
    const product = products.find((p) => p.slug === slug);
    if (!product) return total;
    return total + (geo === 'IN' ? product.priceInr : product.priceUsd);
  }, 0);
}

/** Discount percentage for the bundle vs à la carte (geo-aware). */
export function bundleDiscountPct(bundle: Bundle, geo: Geo = 'GL'): number {
  const total = bundleAlaCarteTotal(bundle, geo);
  const price = geo === 'IN' ? bundle.priceInr : bundle.priceUsd;
  if (total === 0) return 0;
  return Math.round(((total - price) / total) * 100);
}

export function getBundle(slug: string): Bundle | undefined {
  return bundles.find((b) => b.slug === slug);
}
