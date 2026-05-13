/**
 * Server-side SKU → INR-price + name resolution for Razorpay Standard
 * Checkout. Lives under /functions so it's bundled with the Pages
 * Function. Mirrors src/lib/products.ts + src/lib/bundles.ts but
 * intentionally inline-duplicated because Pages Functions can't import
 * from src/* — the worker bundle is a separate compilation unit.
 *
 * KEEP THIS IN SYNC with src/lib/products.ts and src/lib/bundles.ts
 * whenever a SKU is added, removed, or repriced. The single source of
 * truth on the front-end side stays src/lib/{products,bundles}.ts —
 * this file only exists to give the Razorpay create-order endpoint
 * authoritative price data without trusting amounts posted from the
 * browser (which would be a security hole — buyers could change a
 * price in DevTools before clicking Buy).
 */

export interface CatalogItem {
  sku: string;
  name: string;
  /** Price in INR rupees (whole rupees, NOT paise). Multiply ×100 at
   *  Razorpay-API call time. */
  priceInr: number;
  /** Public-facing description shown in the Razorpay modal. */
  description: string;
}

export const RAZORPAY_CATALOG: Record<string, CatalogItem> = {
  // BSK-001 (MCP Builder Pack) was discontinued 2026-05-08 — left out
  // of this catalog so create-order can't price a brand-new BSK-001
  // order. Existing buyers' refunds + access never run through this
  // path; they're handled via /api/grow/refund-buyer on the Flask side.

  // Individual agents
  'BSK-002': {
    sku: 'BSK-002',
    name: 'AI Ads Agent',
    priceInr: 3999,
    description: 'Autonomous ads agent across Meta, Google, TikTok, Amazon, LinkedIn — Claude Code MCP with Telegram + Discord HITL.',
  },
  'BSK-003': {
    sku: 'BSK-003',
    name: 'AI Sales Agent',
    priceInr: 2499,
    description: 'Autonomous outbound — discover, enrich, draft, Discord-approve, send, learn. Plugs into Claude Code.',
  },
  'BSK-004': {
    sku: 'BSK-004',
    name: 'AI Social Media Agent',
    priceInr: 2999,
    description: 'Multi-brand social ops + ORM stack across 10+ platforms. Claude Code MCP.',
  },
  'BSK-005': {
    sku: 'BSK-005',
    name: 'Voice AI Agent',
    priceInr: 3999,
    description: 'Production voice agent (LiveKit + Sarvam). Sub-second latency. 10 Indian languages.',
  },
  'BSK-006': {
    sku: 'BSK-006',
    name: 'AI SEO Agent',
    priceInr: 2499,
    description: 'SEO + AI-search MCP — audits, schema, llms.txt, internal links, Shopify metafields. Plugs into Claude Code.',
  },
  'BSK-007': {
    sku: 'BSK-007',
    name: 'AI UGC Agent',
    priceInr: 3999,
    description: 'Production UGC video ad pipeline — brief → 5–8 hook variants → HeyGen + ElevenLabs + b-roll → Meta/TikTok Ads draft.',
  },
  // Bundle
  'BSK-ALL': {
    sku: 'BSK-ALL',
    name: 'AI Digital Marketing Stack',
    priceInr: 9999,
    description: 'Six AI agents (ads, sales, social, voice, SEO, UGC) + 1:1 architecture call + Discord lifetime + future SKU additions free for 12 months.',
  },
};
