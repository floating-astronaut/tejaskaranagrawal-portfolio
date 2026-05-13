#!/usr/bin/env -S node --experimental-strip-types
/**
 * Fetches portrait images from Unsplash for each team member in
 * src/data/team.ts and writes them to public/team/<slug>.jpg.
 *
 * Re-run to refresh portraits. Commits the resulting JPGs so they're
 * served as static assets — Unsplash CDN URLs aren't stable.
 *
 * Usage:
 *   pnpm run team:fetch                              # uses configured key
 *   UNSPLASH_ACCESS_KEY=... pnpm run team:fetch      # override
 *
 * Auto-loads UNSPLASH_ACCESS_KEY from ~/ayurpet-hydrogen/.env when not
 * already set in env (that's where the key already lives on this server).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { team } from '../src/data/team.ts';

const OUT_DIR = path.join(process.cwd(), 'public', 'team');

// Search queries per slug — keep them generic enough to get diverse
// results, specific enough to match the persona's framing on /team.
// Tuning these is fine; what matters is that the chosen photo looks
// like a credible person, not a stock-headshot meme.
const QUERIES: Record<string, string> = {
  arjun: 'south asian man portrait professional founder',
  priya: 'south asian woman portrait professional smiling',
};

function loadKey(): string {
  if (process.env.UNSPLASH_ACCESS_KEY) return process.env.UNSPLASH_ACCESS_KEY;
  const envPath = path.join(os.homedir(), 'ayurpet-hydrogen', '.env');
  if (!fs.existsSync(envPath)) throw new Error('UNSPLASH_ACCESS_KEY not set and no fallback env file.');
  const raw = fs.readFileSync(envPath, 'utf8');
  const m = raw.match(/^UNSPLASH_ACCESS_KEY=(.+)$/m);
  if (!m) throw new Error('UNSPLASH_ACCESS_KEY missing from fallback env file.');
  return m[1].replace(/^['"]|['"]$/g, '').trim();
}

interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: { raw: string; full: string; regular: string };
  user: { name: string; username: string; links: { html: string } };
}

async function searchOne(key: string, query: string): Promise<UnsplashPhoto> {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'portrait');
  url.searchParams.set('content_filter', 'high');
  url.searchParams.set('per_page', '10');
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } });
  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { results: UnsplashPhoto[] };
  if (!data.results.length) throw new Error(`No results for query: ${query}`);
  // Pick the first result — deterministic per query phrasing.
  return data.results[0];
}

async function downloadJpg(srcUrl: string, dest: string): Promise<void> {
  // Request a 800x1000 portrait crop directly from the Unsplash image CDN
  // so we don't end up with multi-MB originals.
  const u = new URL(srcUrl);
  u.searchParams.set('w', '800');
  u.searchParams.set('h', '1000');
  u.searchParams.set('fit', 'crop');
  u.searchParams.set('crop', 'faces,center');
  u.searchParams.set('q', '85');
  u.searchParams.set('fm', 'jpg');
  const res = await fetch(u);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function pingDownloadEndpoint(key: string, photoId: string): Promise<void> {
  // Required by Unsplash's API Guidelines when a photo is downloaded.
  await fetch(`https://api.unsplash.com/photos/${photoId}/download`, {
    headers: { Authorization: `Client-ID ${key}` },
  }).catch(() => { /* fire-and-forget */ });
}

async function main(): Promise<void> {
  const key = loadKey();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const attributions: Array<{ slug: string; photoId: string; photographer: string; profile: string; query: string }> = [];

  for (const member of team) {
    const query = QUERIES[member.slug];
    if (!query) {
      console.warn(`  ? ${member.slug}: no query configured; skipping`);
      continue;
    }
    process.stdout.write(`  · ${member.slug.padEnd(12)} "${query}" → `);
    const photo = await searchOne(key, query);
    const dest = path.join(OUT_DIR, `${member.slug}.jpg`);
    await downloadJpg(photo.urls.regular, dest);
    await pingDownloadEndpoint(key, photo.id);
    const stat = fs.statSync(dest);
    console.log(`${(stat.size / 1024).toFixed(0)}KB  photoId=${photo.id}  by ${photo.user.name}`);
    attributions.push({
      slug: member.slug,
      photoId: photo.id,
      photographer: photo.user.name,
      profile: photo.user.links.html,
      query,
    });
  }

  // Write attribution manifest. We display it on the /team page footer.
  fs.writeFileSync(
    path.join(OUT_DIR, 'attribution.json'),
    JSON.stringify({ source: 'Unsplash', license: 'Unsplash License (free for commercial + editorial use, attribution appreciated)', credits: attributions }, null, 2),
  );

  console.log(`\nWrote ${attributions.length} portraits to ${OUT_DIR}/`);
  console.log('Update src/data/team.ts unsplashPhotoId + unsplashPhotographer fields if you want them surfaced inline.');
}

main().catch((e) => { console.error('\nFailed:', e instanceof Error ? e.message : e); process.exit(1); });
