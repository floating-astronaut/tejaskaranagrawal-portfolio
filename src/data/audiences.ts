// Persona + industry hub pages live at /for/{slug}.
// Each entry is one curated landing surface that restates audience-specific
// pain, recommends 3 Glitch products, and links to the alternatives that
// audience evaluates most. Built with high commercial intent in mind —
// these pages are where buyers actually decide.

export interface Audience {
  slug: string;
  /** "Persona" hubs target a buyer profile; "industry" hubs target a niche. */
  type: 'persona' | 'industry';
  /** Display label (used in card titles + nav). */
  label: string;
  /** Exact-match H1 — query-shaped. */
  h1: string;
  /** Meta description + hero subline. */
  blurb: string;
  /** 3-5 audience-specific pain points. */
  pains: string[];
  /** 3-5 reasons Glitch Grow fits this audience. */
  fits: string[];
  /** Glitch product slugs in priority order, max 4. */
  productSlugs: string[];
  /** Competitor slugs from src/data/pseo-matrix.ts most relevant for this
   *  audience — the "alternatives I should check" set. */
  competitorSlugs: string[];
  /** One-line typical pricing context for this audience. */
  pricingContext: string;
  /** 4-6 FAQ pairs — used in FAQPage schema + on-page accordion. */
  faqs: { q: string; a: string }[];
}

export const audiences: Audience[] = [
  {
    slug: 'agency-owners',
    type: 'persona',
    label: 'Agency Owners',
    h1: 'AI agent stacks for agency owners',
    blurb: 'Pay once, deploy across unlimited clients on your infra, white-label per brand, and bill $1,497–$2,997/mo per managed service line. Six production agents you own outright instead of stacking SaaS subscriptions.',
    pains: [
      'Per-seat and per-task SaaS pricing scales with your client count, compressing margin every new account',
      'Reselling a managed-platform agent to your client without exposing the platform requires extra work',
      'Stacking Zapier + Make + Vapi + Smartlead + a social tool runs $480+/mo per client',
      'Agent reasoning, HITL approval, and memory primitives are missing from connector tools',
    ],
    fits: [
      'BSL 1.1 license explicitly permits client delivery and rebranding',
      'Brand-config JSON schema swaps logo, domain, colors per client',
      'Self-host on Cloud Run / GCE / VPS — no platform between you and the client',
      'Six production agents already running real businesses',
    ],
    productSlugs: ['ads-agent', 'sales-agent', 'social-media-agent', 'cod-confirm'],
    competitorSlugs: ['zapier', 'make', 'n8n', 'lindy-ai', 'smartlead'],
    pricingContext: 'Most agencies bill $1,497–$2,997/mo per managed service line. Two clients per agent typically recoups the license 10×.',
    faqs: [
      { q: 'How many clients before this pays back?', a: 'For most agencies, the second client running any meaningful volume puts the one-time $499 ahead of the equivalent SaaS bill within 60 days.' },
      { q: 'Can I run different agents for different clients?', a: 'Yes — each client gets its own deployment with its own brand-config JSON. Same agent code, different brand identity per client.' },
      { q: 'What about clients who want their data on their own infra?', a: 'That\'s the deployment model. Each client deployment is isolated — separate VM, separate API keys, separate database. They get a service branded as you on infrastructure they could in principle take over.' },
      { q: 'Do I need a developer on the team?', a: 'Yes — you need someone comfortable with `docker compose up` and `.env` files. Glitch Grow ships deploy configs for Docker, Cloud Run, GCE, and systemd, but it\'s still code.' },
    ],
  },
  {
    slug: 'freelancers',
    type: 'persona',
    label: 'Freelancers',
    h1: 'AI marketing agents for solo freelancers',
    blurb: 'One $499 purchase covers six AI agents. Deploy whichever the project needs and bill the time, not the tools. Skip the SaaS subscription stack.',
    pains: [
      'SaaS subscriptions stack faster than client revenue grows when each project needs different tools',
      'Per-seat pricing punishes the solo operator picking up varied small projects',
      'Building agent infrastructure from scratch costs months you don\'t have',
      'Reselling SaaS-branded outputs to clients erodes your positioning',
    ],
    fits: [
      'Six finished agents ready to deploy — outbound, ads, social, voice, MCPs, Shopify SaaS',
      'BSL 1.1 license — deliver to clients under your own brand',
      '$499 one-time replaces $300+/mo of recurring tools',
      'Discord community access for ongoing technical questions',
    ],
    productSlugs: ['sales-agent', 'social-media-agent', 'ugc-agent', 'ads-agent'],
    competitorSlugs: ['zapier', 'n8n', 'gumloop', 'smartlead', 'instantly'],
    pricingContext: 'Typical freelance pricing for these services: $1,500–$5,000 per project setup + $497–$997/mo retainer for ongoing operation.',
    faqs: [
      { q: 'I\'m solo — is this overkill?', a: 'For 1–2 small projects per year, yes; just use Zapier\'s free tier. By the third project per year, the math flips toward owning the stacks.' },
      { q: 'Which agent should I start with?', a: 'For most freelancers, the Sales Agent or Social Media Agent — they have the broadest applicability across the kinds of projects freelancers pick up.' },
      { q: 'Can I just buy one agent?', a: 'Yes — every agent is sold à la carte. The AI Digital Marketing Stack ($499) is the bundle of all six plus bonuses; individual agents start at $99.' },
      { q: 'What if I\'m not deeply technical?', a: 'You need command-line + Docker comfort. If "edit a JSON file and run a deploy command" feels approachable, you\'re good.' },
    ],
  },
  {
    slug: 'indie-devs',
    type: 'persona',
    label: 'Indie Developers',
    h1: 'AI marketing agents for indie developers',
    blurb: 'Full source on private GitHub, BSL 1.1 license, deploy targets you already use. No platform between you and your stack — just code you can extend, ship, and resell.',
    pains: [
      'You\'d rather extend code than learn a new no-code builder',
      'Platform lock-in makes a launched product harder to migrate later',
      'Building production patterns (HITL, memory, multi-tenancy) from scratch is months of work',
      'Reselling managed-platform agents as part of your own SaaS is contractually awkward',
    ],
    fits: [
      'Full source repo on private GitHub — fork, extend, integrate',
      'Production patterns shipped: token vault, HITL reconciler, vector memory, multi-tenant config',
      'Deploy targets that match how you already ship: Docker, Cloud Run, GCE, systemd',
      'AI UGC Agent ships five reference implementations so you can ship vertical MCPs fast',
    ],
    productSlugs: ['ugc-agent', 'seo-agent', 'sales-agent', 'social-media-agent'],
    competitorSlugs: ['n8n', 'gumloop', 'lindy-ai', 'relevance-ai', 'stack-ai'],
    pricingContext: 'Indie SaaS pricing typically: $29–$99/mo per managed integration, or $5–25K per custom-build engagement.',
    faqs: [
      { q: 'Is the source modifiable?', a: 'Yes — BSL 1.1 explicitly permits modification and client delivery. The only constraint is that you can\'t repackage the kit itself as a competing kit.' },
      { q: 'What\'s in the AI UGC Agent?', a: 'Five reference MCP servers (Meta Ads, Google Ads, Amazon Attribution, LinkedIn, Supermetrics), Python (FastMCP) + TypeScript (MCP SDK) scaffolds, five auth patterns demonstrated, and deploy configs for systemd / nginx / Cloud Run / Docker / GCE cloud-init.' },
      { q: 'Can I ship a SaaS using a AI agent in the Stack as the core?', a: 'Yes — that\'s the AI SEO Agent\'s exact use case. Other agent stacks work the same way.' },
      { q: 'Is there a Discord?', a: 'Yes — lifetime access included with the AI Digital Marketing Stack. Daily questions, code reviews on extensions, occasional pair-debugging.' },
    ],
  },
  {
    slug: 'ecommerce-founders',
    type: 'persona',
    label: 'Ecommerce Founders',
    h1: 'AI agent stacks for ecommerce founders',
    blurb: 'Voice agent at $0.02/min raw infra, social and ads agents you own and tune to your brand without per-seat fees. Replace stacked SaaS subscriptions with stacks you control.',
    pains: [
      'Per-call voice fees compress margin on every COD-confirm call',
      'Per-task automation costs scale with order volume — exactly when margin matters most',
      'Multi-tool subscriptions (Klaviyo + Hootsuite + Tidio + voice) compound monthly',
      'Indian-language voice quality from generic platforms degrades on regional accents',
    ],
    fits: [
      'Voice AI at ~$0.02/min raw infra cost beats Bland.ai 5× and Vapi ~2.5×',
      'Sarvam STT covers Hindi, Punjabi, Tamil, Telugu, Bengali, Marathi, Gujarati natively',
      'Social Media Agent runs five brands × ten platforms from one deployment',
      'AI SEO Agent — schema, llms.txt, internal-link planner, Shopify metafields',
    ],
    productSlugs: ['cod-confirm', 'social-media-agent', 'ads-agent', 'seo-agent'],
    competitorSlugs: ['vapi', 'retell', 'manychat', 'zapier', 'lindy-ai'],
    pricingContext: 'Indian D2C voice typically charges merchants ₹3–5/call vs ₹15–25/call through SaaS voice platforms. Mid-volume merchant = ₹18–30K/mo per service.',
    faqs: [
      { q: 'How does the $0.02/min voice cost work?', a: 'Raw infra: LiveKit Cloud + Sarvam STT + GPT-4o-mini + ElevenLabs TTS + R2 recording. No platform fee on top. The Voice AI Agent agent ships pre-wired to all of those.' },
      { q: 'Can I run COD-confirm in regional Indian languages?', a: 'Yes — Sarvam STT was built specifically for Indian languages and outperforms generic STT on regional accents and code-switching. Hindi, Punjabi, Tamil, Telugu, Bengali, Marathi, Gujarati ship as defaults.' },
      { q: 'What about DLT compliance?', a: 'Outbound voice via Indian SIP trunks (Plivo, Exotel) needs DLT-registered headers and templates. Both providers expose this in their APIs; the agent ships with the integration patterns.' },
      { q: 'How many calls before this pays back?', a: 'A merchant running 10K calls/mo at typical durations saves ~$600/mo vs platform pricing. License pays back in ~2 months at that volume.' },
    ],
  },
  {
    slug: 'b2b-saas',
    type: 'persona',
    label: 'B2B SaaS Operators',
    h1: 'AI agent stacks for B2B SaaS teams',
    blurb: 'Self-hosted agents your team owns and extends. Outbound, social, ads, and MCP integrations as code you commit alongside the rest of the product, in the same monorepo with the same deploy pipeline.',
    pains: [
      'Outbound, social, and customer-ops tooling are recurring line items competing with engineering hires',
      'Per-seat tool sprawl across 30 vendors complicates security review and SOC 2 audits',
      'SaaS-locked workflows can\'t be extended into your product\'s domain logic',
      'Vendor data-residency constraints ship with platform tools — not with your code',
    ],
    fits: [
      'Source code in your monorepo with the rest of the product',
      'Same deploy pipeline, same observability surface, same on-call rota',
      'MCP integrations expose your product to Claude / GPT / agent ecosystems',
      'Outbound + ads + social as code your team can extend with vertical-specific logic',
    ],
    productSlugs: ['sales-agent', 'ugc-agent', 'social-media-agent', 'ads-agent'],
    competitorSlugs: ['n8n', 'lindy-ai', 'relevance-ai', 'stack-ai', 'smartlead'],
    pricingContext: 'Replace $30–$100K/yr in stacked SaaS with one-time $499 + your existing dev infrastructure. License is a budget line item, not a recurring vendor.',
    faqs: [
      { q: 'How does this fit a SOC 2 environment?', a: 'You ship the code on your own infrastructure with whatever compliance posture you already have. No new vendor to evaluate. The license is BSL 1.1 — no copyleft, no obligation to disclose modifications.' },
      { q: 'Can we run only the parts we need?', a: 'Yes — agents are independent. Use the Sales Agent for outbound and skip the others; or use just AI UGC Agent to expose your product to agent ecosystems.' },
      { q: 'What about data residency for EU / India customers?', a: 'You pick the region. Glitch Grow ships deploy configs for Cloud Run (any region), GCE (any region), or your own VMs. No data ever transits a Glitch Grow service.' },
      { q: 'Does this replace Apollo / Outreach / Salesloft?', a: 'For the sequencer + reasoning layer, mostly. For the CRM data layer, no — you\'ll still use Salesforce / HubSpot. Glitch Grow\'s Sales Agent is the agent layer above the sender.' },
    ],
  },
  {
    slug: 'indian-d2c',
    type: 'industry',
    label: 'Indian D2C',
    h1: 'AI agents for Indian D2C brands',
    blurb: 'Built for the Indian D2C economics: voice agents in Hindi/Tamil/Bengali/Marathi at ₹3–5/call, COD-confirm flows that protect margin, and ad-ops that match the volume + budget reality of D2C scale.',
    pains: [
      'Indian COD orders refuse at 20–40% — confirmation calls protect margin but per-call SaaS pricing eats it',
      'Generic voice STT degrades hard on regional Indian languages and code-switching',
      'D2C ad budgets don\'t fit US-pricing SaaS retainers; rupee pricing matters',
      'Razorpay-side compliance constraints differ from global Stripe expectations',
    ],
    fits: [
      'Voice AI Agent ships pre-wired to Sarvam (10+ Indian languages) and Plivo / Exotel SIP',
      'INR Razorpay rail with PPP-adjusted pricing per agent (₹999–₹3,999 per kit)',
      'Ads Agent runs Meta + Google + TikTok with per-brand autonomy thresholds',
      'Indian legal entity (Bani Thani) and dedicated /in/ rail for Razorpay onboarding',
    ],
    productSlugs: ['cod-confirm', 'ads-agent', 'social-media-agent', 'seo-agent'],
    competitorSlugs: ['vapi', 'retell', 'zapier', 'lindy-ai'],
    pricingContext: 'COD-confirm at ₹3–5/call to merchants. Mid-volume Shopify merchant (10K calls/mo) = ₹30–50K/mo per service. Ads service ₹25K/mo per brand; social ₹35K/mo.',
    faqs: [
      { q: 'Why not use Sarvam directly?', a: 'You can — and the agent uses Sarvam under the hood. The kit ships the orchestration around it: LiveKit transport, GPT-4o-mini reasoning, ElevenLabs TTS, DND scheduler, R2 recording, HMAC webhooks. That\'s the production work.' },
      { q: 'How does Razorpay onboarding work for resellers?', a: 'You set up your own Razorpay merchant account; Glitch Grow runs the India entity for our own checkout. The agent is yours to deploy under your business identity.' },
      { q: 'GST on the kit purchase?', a: 'Yes — the /in rail handles GST per Indian regulation. Buyers get a tax invoice from Bani Thani.' },
      { q: 'What languages besides Hindi?', a: 'Sarvam supports Hindi, English, Punjabi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam — and code-switched variants.' },
    ],
  },
  {
    slug: 'shopify-merchants',
    type: 'industry',
    label: 'Shopify Merchants & Partners',
    h1: 'AI agents for Shopify merchants and Partner-account builders',
    blurb: 'COD-confirm voice for high-volume D2C, ads operator wired to Shopify, and a AI SEO Agent for shipping App Store-listed apps under your Partner account.',
    pains: [
      'Building a Shopify App from scratch takes weeks on auth, scopes, GDPR, and Billing API',
      'COD-confirm via SaaS voice platforms compresses merchant margin',
      'Generic ads tools don\'t map cleanly to Shopify\'s sales / blended ROAS reality',
      'Shopify\'s 33-scope unified Custom App set is undocumented; trial-and-error eats days',
    ],
    fits: [
      'AI SEO Agent ships the validated 33-scope set + GDPR webhooks',
      'Voice AI Agent integrates with Shopify webhooks for order-paid → COD-confirm trigger',
      'AI Ads Agent pulls Shopify order data alongside Meta/Google/TikTok data',
      'Modern React Router app shell (not legacy Remix) with App Bridge wired',
    ],
    productSlugs: ['seo-agent', 'cod-confirm', 'ads-agent', 'ugc-agent'],
    competitorSlugs: ['vapi', 'manychat', 'zapier', 'gumloop'],
    pricingContext: 'Shopify App Store listings typically $29–$99/mo per merchant; custom Shopify builds $5–25K per engagement. Voice COD-confirm ₹3–5/call.',
    faqs: [
      { q: 'What\'s the 33-scope thing?', a: 'Shopify\'s Custom App admin UI accepts a specific subset of OAuth scopes; the rest get rejected silently. The AI SEO Agent ships the validated set plus the rejected list, saving days of trial-and-error.' },
      { q: 'Does it ship App Store-ready code?', a: 'Yes — auth-hub for multi-tenant install flows, GDPR webhooks (customers.data_request, customers.redact, shop.redact), Shopify Billing API integration with subscription tiers and usage records.' },
      { q: 'Can I integrate the Voice AI Agent with my store\'s checkout?', a: 'Yes — the agent triggers on Shopify\'s `orders/paid` webhook and uses HMAC-verified handlers. Confirmations land back in Shopify as order notes.' },
      { q: 'What\'s the live SEO Agent example?', a: 'A complete worked example shipped inside the Shopify SaaS Boilerplate, deployed at grow.glitchexecutor.com/app. Audit → schema → llms.txt → Shopify metafields. Buyers can fork it as a starting point.' },
    ],
  },
  {
    slug: 'agencies-resell',
    type: 'industry',
    label: 'Resale-Focused Agencies',
    h1: 'White-label AI services for resale-focused agencies',
    blurb: 'Six production agents under BSL 1.1 — rebrand, deploy on the client\'s infra, charge $1,497–$2,997/mo per service line. Same code, different brand per client, fixed cost.',
    pains: [
      'Reselling managed-platform agents requires hiding the platform from your client',
      'Per-seat tool subscriptions multiply with each new client signed',
      'Setup time per client is the bottleneck on adding new accounts',
      'Margin compression every time a vendor raises prices mid-contract',
    ],
    fits: [
      'BSL 1.1 explicitly permits client delivery and rebranding',
      'Brand-config JSON schema swaps logo, domain, colors, copy without forking code',
      'Same agent code runs across N clients, each on their own infra and credentials',
      'Pricing playbook ships in every kit — service tiers, sales copy, retainer structure',
    ],
    productSlugs: ['ads-agent', 'sales-agent', 'social-media-agent', 'cod-confirm'],
    competitorSlugs: ['lindy-ai', 'relevance-ai', 'gumloop', 'zapier', 'smartlead'],
    pricingContext: 'Standard managed-service retainers: ads $1,497/mo, social $1,497/mo + ORM $297/mo, outbound $797/mo Studio, voice $2,997/mo white-label seat, custom MCP $5–25K per build.',
    faqs: [
      { q: 'Can I really hide that the agent is built on Glitch Grow?', a: 'BSL 1.1 explicitly permits it. The client sees your brand, your domain, your support contact. Glitch Grow\'s name appears nowhere in the deployment.' },
      { q: 'How fast is client #2 to deploy after client #1?', a: 'About 20 minutes. The brand-config JSON schema is the only thing that changes — same code, same deploy script, different identity.' },
      { q: 'What happens if a client wants to leave?', a: 'They take the deployment with them. Each client deployment is on their infrastructure with their API keys; you can hand it over with no platform-side coordination.' },
      { q: 'Pricing playbook — what\'s actually in it?', a: 'Tier definitions (Studio / Pro / Enterprise), sales copy templates, retainer structure, onboarding checklist, and a 5-tweet launch sequence per agent.' },
    ],
  },
];

export function getAudience(slug: string): Audience | undefined {
  return audiences.find((a) => a.slug === slug);
}
