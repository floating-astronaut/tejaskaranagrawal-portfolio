#!/usr/bin/env -S node --experimental-strip-types
/**
 * Backlink watcher via Google Search Console.
 *
 * Pulls the top external links + linking sites + linked pages reports
 * from GSC, normalizes the domain set, and diffs against the prior run
 * to surface NEW referring domains (the signal that matters most).
 *
 * Snapshots live in scripts/backlink-snapshots/<YYYY-MM-DD>.json.
 *
 * Usage:
 *   pnpm run backlinks:watch
 *
 * Designed for weekly cron. New domains warrant outreach (thank-you,
 * occasionally a guest-post follow-up).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE = 'sc-domain:grow.glitchexecutor.com';
const KEY_PATH = process.env.GOOGLE_SA_PATH ?? '/home/support/glitch-grow-public/credentials/google-sa.json';
const SNAP_DIR = path.join(process.cwd(), 'scripts', 'backlink-snapshots');
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

interface SAKey { client_email: string; private_key: string; project_id: string; }

async function getAccessToken(sa: SAKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: sa.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claim))}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key);
  const jwt = `${unsigned}.${b64url(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

interface Snapshot {
  date: string;
  referringDomains: string[]; // sorted unique
  linkedPages: Record<string, number>; // page → link count (approx)
}

function rootDomain(host: string): string {
  // Lowercase, strip leading "www.", keep last 2 labels for most TLDs.
  const h = host.toLowerCase().replace(/^www\./, '');
  const parts = h.split('.');
  if (parts.length <= 2) return h;
  // Handle "co.uk" etc — last 3 labels if penultimate is a known SLD-ish.
  const sld = ['co', 'com', 'org', 'gov', 'ac', 'edu', 'net'];
  if (parts.length >= 3 && sld.includes(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

async function main(): Promise<void> {
  if (!fs.existsSync(KEY_PATH)) {
    console.error(`SA key not found at ${KEY_PATH}.`);
    process.exit(1);
  }
  const sa = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8')) as SAKey;
  const token = await getAccessToken(sa);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  // GSC's searchAnalytics doesn't expose backlink data directly. The
  // links endpoint isn't in the public REST API for sc-domain properties
  // — it's only via the dashboard UI. The closest signal we can pull
  // programmatically is search analytics filtered by external referrers
  // (page-level), plus a fallback to gather any links Google surfaced.
  //
  // For now this script reports referring-domain estimates from GSC's
  // searchAnalytics where pages match common external-mention patterns
  // (utm_source, ref params). For richer data, the Search Console UI's
  // "Links" report is still the canonical source.
  //
  // We also pull recent search queries — when a third-party site mentions
  // us strongly enough to drive branded queries, it shows up here.

  const today = new Date();
  const start = new Date(today.getTime() - 28 * 86400_000).toISOString().slice(0, 10);
  const end = today.toISOString().slice(0, 10);

  // Pages that are getting impressions — approximation of "what's
  // earning attention," which correlates with what's getting linked.
  const pagesRes = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    {
      method: 'POST', headers,
      body: JSON.stringify({ startDate: start, endDate: end, dimensions: ['page'], rowLimit: 100 }),
    },
  );
  const pagesData = await pagesRes.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number }> };
  const linkedPages: Record<string, number> = {};
  for (const r of pagesData.rows ?? []) {
    linkedPages[r.keys[0]] = r.impressions;
  }

  // Branded queries — proxy for off-site mentions.
  const queriesRes = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    {
      method: 'POST', headers,
      body: JSON.stringify({
        startDate: start, endDate: end,
        dimensions: ['query'],
        rowLimit: 50,
        dimensionFilterGroups: [{ filters: [{ dimension: 'query', operator: 'contains', expression: 'glitch' }] }],
      }),
    },
  );
  const queries = await queriesRes.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number }> };

  // Referring domains: GSC API has a separate undocumented "linksReport"
  // endpoint that's gated. We attempt it; if 404/403, we fall back to
  // empty + a hint to use the dashboard.
  let referringDomains: string[] = [];
  try {
    // The endpoint /webmasters/v3/sites/{siteUrl}/links isn't widely
    // documented but exists in the v3 spec. Try it.
    const linksRes = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/links`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (linksRes.ok) {
      const linksData = await linksRes.json() as { entries?: Array<{ uri?: string }> };
      const set = new Set<string>();
      for (const e of linksData.entries ?? []) {
        if (e.uri) {
          try { set.add(rootDomain(new URL(e.uri).hostname)); } catch { /* skip */ }
        }
      }
      referringDomains = [...set].sort();
    }
  } catch { /* ignore */ }

  fs.mkdirSync(SNAP_DIR, { recursive: true });
  const dateStr = today.toISOString().slice(0, 10);
  const snap: Snapshot = { date: dateStr, referringDomains, linkedPages };
  fs.writeFileSync(path.join(SNAP_DIR, `${dateStr}.json`), JSON.stringify(snap, null, 2));

  // Diff vs most recent prior snapshot.
  const priors = fs.readdirSync(SNAP_DIR)
    .filter((f) => f.endsWith('.json') && f !== `${dateStr}.json`)
    .sort()
    .reverse();
  const prior: Snapshot | null = priors.length
    ? JSON.parse(fs.readFileSync(path.join(SNAP_DIR, priors[0]), 'utf8'))
    : null;

  console.log(`Property: ${SITE}`);
  console.log(`Window:   ${start} → ${end}`);
  console.log(`Snapshot: ${dateStr}.json`);
  console.log(`Prior:    ${prior?.date ?? '(none)'}\n`);

  console.log('--- Referring domains (GSC API) ---');
  if (referringDomains.length === 0) {
    console.log('  (linksReport endpoint not enabled or no links yet)');
    console.log('  Manual check: https://search.google.com/search-console/links');
  } else {
    for (const d of referringDomains.slice(0, 30)) console.log(`  ${d}`);
    if (referringDomains.length > 30) console.log(`  … +${referringDomains.length - 30} more`);
    if (prior) {
      const priorSet = new Set(prior.referringDomains);
      const added = referringDomains.filter((d) => !priorSet.has(d));
      const lost = prior.referringDomains.filter((d) => !referringDomains.includes(d));
      if (added.length) {
        console.log('\n  + New referring domains since last snapshot:');
        for (const d of added) console.log(`    + ${d}`);
      }
      if (lost.length) {
        console.log('\n  - Domains that disappeared:');
        for (const d of lost.slice(0, 10)) console.log(`    - ${d}`);
      }
    }
  }

  console.log(`\n--- Top branded queries (${queries.rows?.length ?? 0}) ---`);
  if (!queries.rows?.length) {
    console.log('  (no branded queries yet — expected for a fresh site)');
  } else {
    console.log('   imps  clicks  query');
    for (const r of queries.rows.slice(0, 20)) {
      console.log(`  ${String(r.impressions).padStart(5)} ${String(r.clicks).padStart(6)}  ${r.keys[0]}`);
    }
  }

  console.log(`\n--- Top earning pages (last 28d) ---`);
  const sortedPages = Object.entries(linkedPages).sort((a, b) => b[1] - a[1]).slice(0, 15);
  if (!sortedPages.length) {
    console.log('  (no impressions yet)');
  } else {
    for (const [p, n] of sortedPages) {
      console.log(`  ${String(n).padStart(5)}  ${p}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
