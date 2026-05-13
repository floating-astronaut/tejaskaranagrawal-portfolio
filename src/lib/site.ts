// Static portfolio metadata for tejaskaranagrawal.com.

export const site = {
  name: 'Tejas Karan Agrawal',
  parent: 'Glitch Executor Labs',
  domain: 'tejaskaranagrawal.com',
  url: 'https://tejaskaranagrawal.com',
  contactEmail: 'tejaskagrawalgwl@gmail.com',
  discordInvite: 'https://discord.gg/HBZFKMts',
  tagline: 'DTC growth operator, performance marketer, and AI systems builder.',
  description:
    'Portfolio of Tejas Karan Agrawal: DTC growth, performance marketing, Shopify commerce, AI agents, SEO, content strategy, automation, education, and selected proof-of-work projects.',
  ogImage: '/assets/brand/og-image.png',
  twitter: '@glitchexecutor',
  linkedin: 'https://www.linkedin.com/in/tejas-karan-agrawal',
  locale: 'en-US',
} as const;

export const nav = [
  { href: '/#proof', label: 'Proof' },
  { href: '/#experience', label: 'Experience' },
  { href: '/#education', label: 'Education' },
  { href: '/#systems', label: 'Systems' },
  { href: '/#contact', label: 'Contact' },
] as const;

export const legalNav = [
  { href: '/#contact', label: 'Contact' },
] as const;

export const aiClients = {
  list: ['Codex', 'Claude Code', 'Cursor', 'OpenClaw'] as const,
  chips: 'Codex · Claude Code · Cursor · OpenClaw',
  inline: 'Codex, Claude Code, Cursor, OpenClaw',
  inlineShort: 'Codex, Claude Code, Cursor',
} as const;

export const announcementBar = {
  enabled: false,
  message: '',
  ctaLabel: '',
  ctaHref: '/',
  promoCode: null as string | null,
} as const;

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
  dataStorageRegion: 'United States / Canada',
  paymentProcessor: 'N/A',
  currency: 'USD',
  taxIdLabel: '',
  taxId: '',
} as const;

export const legalEntityIN = legalEntityGL;
export const legalEntity = legalEntityGL;
export type NavItem = (typeof nav)[number];
