// Single source of truth for the flagship Glitch Vibe Kit. Mirrors the data
// pattern in products.ts/bundles.ts but is intentionally separate so the kit
// can evolve independently of the Builder Stack catalog.
//
// The kit is the homepage hero offer; the catalog (products.ts) stays alive
// at /products for deep-link buyers but is unlinked from primary nav.

export interface Kit {
  sku: string;
  slug: string;
  name: string;
  /** Working hook — the line that breaks scroll on cold ads. */
  hook: string;
  tagline: string;
  /** Launch price in USD. After foundingBuyerCap sales, rises to standardPriceUsd. */
  priceUsd: number;
  standardPriceUsd: number;
  /** How many founding-buyer slots are reserved at launch price. */
  foundingBuyerCap: number;
  /**
   * Buy URL — TODO swap with live Stripe Payment Link once user authorizes
   * the new SKU creation. Using `#pricing` for now so the CTA scrolls to
   * the pricing section rather than 404'ing.
   */
  buyUrl: string;
  /** True once a live Stripe Payment Link is wired and we're accepting orders. */
  liveStripe: boolean;
}

export const kit: Kit = {
  sku: 'VCT-001',
  slug: 'kit',
  name: 'Glitch Vibe Kit',
  hook: "I'm a marketing student. I built a React + Postgres app worth $50,000 with Claude Code.",
  tagline: 'The exact Claude Code setup powering 9 production AI products — yours in one folder.',
  priceUsd: 49,
  standardPriceUsd: 97,
  foundingBuyerCap: 100,
  // TODO: replace with live Stripe Payment Link from setup-stripe-products.mjs
  // once user authorizes VCT-001 creation. Until then, CTA scrolls to #pricing.
  buyUrl: '#pricing',
  liveStripe: false,
};
