#!/usr/bin/env -S node --experimental-strip-types
/**
 * Google Search Console health check.
 *
 * Reads a service-account JSON key (path via GOOGLE_SA_PATH env, default
 * `/home/support/glitch-grow-public/credentials/google-sa.json`), mints a
 * webmasters-scoped token, and reports:
 *
 * - Sitemap registration status (errors, warnings, isPending)
 * - URL inspection on a curated set of strategic pages (homepage,
 *   founder-stack, key alternatives/vs/glossary/blog/tools entries)
 * - 7-day search analytics summary (top pages by impressions)
 *
 * The SA must be added as a delegated user on the Search Console
 * property — siteFullUser permission lets it submit sitemaps too.
 *
 * Usage:
 *   pnpm run gsc:check          # health check only
 *   pnpm run gsc:check --submit # also re-submit the sitemap
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

const SITE = 'https://tejaskaranagrawal.com/';
const SITEMAP_URL = 'https://tejaskaranagrawal.com/sitemap-index.xml';
// Default SA key path. The key was relocated when the SEO agent repo
// was split into -pkg (saleable) + -private (brand-side). Falls back to
// the legacy location if the new one isn't present.
const KEY_PATH = process.env.GOOGLE_SA_PATH
  ?? (fs.existsSync('/home/support/glitch-grow-ai-seo-agent-private/credentials/google-sa.json')
      ? '/home/support/glitch-grow-ai-seo-agent-private/credentials/google-sa.json'
      : '/home/support/glitch-grow-public/credentials/google-sa.json');
const SUBMIT = process.argv.includes('--submit');
const SCOPE = SUBMIT
  ? 'https://www.googleapis.com/auth/webmasters'
  : 'https://www.googleapis.com/auth/webmasters.readonly';

const STRATEGIC_URLS = [
  'https://tejaskaranagrawal.com/',
];

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

interface SAKey {
  client_email: string;
  private_key: string;
  project_id: string;
}

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

async function main(): Promise<void> {
  if (!fs.existsSync(KEY_PATH)) {
    console.error(`SA key not found at ${KEY_PATH}. Set GOOGLE_SA_PATH env or create the key.`);
    process.exit(1);
  }
  const sa = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8')) as SAKey;
  console.log(`SA:        ${sa.client_email}`);
  console.log(`Property:  ${SITE}`);
  console.log(`Scope:     ${SCOPE}\n`);

  const token = await getAccessToken(sa);
  const headers = { authorization: `Bearer ${token}` };

  // Optional sitemap submission (idempotent).
  if (SUBMIT) {
    const submitUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;
    const r = await fetch(submitUrl, { method: 'PUT', headers });
    console.log(`Sitemap submit: ${r.status} ${r.statusText}\n`);
  }

  // Sitemap status.
  const smRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps`, { headers });
  const sm = await smRes.json() as { sitemap?: Array<{ path: string; lastSubmitted: string; errors: string; warnings: string; isPending: boolean }> };
  console.log('--- Sitemaps ---');
  for (const s of sm.sitemap ?? []) {
    console.log(`  ${s.path}`);
    console.log(`    submitted: ${s.lastSubmitted}  pending: ${s.isPending}  errors: ${s.errors}  warnings: ${s.warnings}`);
  }
  if (!sm.sitemap?.length) console.log('  (no sitemaps registered — run with --submit to fix)');

  // URL inspection — reports indexing status per URL.
  console.log('\n--- URL inspection ---');
  const verdictPad = 'PARTIAL'.length;
  for (const url of STRATEGIC_URLS) {
    try {
      const r = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
      });
      if (!r.ok) {
        console.log(`  ✗ ${r.status.toString().padEnd(verdictPad)} ${url}`);
        continue;
      }
      const d = await r.json() as { inspectionResult?: { indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string } } };
      const idx = d.inspectionResult?.indexStatusResult ?? {};
      const verdict = (idx.verdict ?? '?').padEnd(verdictPad);
      const coverage = (idx.coverageState ?? '?').padEnd(35);
      const last = idx.lastCrawlTime?.slice(0, 10) ?? 'never';
      console.log(`  ${verdict} ${coverage} ${last}  ${url}`);
    } catch (e) {
      console.log(`  ! ${url}  ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 7-day search analytics summary — top pages by impressions.
  const today = new Date();
  const start = new Date(today.getTime() - 7 * 86400_000).toISOString().slice(0, 10);
  const end = today.toISOString().slice(0, 10);
  const saRes = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions: ['page'], rowLimit: 15 }),
    },
  );
  const saData = await saRes.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; position: number }> };
  console.log(`\n--- Search analytics ${start} → ${end} ---`);
  if (!saData.rows?.length) {
    console.log('  (no impressions yet)');
  } else {
    console.log('   imps  clicks  pos  page');
    for (const r of saData.rows) {
      console.log(`  ${String(r.impressions).padStart(5)} ${String(r.clicks).padStart(6)}  ${r.position.toFixed(1).padStart(4)}  ${r.keys[0]}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
