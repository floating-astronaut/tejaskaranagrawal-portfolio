// Single source of truth for brand metadata, nav links, and pricing-free copy.
// Keep this file dependency-free — imported from both server and client code.

export const site = {
  name: 'Glitch Grow',
  parent: 'Glitch Executor Labs',
  domain: 'grow.glitchexecutor.com',
  url: 'https://grow.glitchexecutor.com',
  contactEmail: 'support@glitchexecutor.com',
  /** Permanent invite to the public Glitch Grow Discord community.
   *  Used by the DiscordCta strip + welcome emails when DISCORD_INVITE_URL
   *  isn't set as a CF Pages env var (server-side override wins). */
  discordInvite: 'https://discord.gg/HBZFKMts',
  tagline: 'The AI Digital Marketing Stack — six AI agents that plug into Claude Code, Codex, OpenClaw, Cursor — any AI coding agent.',
  description:
    'AI digital marketing stack — six production AI agents (ads, sales, social, voice, SEO, UGC creative) that plug into Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor, or any AI coding agent that reads AGENTS.md. Buy once, run on your own infra, white-label and resell to clients at $1.5K–$3K/mo per service line. One-time purchase, BSL 1.1 source-available licence, no subscription. The agency-tier digital marketing stack you used to assemble from five SaaS subscriptions, bought as one bundle.',
  ogImage: '/assets/brand/og-image.png',
  twitter: '@glitchexecutor',
  locale: 'en-US',
} as const;

/**
 * AI coding agents the Stack works with — anything that can read a file
 * (AGENTS.md) and run shell commands. Single source of truth so we don't
 * drift across Hero / FAQ / KitPricing / Welcome email / docs mentions.
 *
 * Order matters for display: lead with Claude Code (most-recognised),
 * then Codex (OpenAI parity), then the wider set. The `inline` form is
 * for prose ('Claude Code, Codex, …, or any AI coding agent'); the
 * `chips` form is for chip-style trust strips.
 */
export const aiClients = {
  list: ['Claude Code', 'Codex', 'OpenClaw', 'Hermes', 'NemoClaw', 'Cursor'] as const,
  chips: 'Claude Code · Codex · OpenClaw · Hermes · NemoClaw · Cursor',
  inline: 'Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor — or any AI coding agent',
  inlineShort: 'Claude Code, Codex, Cursor — or any AI coding agent',
} as const;

/**
 * Top-of-page announcement bar. Toggle `enabled` and rewrite copy when running
 * a launch / promo. Keeps a one-liner non-clickable + an optional pill action.
 *
 * promoCode: when set, copy can reference the code (run scripts/setup-stripe-promo.mjs
 * first to ensure it actually applies in Stripe Checkout).
 */
export const announcementBar = {
  enabled: true,
  message: 'Claim an extra 20% off any agent or the AI Digital Marketing Stack.',
  ctaLabel: 'See agents →',
  ctaHref: '#agents',
  promoCode: 'GLITCH20' as string | null,
} as const;

// ─── Legal entities — global vs India ────────────────────────────────────
//
// Two legal entities sit beneath the Glitch Grow product brand. Each variant
// of the site (`/` global, `/in` India) renders its own entity in footer,
// terms of service, and privacy policy so payment-gateway compliance teams
// (Stripe for the global site, Razorpay for the India site) see what they
// expect to see.
//
// `legalEntity` (default export) = global / Stripe-facing. Kept as the
// default for any code that doesn't need to be geo-aware (legacy callers).
//
// New code reading entities should use `getLegalEntity(geo)` from
// `~/lib/geo` to resolve based on the current pathname.

export const legalEntityGL = {
  name: 'Nuraveda',
  type: 'Sole proprietorship',
  owner: 'Tejas Karan Agrawal',
  address: '77 Huntley St, Toronto, ON M4Y 2P3, Canada',
  phone: '+1 437 539 7958',
  email: 'support@glitchexecutor.com',
  jurisdiction: 'Province of Ontario, Canada',
  arbitrationSeat: 'Toronto, Ontario',
  arbitrationRules: 'ADR Institute of Canada, Inc.',
  dataStorageRegion: 'Iowa, United States',
  paymentProcessor: 'Stripe',
  currency: 'USD',
  taxIdLabel: '',
  taxId: '',
} as const;

// Indian entity — the proprietorship behind the Razorpay merchant account.
// Razorpay's merchant-onboarding team will inspect /in/legal/* to verify
// these details match their KYC records.
export const legalEntityIN = {
  name: 'Bani Thani',
  type: 'Sole proprietorship',
  owner: 'Harshita Goyal',
  address: 'GF-1, Gopal Tower, Shri Ram Colony, Gwalior, Madhya Pradesh – 474002, India',
  phone: '',  // add if available; not required for Razorpay onboarding
  email: 'support@glitchexecutor.com',
  jurisdiction: 'Madhya Pradesh, India',
  arbitrationSeat: 'Gwalior, Madhya Pradesh',
  arbitrationRules: 'Arbitration and Conciliation Act, 1996 (India)',
  dataStorageRegion: 'Mumbai, India (Cloudflare AP/IN region)',
  paymentProcessor: 'Razorpay',
  currency: 'INR',
  taxIdLabel: 'GSTIN',
  taxId: '23AMMPG9088N1ZB',
} as const;

// Backwards-compat alias for any pre-geo callers.
export const legalEntity = legalEntityGL;

export const nav = [
  { href: '/#agents',    label: 'Agents' },
  { href: '/#pricing',   label: 'Pricing' },
  { href: '/compare',    label: 'Compare' },
  { href: '/tools',      label: 'Tools' },
  { href: '/blog',       label: 'Blog' },
  { href: '/#faq',       label: 'FAQ' },
] as const;

export const legalNav = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms',   label: 'Terms' },
] as const;

export type NavItem = (typeof nav)[number];
