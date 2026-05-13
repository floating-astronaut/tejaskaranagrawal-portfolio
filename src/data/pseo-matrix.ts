// Programmatic SEO matrix: 12 competitors × 5 personas = 60 pages
// served at /alternatives/{competitor}/for-{persona}.
//
// Each page targets a long-tail intent like
// "n8n alternative for agency owners" or "vapi alternative for ecommerce founders".
//
// Uniqueness guardrail: every rendered page combines competitor copy +
// persona copy + glitch-product fit + a tailored opening line. The
// shared structure is intentional (LLMs reward consistency) but the
// substantive paragraphs differ on at least three axes per page.

export type CompetitorCategory =
  | 'workflow'        // Zapier, Make, n8n
  | 'agent-platform'  // Lindy, Relevance, Gumloop, Stack AI
  | 'voice'           // Vapi, Retell
  | 'chat'            // Manychat
  | 'sequence';       // Smartlead, Instantly

export interface Competitor {
  slug: string;
  name: string;
  url: string;
  category: CompetitorCategory;
  /** Short one-liner positioning the competitor. */
  oneLiner: string;
  /** Pricing context — used in body copy. */
  pricingNote: string;
  /** Why people leave (1–2 sentences). Honest, factual. */
  whyLeave: string;
  /** Whether `/alternatives/{slug}.mdx` already exists for deep linking. */
  hasDeepPage: boolean;
  /** Glitch product slugs most relevant when leaving this competitor. */
  glitchProducts: string[];
}

export interface Persona {
  slug: string;
  label: string;
  /** Singular noun, lowercase ("agency owner"). */
  noun: string;
  /** Plural noun, lowercase ("agency owners"). */
  nounPlural: string;
  /** Short pain blurb (~25 words) about how SaaS pricing affects this persona. */
  pain: string;
  /** Why Glitch Grow fits this persona (~30 words). */
  fit: string;
  /** Glitch product slugs most useful for this persona, in priority order. */
  priorityProducts: string[];
  /** Typical client/project pricing context for this persona. */
  pricingContext: string;
  /** Concrete example of what this persona does day-to-day. */
  example: string;
}

export const competitors: Competitor[] = [
  {
    slug: 'zapier',
    name: 'Zapier',
    url: 'https://zapier.com',
    category: 'workflow',
    oneLiner: 'Workflow connector with task-metered pricing.',
    pricingNote: '$19.99–$103.50/mo per Workspace seat (2026 pricing), task-metered.',
    whyLeave: 'Per-task and per-seat pricing scales with both client count and automation volume; no native HITL queue or memory store.',
    hasDeepPage: true,
    glitchProducts: ['sales-agent', 'ads-agent', 'social-media-agent'],
  },
  {
    slug: 'make',
    name: 'Make',
    url: 'https://www.make.com',
    category: 'workflow',
    oneLiner: 'Visual scenario builder priced per operation.',
    pricingNote: 'Pro $16/mo for 10K ops; Teams $29/mo (2026 pricing).',
    whyLeave: 'Operations metering punishes anything that loops, retries, or polls — exactly what agent workloads do.',
    hasDeepPage: true,
    glitchProducts: ['sales-agent', 'ads-agent', 'social-media-agent'],
  },
  {
    slug: 'n8n',
    name: 'n8n',
    url: 'https://n8n.io',
    category: 'workflow',
    oneLiner: 'Open-core workflow runner with broad node library.',
    pricingNote: 'Self-host free; n8n Cloud from $20/mo.',
    whyLeave: 'You still need to design the agent loop, retry policy, memory, HITL queue, and per-client white-label — months of work for one good agent.',
    hasDeepPage: true,
    glitchProducts: ['ads-agent', 'sales-agent', 'ugc-agent'],
  },
  {
    slug: 'lindy-ai',
    name: 'Lindy AI',
    url: 'https://www.lindy.ai',
    category: 'agent-platform',
    oneLiner: 'Managed multi-agent platform with builder UI.',
    pricingNote: '~$49.99–$199.99/mo published tiers (2026).',
    whyLeave: 'Managed-platform branding leaks through to clients; portability of agent definitions is limited.',
    hasDeepPage: true,
    glitchProducts: ['sales-agent', 'ads-agent', 'social-media-agent'],
  },
  {
    slug: 'relevance-ai',
    name: 'Relevance AI',
    url: 'https://relevance.ai',
    category: 'agent-platform',
    oneLiner: 'Low-code agent platform with strong Apollo-style data tooling.',
    pricingNote: 'Tiered managed platform, published pricing varies.',
    whyLeave: 'Workflows live inside Relevance; reselling to clients without exposing the platform is awkward.',
    hasDeepPage: false,
    glitchProducts: ['sales-agent', 'ads-agent', 'ugc-agent'],
  },
  {
    slug: 'gumloop',
    name: 'Gumloop',
    url: 'https://www.gumloop.com',
    category: 'agent-platform',
    oneLiner: 'No-code AI workflow builder.',
    pricingNote: 'Tiered subscription (2026 pricing).',
    whyLeave: 'Visual builder is fast for prototypes; agent logic and brand isolation per client are platform-constrained.',
    hasDeepPage: false,
    glitchProducts: ['sales-agent', 'ads-agent'],
  },
  {
    slug: 'stack-ai',
    name: 'Stack AI',
    url: 'https://www.stack-ai.com',
    category: 'agent-platform',
    oneLiner: 'Enterprise-leaning AI workflow platform.',
    pricingNote: 'Enterprise tiers; per-seat or per-deployment.',
    whyLeave: 'Enterprise pricing and platform lock-in; not built for agency rebrand-and-resell economics.',
    hasDeepPage: false,
    glitchProducts: ['ads-agent', 'sales-agent', 'ugc-agent'],
  },
  {
    slug: 'vapi',
    name: 'Vapi',
    url: 'https://vapi.ai',
    category: 'voice',
    oneLiner: 'Polished managed voice-AI platform.',
    pricingNote: 'From ~$0.05/min platform fee plus model + telephony (2026).',
    whyLeave: 'Per-minute platform markup kills high-volume use cases; Indian-language depth lags Sarvam.',
    hasDeepPage: true,
    glitchProducts: ['cod-confirm'],
  },
  {
    slug: 'retell',
    name: 'Retell',
    url: 'https://www.retellai.com',
    category: 'voice',
    oneLiner: 'Developer-focused voice AI infrastructure.',
    pricingNote: '~$0.07/min plus model costs (2026).',
    whyLeave: 'Per-minute pricing layered on top of model + telephony costs eats high-volume call margin.',
    hasDeepPage: false,
    glitchProducts: ['cod-confirm'],
  },
  {
    slug: 'manychat',
    name: 'Manychat',
    url: 'https://manychat.com',
    category: 'chat',
    oneLiner: 'Chat marketing automation across Instagram, WhatsApp, and Messenger.',
    pricingNote: 'Free tier; Pro from $15/mo (2026).',
    whyLeave: 'Single-channel chat focus; no multi-platform publishing, AI video, or ORM monitor at agent level.',
    hasDeepPage: false,
    glitchProducts: ['social-media-agent', 'sales-agent'],
  },
  {
    slug: 'smartlead',
    name: 'Smartlead',
    url: 'https://www.smartlead.ai',
    category: 'sequence',
    oneLiner: 'High-volume cold-email sender with strong deliverability tools.',
    pricingNote: 'From ~$39/mo, scaling with sender pool size (2026).',
    whyLeave: 'Sequence runner, not an agent — no draft-level reasoning, no HITL approval, no memory of what worked.',
    hasDeepPage: true,
    glitchProducts: ['sales-agent'],
  },
  {
    slug: 'instantly',
    name: 'Instantly',
    url: 'https://instantly.ai',
    category: 'sequence',
    oneLiner: 'Cold-email automation with inbox-rotation infrastructure.',
    pricingNote: 'From ~$37/mo, scales with sender accounts (2026).',
    whyLeave: 'Same shape as Smartlead — strong sender layer, missing the agent layer above (discover → enrich → draft → approve → learn).',
    hasDeepPage: false,
    glitchProducts: ['sales-agent'],
  },
];

export const personas: Persona[] = [
  {
    slug: 'agency-owners',
    label: 'Agency Owners',
    noun: 'agency owner',
    nounPlural: 'agency owners',
    pain: 'Per-seat and per-task SaaS pricing scales linearly with your client count, so margin compresses every time you sign a new account.',
    fit: 'Pay once, deploy across unlimited clients on your infra, white-label per brand, charge $1,497–$2,997/mo per service line.',
    priorityProducts: ['ads-agent', 'sales-agent', 'social-media-agent', 'cod-confirm'],
    pricingContext: '$1,497–$2,997/mo per managed service line; bundles command 10–20% premium per added line.',
    example: 'Adding a managed AI ads service for a D2C client at $1,497/mo on top of an existing creative retainer.',
  },
  {
    slug: 'freelancers',
    label: 'Freelancers',
    noun: 'freelancer',
    nounPlural: 'freelancers',
    pain: 'SaaS subscriptions stack faster than client revenue grows, especially when each project needs its own tool sprawl.',
    fit: 'One $499 purchase covers six AI agents; deploy whichever the project needs and bill the time, not the tools.',
    priorityProducts: ['sales-agent', 'social-media-agent', 'ugc-agent', 'ads-agent'],
    pricingContext: '$1,500–$5,000 per project setup + $497–$997/mo retainer for ongoing operation.',
    example: 'Setting up an automated outbound campaign for a B2B SaaS client and handing off the system, plus a monthly retainer to operate it.',
  },
  {
    slug: 'indie-devs',
    label: 'Indie Developers',
    noun: 'indie developer',
    nounPlural: 'indie developers',
    pain: 'You\'d rather extend code than learn a new no-code builder, and platform lock-in makes a launched product harder to migrate later.',
    fit: 'Full source on private GitHub, BSL 1.1 license, deploy targets you already use (Docker, Cloud Run, GCE) — no platform between you and your stack.',
    priorityProducts: ['ugc-agent', 'seo-agent', 'sales-agent', 'social-media-agent'],
    pricingContext: '$29–$99/mo SaaS or $5–25K per custom-build engagement.',
    example: 'Shipping an MCP integration as a $29/mo SaaS to ops teams in a vertical you know.',
  },
  {
    slug: 'ecommerce-founders',
    label: 'Ecommerce Founders',
    noun: 'ecommerce founder',
    nounPlural: 'ecommerce founders',
    pain: 'Per-call voice fees, per-task automation costs, and multi-tool subscriptions compress margin on every order — especially in high-volume DTC.',
    fit: 'Voice agent at $0.02/min raw infra (vs platform $0.05–$0.10/min markup); social and ads agents you own and tune to your brand without per-seat fees.',
    priorityProducts: ['cod-confirm', 'social-media-agent', 'ads-agent', 'seo-agent'],
    pricingContext: '$0.02/min voice infra cost vs platform markup; ads/social retainers replaced by owned stacks.',
    example: 'Running outbound COD-confirm calls in Hindi/Tamil at ₹3–5/call instead of ₹15–25/call through a SaaS voice platform.',
  },
  {
    slug: 'b2b-saas',
    label: 'B2B SaaS Operators',
    noun: 'B2B SaaS operator',
    nounPlural: 'B2B SaaS operators',
    pain: 'Outbound, social, and customer-ops tooling are recurring line items competing with engineering hires for budget.',
    fit: 'Self-hosted agents your team owns and extends; outbound, social, ads, and MCP integrations as code you commit alongside the rest of the product.',
    priorityProducts: ['sales-agent', 'ugc-agent', 'social-media-agent', 'ads-agent'],
    pricingContext: 'Replace $30–$100K/yr in stacked SaaS with one-time $499 + your existing dev infrastructure.',
    example: 'Running outbound to a target ICP from inside the same monorepo as the product, with the same deploy pipeline and observability.',
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return competitors.find((c) => c.slug === slug);
}

export function getPersona(slug: string): Persona | undefined {
  return personas.find((p) => p.slug === slug);
}
