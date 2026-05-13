// Author / team data — drives /team/[slug] pages, BlogPosting author
// schema, and the Person/Organization sameAs graph.
//
// Personas
// --------
// These are the canonical bylines used across the Glitch Grow blog and
// catalog. They represent the editorial team that ships the catalog
// rather than identifying any single real individual. Avatars come
// from Unsplash (stock portraits) under the Unsplash License with
// photographer attribution surfaced on the /team page and recorded in
// public/team/attribution.json.
//
// To refresh portraits, edit the QUERIES map in
// scripts/fetch-team-photos.ts and re-run `pnpm run team:fetch`.

export interface TeamMember {
  slug: string;
  name: string;
  /** Job title shown on the team card. */
  role: string;
  /** One-line headline for the team card. */
  headline: string;
  /** Full bio for the /team/[slug] page (1–3 paragraphs). */
  bio: string[];
  /** Areas the persona speaks on / is an authoritative source for. */
  expertise: string[];
  /** Profile URLs — used in Person.sameAs JSON-LD. For editorial personas
   *  we point only to the org-level Codeberg account, not to individual
   *  social profiles, to avoid implying any specific identity. */
  sameAs: string[];
  /** Local path to the avatar — populated by scripts/fetch-team-photos.ts. */
  avatar: string;
  /** Alt text describing the avatar. */
  avatarAlt: string;
  /** Unsplash photo ID used for the avatar (recorded for attribution). */
  unsplashPhotoId?: string;
  /** Unsplash photographer name (attribution). */
  unsplashPhotographer?: string;
}

export const team: TeamMember[] = [
  {
    slug: 'arjun',
    name: 'Arjun Mehta',
    role: 'Lead Engineer · Glitch Grow Catalog',
    headline: 'Writes on production AI-agent infrastructure, agency unit economics, and the buy-vs-build math.',
    bio: [
      'Arjun is the engineering byline behind the Glitch Grow catalog — the productized output of work shipped for D2C, agency, and B2B SaaS clients. The catalog covers ads, sales, social, voice, SEO, and UGC creative as production agents an AI coding agent (Claude Code, Codex, Cursor) can install end-to-end via AGENTS.md.',
      'The framing: most agencies stack $5,000+/yr of recurring SaaS to deliver an outcome that fits into one purchase. The AI Digital Marketing Stack is the bet that source-available agent boilerplates beat managed-platform subscriptions for agencies reselling AI services to clients.',
      'Areas Arjun writes on: production agent patterns (LangGraph state machines, HITL reconcilers, multi-tenant token vaults), MCP server design, and the unit economics of agency-scale AI services.',
    ],
    expertise: [
      'Production AI agents (LangGraph, MCP)',
      'Agency unit economics',
      'Multi-tenant SaaS architecture',
      'BSL 1.1 licensing for resale',
      'AI-coding-agent driven deployment (AGENTS.md)',
    ],
    sameAs: [
      'https://codeberg.org/glitch-executor',
    ],
    avatar: '/team/arjun.jpg',
    avatarAlt: 'Editorial portrait used for the Arjun Mehta byline',
    unsplashPhotoId: 'qF9e4EHGCVQ',
    unsplashPhotographer: 'litoon dev',
  },
  {
    slug: 'priya',
    name: 'Priya Iyer',
    role: 'India Operations · Glitch Grow',
    headline: 'Writes on Indian D2C, COD-confirm voice operations, and the Razorpay rail.',
    bio: [
      'Priya is the byline for the India side of the Glitch Grow catalog — Razorpay merchant flow, INR pricing, GST compliance, and the legal entity (Bani Thani) that fronts the India rail.',
      'Day-to-day: onboarding for Indian D2C buyers, running the COD-confirm voice agent operations playbook with Shopify merchants, coordinating the Indian-language testing matrix across Sarvam (Hindi, Punjabi, Tamil, Telugu, Bengali, Marathi, Gujarati).',
      'Areas Priya writes on: Indian D2C economics, COD-confirm operations, voice-agent compliance under TRAI / DLT, and Razorpay onboarding gotchas for new merchants.',
    ],
    expertise: [
      'Indian D2C ops (Shopify + COD)',
      'Razorpay merchant onboarding',
      'TRAI / DLT compliance for voice agents',
      'Indian-language QA (Sarvam STT)',
      'GST compliance for SaaS',
    ],
    sameAs: [
      'https://codeberg.org/glitch-executor',
    ],
    avatar: '/team/priya.jpg',
    avatarAlt: 'Editorial portrait used for the Priya Iyer byline',
    unsplashPhotoId: '0zJO10J6oVo',
    unsplashPhotographer: 'Usman Yousaf',
  },
];

export function getTeamMember(slug: string): TeamMember | undefined {
  return team.find((m) => m.slug === slug);
}
