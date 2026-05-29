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
  github: 'https://github.com/floating-astronaut',
  gitlab: 'https://gitlab.com/floating-astronaut',
  locale: 'en-US',
} as const;

export const nav = [
  { href: '/#arc', label: 'The arc' },
  { href: '/#systems', label: 'What I shipped' },
  { href: '/#experience', label: 'Experience' },
  { href: '/#education', label: 'Education' },
  { href: '/#contact', label: 'Contact' },
] as const;

export const legalNav = [
  { href: '/#contact', label: 'Contact' },
] as const;

export const socialLinks = [
  { name: 'Facebook', handle: 'afloatingastronaut', href: 'https://www.facebook.com/afloatingastronaut', icon: '/icons/social/facebook.svg' },
  { name: 'Instagram', handle: 'a.floating.astronaut', href: 'https://www.instagram.com/a.floating.astronaut/', icon: '/icons/social/instagram.svg' },
  { name: 'TikTok', handle: '@a.floating.astronaut', href: 'https://www.tiktok.com/@a.floating.astronaut', icon: '/icons/social/tiktok.svg' },
  { name: 'LinkedIn', handle: 'tejas-karan-agrawal', href: 'https://www.linkedin.com/in/tejas-karan-agrawal/', icon: '/icons/social/linkedin.svg' },
  { name: 'Reddit', handle: 'Awkward-Prize-66', href: 'https://www.reddit.com/user/Awkward-Prize-66/', icon: '/icons/social/reddit.svg' },
  { name: 'Snapchat', handle: 'monster_staw', href: 'https://www.snapchat.com/add/monster_staw', icon: '/icons/social/snapchat.svg' },
  { name: 'WhatsApp', handle: '+91 90399 99585', href: 'https://wa.me/919039999585', icon: '/icons/social/whatsapp.svg' },
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
