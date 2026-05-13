#!/usr/bin/env -S node --experimental-strip-types
/**
 * Generates per-agent OG images via OpenAI gpt-image-1.
 *
 * Output: public/og/agents/<slug>.png at 1536×1024 (closest landscape
 * size gpt-image-1 ships; Twitter/Facebook scale this fine to OG's
 * 1200×630 aspect).
 *
 * Style: minimal dark-mode product card with the agent name, one-line
 * positioning, and a single iconographic motif appropriate to the
 * agent's category. Consistent visual identity across the catalog.
 *
 * Cost: ~$0.17/image at landscape high quality × 6 images ≈ $1.02 total.
 * Drop quality to "medium" for ~$0.04/image if you want a cheaper test.
 *
 * Usage:
 *   pnpm run og:generate              # all 6 agents
 *   pnpm run og:generate ads-agent    # one agent
 *   OG_QUALITY=medium pnpm run og:generate   # cheaper
 */

import fs from 'node:fs';
import path from 'node:path';
import { products } from '../src/lib/products.ts';

const OUT_DIR = path.join(process.cwd(), 'public', 'og', 'agents');
const QUALITY = (process.env.OG_QUALITY ?? 'high') as 'low' | 'medium' | 'high';
const SIZE = '1536x1024';
const SLUG_FILTER = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// Visual motif per agent — keeps the catalog visually consistent while
// giving each card a distinct primary symbol.
const MOTIF: Record<string, string> = {
  'ugc-agent':          'a stylized film clapboard intersecting with a vertical phone frame containing concentric audio waveform rings, suggesting AI-generated UGC video ads',
  'ads-agent':          'an abstract orbital diagram with three platform symbols (a stylized M, G, and triangle for Meta/Google/TikTok), suggesting multi-platform ad orchestration',
  'sales-agent':        'a stylized envelope morphing into a chat bubble, suggesting outbound email with conversational drafting',
  'social-media-agent': 'a layered stack of geometric shapes representing multiple brands and platforms, suggesting multi-brand social ops',
  'cod-confirm':        'an abstract waveform fading into a phone-call iconography, suggesting voice AI with sub-second latency',
  'seo-agent':          'a clean modular grid evoking the Shopify admin UI, suggesting a multi-tenant SaaS architecture',
};

interface ImageResult {
  data: Array<{ b64_json?: string; url?: string }>;
}

async function generate(prompt: string): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: SIZE,
      quality: QUALITY,
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`openai image ${res.status}: ${await res.text()}`);
  const data = await res.json() as ImageResult;
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('no b64_json in response');
  return Buffer.from(b64, 'base64');
}

function buildPrompt(name: string, oneLiner: string, motif: string): string {
  return [
    'Minimal modern dark-mode social card design at 1536x1024 aspect ratio.',
    'Background: very dark charcoal (#0A0A0F) with a subtle radial gradient toward a saturated electric purple-blue glow in one corner.',
    'Foreground: clean editorial typography, large display text, generous negative space.',
    'Layout: left two-thirds is the headline + subtitle, right one-third is a single subtle iconographic illustration.',
    '',
    `Headline (display, white, large): "${name}"`,
    `Subtitle (muted gray, smaller): "${oneLiner}"`,
    `Small monospace tag in top-left corner: "Glitch Grow"`,
    `Small monospace tag in bottom-right corner: "grow.glitchexecutor.com"`,
    '',
    `Iconographic motif on the right: ${motif}. Render it as a clean flat-vector illustration with thin strokes, soft glow, electric purple-blue accent color, no skeuomorphism.`,
    '',
    'No photographic elements. No photorealistic faces or hands. Geometric, brand-consistent, suitable for a developer-tools / SaaS company social card.',
    'Style references: Linear.app brand, Vercel.com OG images, Stripe Press visual identity. Calm, premium, technical.',
  ].join('\n');
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const targets = SLUG_FILTER.length
    ? products.filter((p) => SLUG_FILTER.includes(p.slug))
    : products;

  if (targets.length === 0) {
    console.error('No matching agents. Available slugs:', products.map((p) => p.slug).join(', '));
    process.exit(1);
  }

  console.log(`Generating ${targets.length} OG image(s) at ${SIZE} (quality=${QUALITY})\n`);

  for (const p of targets) {
    const motif = MOTIF[p.slug];
    if (!motif) {
      console.warn(`  ? ${p.slug}: no motif configured; skipping`);
      continue;
    }
    const prompt = buildPrompt(p.name, p.oneLiner, motif);
    const out = path.join(OUT_DIR, `${p.slug}.png`);
    process.stdout.write(`  · ${p.slug.padEnd(22)} → `);
    try {
      const png = await generate(prompt);
      fs.writeFileSync(out, png);
      console.log(`${(png.length / 1024).toFixed(0)}KB  ${out.replace(process.cwd() + '/', '')}`);
    } catch (e) {
      console.log(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\nDone. Reference in <Base ogSlug="agents/<slug>" /> via the existing api/og fallback,`);
  console.log(`or set Product.ogImage manually if you wire a per-product override.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
