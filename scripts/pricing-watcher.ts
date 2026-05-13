#!/usr/bin/env -S node --experimental-strip-types
/**
 * Competitor pricing watcher — fetches each competitor's published
 * pricing page, computes a content hash, and alerts when it changes
 * from the previous run.
 *
 * Why this matters: AI-search citations on /alternatives and /vs pages
 * depend on factual accuracy. When Zapier raises Pro from $19.99 → $24.99,
 * our pages need an update or LLMs will start citing the cheaper page
 * elsewhere. This script tells you which pages need attention.
 *
 * Stores prior hashes in scripts/pricing-snapshots/<competitor-slug>.json.
 * On change, the new snapshot replaces the old, and the script exits 1
 * (or with --no-fail, exits 0 but logs the diff).
 *
 * Usage:
 *   pnpm run pricing:watch              # check all
 *   pnpm run pricing:watch --no-fail    # report diffs but don't fail
 *
 * Designed to run weekly via GitHub Actions cron.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { competitors } from '../src/data/pseo-matrix.ts';

const SNAPSHOT_DIR = path.join(process.cwd(), 'scripts', 'pricing-snapshots');
const NO_FAIL = process.argv.includes('--no-fail');

// Some competitors don't expose a stable, scrapable pricing page via their
// homepage URL. Override with the actual pricing URL where it differs.
const PRICING_URL: Record<string, string> = {
  zapier: 'https://zapier.com/pricing',
  make: 'https://www.make.com/en/pricing',
  n8n: 'https://n8n.io/pricing/',
  'lindy-ai': 'https://www.lindy.ai/pricing',
  'relevance-ai': 'https://relevance.ai/pricing',
  gumloop: 'https://www.gumloop.com/pricing',
  'stack-ai': 'https://www.stack-ai.com/pricing',
  vapi: 'https://vapi.ai/pricing',
  retell: 'https://www.retellai.com/pricing',
  manychat: 'https://manychat.com/pricing',
  smartlead: 'https://www.smartlead.ai/pricing',
  instantly: 'https://instantly.ai/pricing',
};

// Strip volatile content (timestamps, CSRF tokens, hashed asset URLs) so
// the hash captures pricing changes, not boilerplate noise.
function normalize(html: string): string {
  return html
    // Remove all <script> and <style> blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Strip hashed asset URLs (cache busters change every deploy)
    .replace(/-[a-f0-9]{6,}\./g, '-HASH.')
    // Strip nonces
    .replace(/nonce="[^"]*"/g, '')
    // Strip CSRF / session tokens
    .replace(/csrf[^"]*"/gi, 'csrf"')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    // Strip everything that's not text we care about
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Snapshot {
  url: string;
  fetchedAt: string;
  hash: string;
  /** A short excerpt around price-shaped tokens — gives a human something
   *  to look at on diff. */
  priceExcerpts: string[];
}

const PRICE_RE = /\$\s?\d+(?:\.\d+)?(?:\s?[-/]\s?(?:mo|user|seat|month|year|operation|task))?/gi;

function priceExcerpts(text: string, max = 30): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(PRICE_RE)) {
    found.add(m[0].replace(/\s+/g, ' ').trim());
    if (found.size >= max) break;
  }
  return Array.from(found).sort();
}

async function fetchSnapshot(slug: string, url: string): Promise<Snapshot> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GlitchGrow-PricingWatcher/1.0; +https://grow.glitchexecutor.com)',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const html = await res.text();
  const text = normalize(html);
  const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
  return {
    url,
    fetchedAt: new Date().toISOString(),
    hash,
    priceExcerpts: priceExcerpts(text),
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const changes: Array<{ slug: string; before?: Snapshot; after: Snapshot }> = [];
  const errors: Array<{ slug: string; error: string }> = [];

  for (const c of competitors) {
    const url = PRICING_URL[c.slug];
    if (!url) {
      console.log(`  - ${c.slug.padEnd(14)} no pricing URL configured`);
      continue;
    }
    const file = path.join(SNAPSHOT_DIR, `${c.slug}.json`);
    let before: Snapshot | undefined;
    if (fs.existsSync(file)) {
      try { before = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* ignore */ }
    }
    try {
      const after = await fetchSnapshot(c.slug, url);
      if (!before) {
        console.log(`  + ${c.slug.padEnd(14)} new snapshot (hash=${after.hash})`);
      } else if (before.hash !== after.hash) {
        console.log(`  ! ${c.slug.padEnd(14)} CHANGED (${before.hash} → ${after.hash})`);
        changes.push({ slug: c.slug, before, after });
      } else {
        console.log(`  · ${c.slug.padEnd(14)} unchanged (${after.hash})`);
      }
      fs.writeFileSync(file, JSON.stringify(after, null, 2));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ✗ ${c.slug.padEnd(14)} ${msg}`);
      errors.push({ slug: c.slug, error: msg });
    }
  }

  if (changes.length) {
    console.log('\n— Detected pricing-page changes —');
    for (const ch of changes) {
      console.log(`\n  ${ch.slug} (${ch.after.url}):`);
      const beforeSet = new Set(ch.before?.priceExcerpts ?? []);
      const afterSet = new Set(ch.after.priceExcerpts);
      const added = [...afterSet].filter((x) => !beforeSet.has(x));
      const removed = [...beforeSet].filter((x) => !afterSet.has(x));
      if (added.length) console.log(`    + ${added.slice(0, 10).join(', ')}`);
      if (removed.length) console.log(`    - ${removed.slice(0, 10).join(', ')}`);
      if (!added.length && !removed.length) {
        console.log('    (price tokens unchanged — copy or layout shift)');
      }
      console.log(`    Update: src/content/alternatives/${ch.slug}.mdx + src/content/vs/${ch.slug}.mdx + src/data/pseo-matrix.ts`);
    }
  }

  console.log(`\nDone. ${changes.length} changes, ${errors.length} errors.`);
  if (changes.length && !NO_FAIL) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
