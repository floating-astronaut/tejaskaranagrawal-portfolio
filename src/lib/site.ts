// Static portfolio metadata for tejaskaranagrawal.com.

export const site = {
  name: 'Tejas Karan Agrawal',
  parent: 'Glitch Executor Labs',
  domain: 'tejaskaranagrawal.com',
  url: 'https://tejaskaranagrawal.com',
  contactEmail: 'support@glitchexecutor.com',
  discordInvite: 'https://discord.gg/HBZFKMts',
  tagline: 'AI agents, commerce systems, and server-first growth infrastructure.',
  description:
    'Personal portfolio of Tejas Karan Agrawal: AI agents, Shopify commerce systems, ads automation, Cloudflare infrastructure, server operations, and proof-of-work projects from Glitch Executor Labs.',
  ogImage: '/assets/brand/og-image.png',
  twitter: '@glitchexecutor',
  locale: 'en-US',
} as const;

export const nav = [
  { href: '/#work', label: 'Work' },
  { href: '/#systems', label: 'Systems' },
  { href: '/#stack', label: 'Stack' },
  { href: '/#writing', label: 'Writing' },
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
