// Single source of truth for the Glitch Builder Stack catalog.
// Used by: homepage Products section, /products index, individual /products/[slug] pages,
// and footer. Update copy here, not in components.
//
// Each entry is a source-available boilerplate. Buyers receive the repo, deploy
// configs, playbook, and Discord access — they self-host and self-operate.

// Mirror of the IconName union in src/components/Icon.astro. Kept inline
// because Astro components don't export TS types. If you add a new icon,
// update both files.
type IconName =
  | 'target'
  | 'shopping-cart'
  | 'phone'
  | 'link'
  | 'bolt'
  | 'shopify'
  | 'meta'
  | 'amazon'
  | 'cpu'
  | 'database'
  | 'shield'
  | 'chart'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'check'
  | 'spark'
  | 'cobra'
  | 'code'
  | 'layers'
  | 'send'
  | 'sun';

export interface Product {
  /** SKU identifier (BSK-001 etc.) shown in catalog metadata. */
  sku: string;
  /** URL slug under /products/. */
  slug: string;
  /** Marketing name shown in nav and cards. */
  name: string;
  /** One-line tagline for cards (legacy, used on detail page). */
  tagline: string;
  /** Short product-line label rendered under the name on cards.
   *  Example: "Production MCP server starter kit". Replaces the
   *  vague tagline as the dominant card subtitle. */
  productLine: string;
  /** ≤80-char outcome sentence shown under the title on the scannable
   *  default card surface. The full deliverables list lives behind
   *  the "What's inside" drawer. */
  oneLiner: string;
  /** 3 short chips (≤18 chars each) for the visual capability strip.
   *  These replace at-a-glance prose with scan-friendly tags. */
  chips: [string, string, string];
  /** Quick-fact metric row shown above the CTA. Each value ≤14 chars. */
  metrics: { deploy: string; sell: string };
  /** Longer hero subline used on the product detail page. */
  subline: string;
  /** Card icon — must exist in Icon.astro. */
  icon: IconName;
  /** What the buyer literally receives — 3 concrete bullets, no marketing
   *  fluff. Used as the dominant card body. Each item should name files,
   *  repos, configs, or playbook docs the buyer can point at. */
  whatYouGet: string[];
  /** "Best for: ..." one-line buyer-fit framing. */
  bestFor: string;
  /** "Sell as: ..." one-line revenue angle in USD context. */
  sellAs: string;
  /** "Sell as: ..." rendered on /in/ — Indian-rupee revenue framing. */
  sellAsInr: string;
  /** "Needs: ..." one-line operational requirement list. */
  requirements: string;
  /** Tagline rendered next to the price ("one-time license · ..."). */
  priceLine: string;
  /** 4–6 builder-focused capability bullets shown on detail page. */
  capabilities: string[];
  /** Public GitHub repo URL — the showcase repo prospects can browse before buying. */
  publicRepo: string;
  /** Private GitHub repo (full source + ops/). Buyers get collaborator access on purchase. */
  privateRepo: string;
  /** Status badge shown on cards. */
  status: 'shipped' | 'in-pilot' | 'coming-soon';
  /** YouTube video id of the agent-in-action demo. Surfaced on the
   *  product detail page above the spec, in the welcome email after
   *  purchase, and on the future buyer-portal page. Optional — until
   *  a demo exists for a SKU, the detail page just skips the video
   *  block. */
  demoVideoId?: string;
  /** One-line subtitle shown beneath the video (≤80 chars). */
  demoVideoTitle?: string;
  /** Price in USD (one-time, perpetual license) — global / Stripe variant. */
  priceUsd: number;
  /** Price in INR — India / Razorpay variant. PPP-adjusted, NOT a direct
   *  FX conversion of priceUsd. The India digital-product market expects
   *  ₹999 / ₹2,499 / ₹3,999 / ₹9,999 type bands; this column reflects that. */
  priceInr: number;
  /** Buy URL for the global rail — Stripe Payment Link.
   *  Recreate via scripts/setup-stripe-products.mjs. */
  buyUrl: string;
  /** Buy URL for the India rail — Razorpay Payment Link.
   *  Recreate via scripts/setup-razorpay-products.mjs (Day-7 work).
   *  Empty string = INR rail not yet provisioned for this SKU. */
  buyUrlInr: string;
  /** What the buyer can build/sell with this kit — global / USD framing. */
  derivativeUseCases: string[];
  /** What the buyer can build/sell — India / INR framing.
   *  Indian agency/freelancer pricing is materially lower than US in
   *  absolute INR terms; numbers here reflect the actual Indian D2C
   *  managed-service market, not a direct INR conversion of derivativeUseCases. */
  derivativeUseCasesInr: string[];
}

// Buy URLs below are live Stripe Payment Links. To recreate or update them
// (e.g. after a price change), run scripts/setup-stripe-products.mjs after
// sourcing ~/.config/glitch-stripe/env.

// BSK-001 (MCP Builder Pack) was discontinued 2026-05-08. Reasoning:
// it sold to people who want to BUILD agent infrastructure; the rest of
// the lineup sells to people who want agents that DO ops work. Different
// audience, different price ceiling, narrowed the brand. Existing buyers
// keep Codeberg access to glitch-grow-mcp-builder-pack indefinitely.
// /products/mcp-builder-pack 301-redirects via the page itself.

export const products: Product[] = [
  {
    sku: 'BSK-002',
    slug: 'ads-agent',
    name: 'AI Ads Agent',
    productLine: 'Autonomous ads-ops agent',
    oneLiner: 'Run paid ads across Meta, Google and TikTok from one approval-gated agent.',
    chips: ['Meta + Google + TikTok', 'Multi-brand', 'Telegram approvals'],
    metrics: { deploy: '~ 2 hours', sell: '$1.5K/mo retainer' },
    tagline: 'The autonomous ads agent running 7 stores. Now your starting point.',
    subline:
      'Full LangGraph orchestrator (plan → analyze → execute → reflect) wired into 5 production MCPs. Telegram + Discord HITL with first-click-wins reconciliation. 12 ad-ops recipes. Memory store learns from operator decisions. Multi-brand config with per-brand autonomy thresholds.',
    icon: 'target',
    whatYouGet: [
      'Full LangGraph orchestrator repo — plan → analyze → execute → reflect, swappable nodes',
      'Five ad-platform MCPs (Meta, Google, TikTok, Amazon Attribution, LinkedIn) + 12 ad-ops recipes',
      'Telegram + Discord HITL approval reconciler + multi-brand config schema',
    ],
    bestFor: 'Agencies and freelancers running paid-ads management for D2C, eCom, and B2B brands.',
    sellAs: '$1,497/mo per brand managed ads service. Two clients = price recouped 10×.',
    sellAsInr: '₹25,000/mo per Indian brand. Two clients = price recouped 12×.',
    requirements: 'Your AI coding agent (Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor — any of them) handles the install. You bring keys: Meta long-lived token, Google Ads developer token, optional TikTok, a Discord webhook for approvals.',
    priceLine: 'One-time license · run unlimited brands on your infra.',
    capabilities: [
      'LangGraph state graph — pluggable node architecture, bring your own platform MCP',
      'Five ad-platform integrations: Meta, Google, TikTok, Amazon Attribution, LinkedIn',
      'Telegram + Discord HITL — first-click-wins reconciler, same DB row whether approved on either',
      'Twelve ad-ops recipes: creative fatigue swap, audience refresh, budget scale, dayparting',
      'True blended ROAS via PostHog ground truth — not Meta\'s over-reported number',
      'Memory in Postgres + Alembic — every decision with rationale + alternatives + predicted outcome',
    ],
    publicRepo: 'https://codeberg.org/Glitch_Exec_Lab/glitch-grow-ai-ads-agent',
    privateRepo: 'https://codeberg.org/glitch-executor/glitch-grow-ai-ads-agent-private',
    status: 'shipped',
    demoVideoId: 'YYPRzr5n674',
    demoVideoTitle: 'Cross-channel ROAS in one Discord command',
    priceUsd: 149,
    priceInr: 3999,
    buyUrlInr: "",  // TODO: fill via setup-razorpay-products.mjs
    buyUrl: "https://buy.stripe.com/00w4gAgjubTa1b526bgjC0c",
    derivativeUseCases: [
      'Sell a $1.5K/mo managed ads service to D2C brands (two clients = recoup price 10×)',
      'Run an AI-augmented ad agency with a 3-platform Pro tier at $1,497/mo',
      'Add ads orchestration as a feature to your existing SaaS',
    ],
    derivativeUseCasesInr: [
      'Sell a ₹25,000/mo managed ads service to Indian D2C brands (two clients = recoup price 12×)',
      'Run an AI-augmented ad agency with a 3-platform Pro tier at ₹50,000/mo',
      'Add ads orchestration as a feature to your existing Indian SaaS',
    ],
  },
  {
    sku: 'BSK-003',
    slug: 'sales-agent',
    name: 'AI Sales Agent',
    // Promoted from in-pilot → shipped 2026-05-06 (running in production
    // for Glitch Budz outbound on Tejas's box).
    productLine: 'Autonomous outbound + Discord HITL',
    oneLiner: 'Send Discord-approved outbound that actually gets replies, not flagged.',
    chips: ['Gmail outbound', 'Discord approvals', '8 email recipes'],
    metrics: { deploy: '~ 2 hours', sell: '$797/mo studio' },
    tagline: 'Autonomous outbound — discover, enrich, draft, Discord-approve, send, learn.',
    subline:
      'Discovers prospects from Google Maps + registry data, enriches with public signals, drafts personalized email per a tunable recipe library, escalates to Discord for one-tap approval, sends through Gmail, tracks replies, and writes every decision to memory. First deployment: Glitch Budz.',
    icon: 'send',
    whatYouGet: [
      'Discovery + enrichment pipeline (Google Maps, registry data, public-record scrapers, dedup)',
      'Eight email recipes with auto-A/B selection + Gmail send/open/reply tracking',
      'Discord one-tap approve / reject / inline-edit + per-recipe autonomy thresholds',
    ],
    bestFor: 'Vertical-focused B2B outbound for SaaS, agencies, and professional-services firms.',
    sellAs: '$797/mo Studio outbound (1,000 emails/mo, 3 senders) or $5K+ retainers.',
    sellAsInr: '₹15,000/mo Studio outbound for Indian B2B SaaS · or ₹50,000/mo agency retainer.',
    requirements: 'Claude Code handles the install. You bring keys: Gmail OAuth (per sender), Discord webhook URL, LiteLLM or Anthropic key, optional Maps API key for discovery.',
    priceLine: 'One-time license · run multiple sender domains under one deployment.',
    capabilities: [
      'Discovery + dedup across Google Maps, AGCO registry, and public-record scrapers',
      'Eight email recipes — auto A/B selected per outcome',
      'Discord HITL with edit-and-send — one-tap approve / reject / inline-edit',
      'Per-recipe autonomy thresholds — once a recipe earns enough approvals, agent auto-sends within a daily cap',
      'Memory in Postgres + pgvector + tsvector FTS — every draft, edit, reply, outcome indexed',
      'LiteLLM with Claude Sonnet for reasoning; Gmail send + open + reply tracking',
    ],
    publicRepo: 'https://codeberg.org/Glitch_Exec_Lab/glitch-grow-sales-agent',
    privateRepo: 'https://codeberg.org/glitch-executor/glitch-grow-sales-agent-private',
    status: 'shipped',
    priceUsd: 99,
    priceInr: 2499,
    buyUrlInr: "",  // TODO: fill via setup-razorpay-products.mjs
    buyUrl: "https://buy.stripe.com/5kQbJ2gju1ew8Dx5ingjC0d",
    derivativeUseCases: [
      'Sell a Studio outbound service at $797/mo (1000 emails/mo, 3 senders)',
      'Run vertical-specific outbound lists for SaaS clients',
      'Add automated outbound to your agency stack',
    ],
    derivativeUseCasesInr: [
      'Sell a Studio outbound service at ₹15,000/mo (1000 emails/mo, 3 senders)',
      'Run vertical-specific outbound lists for Indian B2B SaaS clients',
      'Add automated outbound to your agency stack and bill ₹50,000/mo retainers',
    ],
  },
  {
    sku: 'BSK-004',
    slug: 'social-media-agent',
    name: 'AI Social Media Agent',
    productLine: 'Multi-brand social ops + ORM stack',
    oneLiner: 'Post, reply and monitor reputation across 5 brands in under 30 min/week.',
    chips: ['10+ platforms', 'AI video pipeline', 'Reputation monitor'],
    metrics: { deploy: '~ 2 hours', sell: '$1.5K/mo per brand' },
    tagline: 'Three content pipelines × three publishers × N brands — under 30 min/week.',
    subline:
      'Sheet-driven text and carousels, AI-generated short-form video via Kling 2.0, and Drive-footage publisher. Three-tier publisher across X, LinkedIn, TikTok, Instagram, YouTube via Upload-Post. ORM mention-monitor with brand-voice 7-tier classifier. 81 tests passing.',
    icon: 'layers',
    whatYouGet: [
      'Sheet-driven posting (text, gpt-image-2 quote cards, LinkedIn PDF carousels) + 5 design archetypes',
      'AI video pipeline (Kling 2.0 + ffmpeg + Gemini 2.5 Pro QC) + Drive-footage publisher',
      'Upload-Post integration (5 brands × 10+ platforms with one key) + ORM mention-monitor with brand-voice classifier',
    ],
    bestFor: 'Agencies running social ops for multiple D2C, SaaS, or creator brands at once.',
    sellAs: '$1,497/mo per brand · ORM add-on $297/mo · scale to 5 brands per deployment.',
    sellAsInr: '₹35,000/mo per brand · ORM add-on ₹7,500/mo · scale to 5 brands per deployment.',
    requirements: 'Claude Code handles the install. You bring keys: Upload-Post API key, a Google Sheet for the content pipeline, Telegram webhook for approvals, Cloudflare R2 or GCS for the asset bucket.',
    priceLine: 'One-time license · 5 brands per deployment, unlimited content pieces.',
    capabilities: [
      'Sheet-driven posting — text, designed quote cards (gpt-image-2), and LinkedIn PDF carousels',
      'Five carousel design archetypes: split-diagram, data-reveal, code-frame, asymmetric-stack, halo-focus',
      'AI video pipeline: GitHub commits → script → storyboard → Kling 2.0 → ffmpeg + Gemini 2.5 Pro QC',
      'Drive-footage path for pre-edited brand clips with auto-generated captions',
      'Upload-Post + Zernio + direct-API fallback chain — one key covers 5 brands × 10+ platforms',
      'ORM mention-monitor with hard-stop guardrails + per-tier auto-send vs Telegram review',
    ],
    publicRepo: 'https://codeberg.org/Glitch_Exec_Lab/glitch-grow-ai-social-media-agent',
    privateRepo: 'https://codeberg.org/glitch-executor/glitch-grow-ai-social-media-agent-private',
    status: 'shipped',
    priceUsd: 129,
    priceInr: 2999,
    buyUrlInr: "",  // TODO: fill via setup-razorpay-products.mjs
    buyUrl: "https://buy.stripe.com/14A7sM4AM7CUaLF9yDgjC0e",
    derivativeUseCases: [
      'Run social for 5 brands at $1,497/mo (one Multi-Brand client = recoup 5×)',
      'Skip 5 platform-app audits — Upload-Post handles 10+ platforms with one key',
      'Sell ORM + brand-voice as an add-on at $297/mo per brand',
    ],
    derivativeUseCasesInr: [
      'Run social for 5 Indian brands at ₹35,000/mo (one Multi-Brand client = recoup 11×)',
      'Skip 5 platform-app audits — Upload-Post handles 10+ platforms with one key',
      'Sell ORM + brand-voice as an add-on at ₹7,500/mo per brand',
    ],
  },
  {
    sku: 'BSK-005',
    slug: 'cod-confirm',
    name: 'Voice AI Agent (LiveKit + Sarvam)',
    productLine: 'Production voice agent stack',
    oneLiner: 'Outbound voice agent for COD confirms and appointment calls in 10 Indian languages.',
    chips: ['10 Indian languages', 'Sub-second latency', '$0.02/min infra'],
    metrics: { deploy: '~ 4 hours', sell: '₹3–5/call' },
    tagline: 'Production voice agent. Sub-second latency. 10 Indian languages. $0.02/min raw cost.',
    subline:
      'The full LiveKit + Sarvam STT + GPT-4o-mini + ElevenLabs TTS + R2 recording stack running outbound COD confirmation calls in production. Skip Bland.ai\'s $0.10/min markup. Skip Vapi vendor lock-in. Own the stack.',
    icon: 'phone',
    whatYouGet: [
      'LiveKit Agents JS v1.2.6 + SIP for outbound + inbound calls (works with Twilio, Plivo, Exotel)',
      'Sarvam STT (10 Indian languages) + GPT-4o-mini reasoning + ElevenLabs TTS with regional accents',
      'DND-aware scheduler, R2 recording + Whisper transcript, HMAC-verified webhook trigger',
    ],
    bestFor: 'Indian Shopify merchants doing COD confirmation, AI receptionists, appointment-confirmation calls.',
    sellAs: '$0.05–$0.10/call to merchants · or $2,997/mo per white-label reseller seat to agencies.',
    sellAsInr: '₹3–5/call to Shopify merchants · one mid-volume merchant = ₹18–30,000/mo · or ₹50,000/mo white-label seat.',
    requirements: 'Claude Code handles the install. You bring accounts: LiveKit Cloud, Sarvam (STT for Indian languages), ElevenLabs (TTS), Cloudflare R2 for recordings, plus a SIP trunk via Twilio / Plivo / Exotel.',
    priceLine: 'One-time license · $0.02/min raw infra cost beats Bland.ai 5×.',
    capabilities: [
      'LiveKit Agents JS v1.2.6 with first-class SIP for outbound + inbound calls',
      'Sarvam STT (Hindi, English, Punjabi, Tamil, Telugu, Bengali, Marathi, Gujarati +) — rare in market',
      'OpenAI Realtime alt path for English-only, lowest latency',
      'GPT-4o-mini reasoning with conversation memory + four tool calls',
      'ElevenLabs TTS with voice cloning + regional accents',
      'DND-aware scheduler, per-tenant allowlist, HMAC-verified webhook trigger, R2 recording + Whisper transcript',
    ],
    publicRepo: 'https://codeberg.org/Glitch_Exec_Lab/glitch-grow-cod-confirm',
    privateRepo: 'https://codeberg.org/glitch-executor/glitch-grow-cod-confirm-private',
    status: 'shipped',
    priceUsd: 149,
    priceInr: 3999,
    buyUrlInr: "",  // TODO: fill via setup-razorpay-products.mjs
    buyUrl: "https://buy.stripe.com/fZu14ogju3mEaLFbGLgjC0f",
    derivativeUseCases: [
      'Sell COD-confirm to Indian Shopify merchants at ₹3–5/call (one mid-volume merchant = ₹18–30K/mo)',
      'Build AI receptionist or appointment confirmation services',
      'White-label voice AI to agencies at $2,997/mo per reseller seat',
    ],
    derivativeUseCasesInr: [
      'Sell COD-confirm to Indian Shopify merchants at ₹3–5/call (one mid-volume merchant = ₹18–30K/mo)',
      'Build AI receptionist or appointment confirmation for Indian businesses',
      'White-label voice AI to Indian agencies at ₹50,000/mo per reseller seat',
    ],
  },
  {
    sku: 'BSK-006',
    slug: 'seo-agent',
    name: 'AI SEO Agent',
    productLine: 'Autonomous SEO + AI-search agent',
    oneLiner: 'Run end-to-end SEO from Claude Code — audits, schema, llms.txt, internal links, all approval-gated.',
    chips: ['Schema + llms.txt', 'AI-search ready', 'Shopify metafields'],
    metrics: { deploy: '~ 1 hour', sell: '$1.5K/mo per site' },
    tagline: 'Talk to Claude Code, your site ships SEO work back at agency-tier quality.',
    subline:
      'A full-stack SEO operations agent that plugs into Claude Code as an MCP. Audits on-page SEO, generates schema + llms.txt, writes meta titles and descriptions, plans internal links, monitors rankings, and (for Shopify stores) writes structured data directly into metafields. The same engine running grow.glitchexecutor.com/app — repackaged so any merchant or marketing operator can drive it from Claude Code without touching the codebase.',
    icon: 'chart',
    whatYouGet: [
      'AI SEO Agent MCP — installed into Claude Code with one line, 12 production tools',
      'Pre-wired GSC + GA4 + Shopify Admin connectors (token-vault per site, encrypted at rest)',
      'Brand-config pack — voice guide + competitor SERP set + content briefs tuned to your vertical',
    ],
    bestFor: 'Marketing operators, D2C brands, and SEO freelancers who want an SEO layer Claude Code can drive — no code, no devops.',
    sellAs: '$1,497/mo per managed site · or $5K+ launch-and-tune SEO engagements.',
    sellAsInr: '₹25,000/mo per Indian site · or ₹1.5–3L per launch-and-tune SEO engagement.',
    requirements: 'Claude Code handles the install. You bring accounts: Google Search Console + GA4 (service-account access), optional Shopify Admin (custom-app token for metafield writes).',
    priceLine: 'One-time license · drives unlimited sites from Claude Code.',
    capabilities: [
      'Claude Code MCP exposing 12 SEO tools — audit, schema, llms.txt, links, briefs',
      'AI-search readiness — schema graph, llms.txt, citation-targeted content shape (Anthropic, OpenAI, Perplexity)',
      'Internal-link planner — orphan detection + topical clustering with Postgres + pgvector',
      'Content brief generator — keyword + SERP + competitor-gap synthesis for any target query',
      'Shopify metafields writer — structured data lands in metafields without manual theme edits',
      'Memory in Postgres + pgvector — every audit, decision, edit indexed for the next run',
    ],
    publicRepo: 'https://codeberg.org/Glitch_Exec_Lab/glitch-grow-ai-seo-agent',
    privateRepo: 'https://codeberg.org/glitch-executor/glitch-grow-ai-seo-agent-private',
    status: 'shipped',
    priceUsd: 99,
    priceInr: 2499,
    buyUrlInr: "",  // TODO: fill via setup-razorpay-products.mjs
    buyUrl: "https://buy.stripe.com/00waEYaZag9q5rlfX1gjC0g",
    derivativeUseCases: [
      'Run a managed SEO service for D2C brands at $1,497/mo per site',
      'Sell AI-search + traditional SEO as a bundled retainer — Claude Code does the work, you keep the relationship',
      'Add SEO as a feature in your existing agency stack',
    ],
    derivativeUseCasesInr: [
      'Run a managed SEO service for Indian D2C brands at ₹25,000/mo per site',
      'Sell AI-search + traditional SEO as a bundled retainer at ₹50,000/mo agency rates',
      'Add SEO as a feature inside an existing Indian agency stack',
    ],
  },
  {
    sku: 'BSK-007',
    slug: 'ugc-agent',
    name: 'AI UGC Agent',
    productLine: 'Production UGC video ad pipeline',
    oneLiner: 'Turn a product brief into 5–8 paid-ad-ready vertical UGC videos in one pass.',
    chips: ['HeyGen + ElevenLabs', 'Meta + TikTok ads', '5–8 hook variants'],
    metrics: { deploy: '~ 2 hours', sell: '$1.5K/mo per brand' },
    tagline: 'A directorial pipeline that ships 5–8 hook variants for every product brief.',
    subline:
      'Production-grade UGC creative for paid acquisition — built for CPA, not views. One yaml brief becomes a script + multiple hook variants + HeyGen avatar + gpt-image-2 stills + WAN i2v motion + ElevenLabs voiceover, assembled with Remotion + ffmpeg into 1080×1920 vertical ads, then drafted into Meta Ads Manager / TikTok Ads Manager ready for an A/B test. The pipeline running real campaigns inside Glitch Executor Labs.',
    icon: 'spark',
    whatYouGet: [
      'Full UGC pipeline repo — script → variants → avatar → b-roll → assembly → ad-platform draft',
      'Brief schema + 5 worked-example briefs (DTC, SaaS, Shopify, voice agent, agency-resell)',
      'Meta Ads + TikTok Ads draft-creative uploaders with brand-asset library wiring',
    ],
    bestFor: 'Performance marketers, D2C brands, and agencies running paid social — anyone who burns budget on creative testing.',
    sellAs: '$1,497/mo per brand UGC creative service · or $5–10K per launch campaign creative pack.',
    sellAsInr: '₹25,000/mo per Indian brand UGC creative service · or ₹1.5–3L per launch creative pack for D2C brands.',
    requirements: 'Claude Code handles the install. You bring keys: HeyGen, ElevenLabs (workspace key), OpenAI, fal.ai. Optional: Meta or TikTok Ads tokens if you want auto-upload as draft creatives.',
    priceLine: 'One-time license · ship unlimited UGC variants across unlimited brands.',
    capabilities: [
      'Script + hook engine — UGC-shape (hook · pain · product · CTA) with 5–8 hook variants per brief',
      'Avatar layer — HeyGen talking-head with stock or custom avatars',
      'B-roll — gpt-image-2 stills + WAN i2v motion clips synced to script beats',
      'Voiceover — ElevenLabs with brand voice cloning',
      'Assembly — Remotion + ffmpeg compose 1080×1920 vertical with safe-zone QC',
      'Ad-platform draft uploaders — Meta Ads Manager + TikTok Ads Manager creative drafts ready for A/B',
    ],
    publicRepo: 'https://codeberg.org/Glitch_Exec_Lab/glitch-grow-ai-ugc-agent',
    privateRepo: 'https://codeberg.org/glitch-executor/glitch-grow-ai-ugc-agent-private',
    status: 'shipped',
    priceUsd: 149,
    priceInr: 3999,
    buyUrlInr: "",  // TODO: fill via setup-razorpay-products.mjs
    buyUrl: "https://buy.stripe.com/3cI28s4AMbTaaLFdOTgjC0i",     // TODO: create Stripe Payment Link via scripts/setup-stripe-products.mjs
    derivativeUseCases: [
      'Sell UGC creative as a $1,497/mo retainer — replaces $7K+/mo specialist UGC agencies',
      'Bundle creative + ads-agent for end-to-end paid acquisition delivery',
      'Per-launch creative packs at $5–10K — five hook variants, three iterations, all platforms',
    ],
    derivativeUseCasesInr: [
      'Sell UGC creative at ₹25,000/mo per Indian D2C brand — agency-tier output, founder-tier pricing',
      'Bundle creative + ads-agent + Razorpay attribution for D2C launch retainers at ₹75,000/mo',
      'Per-launch creative packs at ₹1.5–3L — five hook variants, three iterations, Meta + TikTok ready',
    ],
  },
];

/** Sub-brand product line — separate from the agent boilerplates. */
export const subBrands = [
  {
    slug: 'budz',
    href: '/budz',
    name: 'Glitch Budz',
    tagline: 'Cannabis e-commerce SaaS for independent Toronto retailers.',
    blurb:
      'A real online store for your cannabis shop. $999 to launch, $99/month flat. AGCO click-and-collect compliant. Built in North York for Canadian cannabis retail.',
    icon: 'shopping-cart' as const,
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
