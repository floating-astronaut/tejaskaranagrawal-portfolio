#!/usr/bin/env -S node --experimental-strip-types
/**
 * Generate blog cover images.
 *
 * Output: src/content/blog/<slug>-cover.png. Defaults to OpenRouter's
 * GPT Image 2 model (openai/gpt-5.4-image-2) since the OpenAI direct
 * API is gated by a billing hard limit. Pass --openai to force the
 * direct OpenAI path once the limit is bumped.
 *
 * Style: conceptual editorial illustrations matching the catalog's
 * dark-mode + electric-purple brand identity.
 *
 * After running, manually add to each blog MDX frontmatter:
 *   cover: ./<slug>-cover.png
 *   coverAlt: "<one-line description>"
 *
 * Usage:
 *   pnpm run blog:covers                                # OpenRouter, all 4
 *   pnpm run blog:covers buy-once-ai-agent-stack       # single post
 *   pnpm run blog:covers --openai                       # direct OpenAI path
 *   BLOG_COVER_MODEL=google/gemini-3-pro-image-preview pnpm run blog:covers
 */

import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog');
const QUALITY = (process.env.BLOG_COVER_QUALITY ?? 'medium') as 'low' | 'medium' | 'high';
const SIZE = '1536x1024';
const SLUG_FILTER = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const USE_OPENAI = process.argv.includes('--openai');
const OPENROUTER_MODEL = process.env.BLOG_COVER_MODEL ?? 'openai/gpt-5.4-image-2';

// Per-post conceptual motif. Each tightly scoped so the image is
// recognizable on a thumbnail rail.
interface CoverSpec {
  slug: string;
  title: string;
  motif: string;
  altText: string;
}

const COVERS: CoverSpec[] = [
  {
    slug: 'buy-once-ai-agent-stack',
    title: 'Buy-once AI agent stacks vs the Zapier + Make + Vapi + Smartlead bill',
    motif: 'a tall, leaning stack of pastel SaaS receipt slips precariously balanced on the left side, paired with a single solid coin-shaped token on the right at the same visual weight, suggesting the math equivalence of stacked subscriptions to one purchase',
    altText: 'A leaning stack of SaaS receipt slips balanced against a single one-time-purchase token',
  },
  {
    slug: 'production-mcp-server-patterns',
    title: 'Production MCP server patterns — what makes integrations resellable',
    motif: 'a glowing isometric token vault at the center with five distinct outbound connector lines fanning out to differently shaped endpoint nodes, each labeled subtly with a small platform glyph, suggesting multi-tenant credentials feeding multiple integration servers',
    altText: 'An isometric token vault with five outbound connectors feeding distinct integration endpoints',
  },
  {
    slug: 'voice-ai-cod-confirm-india',
    title: 'Voice AI for Indian COD-confirmation at $0.02/min raw infra cost',
    motif: 'a soft audio waveform flowing horizontally across the canvas, intersecting with subtle stylized Devanagari and Tamil script glyphs that fade in and out of the waveform crests, with a small phone iconography in the lower right, suggesting Indian-language voice processing',
    altText: 'Audio waveform threading through Devanagari and Tamil script characters with a phone icon',
  },
  {
    slug: 'client-side-pixel-loss',
    title: 'Why client-side pixels lose 40–60% of conversions',
    motif: 'a dense grid of small bright pixel-dots in the upper left transitioning into sparse, scattered, fading dots in the lower right, with thin dashed lines suggesting unreliable data paths between them — a visual metaphor for tracking data loss',
    altText: 'A grid of bright pixels dissolving into scattered fading dots, representing conversion tracking loss',
  },
  {
    slug: 'managed-ai-ads-service-1497',
    title: 'How agencies actually run a $1,497/mo managed AI ads service',
    motif: 'a central orchestrator node with five outgoing channels for Meta, Google, TikTok, Amazon, and LinkedIn ad platforms, surrounded by a soft circular ring suggesting an agent loop, with a small Discord-style chat-bubble icon hovering near one channel to indicate HITL approval',
    altText: 'An orchestrator node feeding five ad-platform channels with a HITL approval bubble',
  },
  {
    slug: 'hitl-outbound-loop',
    title: 'The HITL outbound loop: discover, draft, Discord-approve, send, learn',
    motif: 'five connected stage-icons arranged in a horizontal loop: magnifying glass (discover), person-silhouette (enrich), envelope-with-pen (draft), chat-bubble with checkmark (approve), and an arrow returning with a small brain glyph (learn) — visual emphasizes a closed loop',
    altText: 'Five connected stages of an outbound loop with a return arrow back to discovery',
  },
  {
    slug: 'shopify-saas-33-scopes-gdpr',
    title: 'Shipping a Shopify App — 33 scopes that pass review',
    motif: 'a stylized vertical Shopify-bag silhouette in the foreground containing a grid of 33 small dots arranged inside (some lit, some unlit suggesting accepted vs rejected scopes), with three small webhook arrows exiting from the side labeled implicitly as GDPR endpoints',
    altText: 'A Shopify-bag silhouette holding 33 scope dots with three GDPR webhook arrows',
  },
  {
    slug: 'ai-ugc-video-pipeline',
    title: 'AI UGC video pipeline — brief to 5 hook variants in one pass',
    motif: 'a vertical phone-frame silhouette in the center playing a stylized talking-head illustration, surrounded by five smaller phone-frame variants fanning out in a semi-circle, each showing a different hook variant — conveys multi-variant generation from a single source',
    altText: 'A central talking-head video frame with five smaller variant frames fanning out',
  },
];

interface ImageResult {
  data: Array<{ b64_json?: string; url?: string }>;
}

async function generateOpenAI(prompt: string): Promise<Buffer> {
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

// OpenRouter image-generation path. Image-capable models on OpenRouter
// return the image inside the chat completion response as either a
// data URL in message.content or an `images` array of `{image_url}`
// objects depending on the upstream provider. We handle both shapes.
async function generateOpenRouter(prompt: string): Promise<Buffer> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      'HTTP-Referer': 'https://grow.glitchexecutor.com',
      'X-Title': 'Glitch Grow Blog Cover Generator',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      modalities: ['image', 'text'],
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type: string; image_url?: { url: string }; text?: string }>;
        images?: Array<{ type: string; image_url?: { url: string } | string }>;
      };
    }>;
  };
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new Error('openrouter: no message in response');

  // Strategy 1: message.images[].image_url
  const images = msg.images ?? [];
  for (const img of images) {
    const url = typeof img.image_url === 'string' ? img.image_url : img.image_url?.url;
    if (url) return dataUrlToBuffer(url);
  }

  // Strategy 2: message.content is an array with image_url parts
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part.type === 'image_url' && part.image_url?.url) {
        return dataUrlToBuffer(part.image_url.url);
      }
    }
  }

  // Strategy 3: message.content is a string containing a data URL
  if (typeof msg.content === 'string') {
    const m = msg.content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);
    if (m) return dataUrlToBuffer(m[0]);
  }

  throw new Error(`openrouter: image not found in response — got ${JSON.stringify(msg).slice(0, 200)}`);
}

async function dataUrlToBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',');
    return Buffer.from(url.slice(comma + 1), 'base64');
  }
  // Real http(s) URL — fetch it.
  const r = await fetch(url);
  if (!r.ok) throw new Error(`image fetch ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function generate(prompt: string): Promise<Buffer> {
  if (USE_OPENAI) return generateOpenAI(prompt);
  return generateOpenRouter(prompt);
}

function buildPrompt(title: string, motif: string): string {
  return [
    'Editorial blog cover illustration at 1536x1024 (3:2 landscape). Conceptual, premium, suitable for a developer-tools / SaaS company technical blog.',
    '',
    'Background: very dark charcoal (#0A0A0F) base with a soft radial gradient toward a saturated electric purple-blue glow positioned subtly in one corner — not center. Mostly negative space.',
    '',
    `Subject (centered, occupies ~60% of the canvas): ${motif}. Render as a clean flat-vector illustration with thin precise strokes, soft inner glow on focal elements, and an electric purple-blue accent color (#7c3aed-ish) for highlights. No skeuomorphism. No photographic elements. No photorealistic faces or hands. No human figures.`,
    '',
    'Treatment: high contrast, generous negative space, no text labels visible in the illustration itself (text will be overlaid by the page layout). One quiet single-pixel grid hint as background texture, very faint.',
    '',
    'Style references: Stripe Press cover art, Linear changelog illustrations, the Vercel blog, the GitHub blog. Calm, technical, intentional. Definitely not infographic, definitely not stock-photo.',
  ].join('\n');
}

async function main(): Promise<void> {
  const targets = SLUG_FILTER.length
    ? COVERS.filter((c) => SLUG_FILTER.includes(c.slug))
    : COVERS;

  if (targets.length === 0) {
    console.error('No matching covers. Available slugs:', COVERS.map((c) => c.slug).join(', '));
    process.exit(1);
  }

  const provider = USE_OPENAI ? 'openai/gpt-image-1' : `openrouter/${OPENROUTER_MODEL}`;
  console.log(`Generating ${targets.length} cover(s) via ${provider}\n`);

  for (const c of targets) {
    const out = path.join(BLOG_DIR, `${c.slug}-cover.png`);
    process.stdout.write(`  · ${c.slug.padEnd(34)} → `);
    try {
      const png = await generate(buildPrompt(c.title, c.motif));
      fs.writeFileSync(out, png);
      console.log(`${(png.length / 1024).toFixed(0)}KB`);
    } catch (e) {
      console.log(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\nAdd to each blog MDX frontmatter:`);
  for (const c of targets) {
    console.log(`  ${c.slug}.mdx:`);
    console.log(`    cover: ./${c.slug}-cover.png`);
    console.log(`    coverAlt: "${c.altText}"`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
