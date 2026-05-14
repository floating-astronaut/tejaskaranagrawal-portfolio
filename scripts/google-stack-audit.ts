#!/usr/bin/env -S node --experimental-strip-types
/**
 * Google stack audit for tejaskaranagrawal.com.
 *
 * Uses the shared service account
 *   glitch-vertex-ai@capable-boulder-487806-j0.iam.gserviceaccount.com
 *
 * and probes:
 *   - Google Search Console (sitemap + URL inspection on homepage)
 *   - GA4 Admin API (account/property listing) + Data API (last 7d sessions)
 *   - Google Tag Manager API (account/container listing)
 *
 * Each section is independent — if the SA isn't granted access on a
 * surface, that section reports the missing permission instead of
 * aborting the whole run. Use the output as a punch list.
 *
 * Usage:  node --experimental-strip-types scripts/google-stack-audit.ts
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

const KEY_PATH = process.env.GOOGLE_SA_PATH
  ?? '/home/support/glitch-grow-ai-seo-agent-private/credentials/google-sa.json';

const DOMAIN = 'tejaskaranagrawal.com';
// URL-prefix property is what's actually verified for this domain
// (the sc-domain property exists but the SA is granted only on the
// URL-prefix one — confirmed via /v3/sites listing).
const GSC_SITE = `https://${DOMAIN}/`;
const SITEMAP_URL = `https://${DOMAIN}/sitemap-index.xml`;
const HOMEPAGE = `https://${DOMAIN}/`;
// Correct measurement ID for the portfolio site (per GTM container
// GTM-TMXWNNLJ tag "GA4 · Portfolio"). Analytics.astro previously
// defaulted to G-BSCM9RJE2B which belongs to a different stream.
const GA_MEASUREMENT_ID = 'G-4FTFP3NEQV';
const GTM_CONTAINER_PUBLIC_ID = 'GTM-TMXWNNLJ';

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/tagmanager.readonly',
].join(' ');

interface SAKey { client_email: string; private_key: string; project_id: string; }

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken(sa: SAKey, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
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

function ok(s: string): void { console.log(`  \x1b[32m✓\x1b[0m ${s}`); }
function bad(s: string): void { console.log(`  \x1b[31m✗\x1b[0m ${s}`); }
function info(s: string): void { console.log(`    ${s}`); }
function section(title: string): void { console.log(`\n=== ${title} ===`); }

// ─────────────────────────────────────────────────────────────────────
async function auditGSC(token: string): Promise<void> {
  section('Google Search Console');
  const headers = { authorization: `Bearer ${token}` };

  // List sites
  const sitesRes = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', { headers });
  if (!sitesRes.ok) { bad(`Cannot list sites: ${sitesRes.status}`); info(await sitesRes.text()); return; }
  const sites = (await sitesRes.json()) as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> };
  const match = sites.siteEntry?.find(s => s.siteUrl === GSC_SITE);
  if (!match) {
    bad(`SA not granted on ${GSC_SITE}`);
    info(`Visible properties: ${(sites.siteEntry ?? []).map(s => s.siteUrl).join(', ') || '(none)'}`);
    info(`Fix: Search Console → Settings → Users and permissions → Add the SA email as Full user.`);
    return;
  }
  ok(`Property ${GSC_SITE} (permission: ${match.permissionLevel})`);

  // Sitemap status
  const smRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/sitemaps`, { headers });
  if (smRes.ok) {
    const sm = (await smRes.json()) as { sitemap?: Array<{ path: string; lastSubmitted: string; errors: string; warnings: string; isPending: boolean }> };
    if (!sm.sitemap?.length) bad('No sitemap registered'); else
      for (const s of sm.sitemap) ok(`Sitemap ${s.path} — submitted ${s.lastSubmitted?.slice(0, 10)}, errors=${s.errors}, warnings=${s.warnings}, pending=${s.isPending}`);
  }

  // URL inspection on homepage
  const insRes = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: HOMEPAGE, siteUrl: GSC_SITE }),
  });
  if (insRes.ok) {
    const ins = (await insRes.json()) as { inspectionResult?: { indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string; robotsTxtState?: string } } };
    const r = ins.inspectionResult?.indexStatusResult ?? {};
    ok(`Homepage verdict=${r.verdict ?? '?'}  coverage=${r.coverageState ?? '?'}  lastCrawl=${r.lastCrawlTime?.slice(0, 10) ?? 'never'}  robots=${r.robotsTxtState ?? '?'}`);
  } else {
    bad(`URL inspection failed: ${insRes.status}`);
  }

  // 7d search analytics
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);
  const saRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ startDate: since, endDate: until, dimensions: ['query'], rowLimit: 5 }),
  });
  if (saRes.ok) {
    const sa = (await saRes.json()) as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
    if (!sa.rows?.length) info('7d search analytics: 0 rows (site is new / not indexed yet — expected).');
    else for (const row of sa.rows) info(`7d top query: "${row.keys[0]}" — ${row.clicks} clicks / ${row.impressions} impr / pos ${row.position.toFixed(1)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
async function auditGA4(saEmail: string): Promise<void> {
  section('Google Analytics 4');
  const token = await getAccessToken(saKey, 'https://www.googleapis.com/auth/analytics.readonly');
  const headers = { authorization: `Bearer ${token}` };

  // List accounts
  const accRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', { headers });
  if (!accRes.ok) {
    bad(`Cannot list GA4 accounts: ${accRes.status}`);
    info(await accRes.text());
    info(`Fix: GA4 → Admin → Account Access Management → Add ${saEmail} as Viewer.`);
    return;
  }
  const acc = (await accRes.json()) as { accountSummaries?: Array<{ name: string; displayName: string; propertySummaries?: Array<{ property: string; displayName: string }> }> };
  const summaries = acc.accountSummaries ?? [];
  if (!summaries.length) { bad('No GA4 accounts visible to SA'); info(`Grant ${saEmail} Viewer access on the GA4 account.`); return; }

  // Find a property linked to our measurement ID
  let foundProp: { property: string; displayName: string } | undefined;
  for (const a of summaries) {
    for (const p of (a.propertySummaries ?? [])) {
      const streamsRes = await fetch(`https://analyticsadmin.googleapis.com/v1beta/${p.property}/dataStreams`, { headers });
      if (!streamsRes.ok) continue;
      const streams = (await streamsRes.json()) as { dataStreams?: Array<{ webStreamData?: { measurementId?: string; defaultUri?: string } }> };
      const hit = (streams.dataStreams ?? []).find(s => s.webStreamData?.measurementId === GA_MEASUREMENT_ID || s.webStreamData?.defaultUri?.includes(DOMAIN));
      if (hit) { foundProp = p; break; }
    }
    if (foundProp) break;
  }

  if (!foundProp) {
    bad(`No GA4 property found for ${GA_MEASUREMENT_ID} / ${DOMAIN} among ${summaries.length} accessible accounts`);
    info(`Accessible properties:`);
    for (const a of summaries) for (const p of (a.propertySummaries ?? [])) info(`  ${p.property} — ${p.displayName}`);
    return;
  }
  ok(`Property ${foundProp.property} — "${foundProp.displayName}"`);

  const propId = foundProp.property.split('/')[1];
  const dataRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propId}:runReport`, {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'eventCount' }],
    }),
  });
  if (dataRes.ok) {
    const d = (await dataRes.json()) as { rows?: Array<{ metricValues: Array<{ value: string }> }> };
    const row = d.rows?.[0]?.metricValues;
    if (row) ok(`7d: ${row[0].value} sessions, ${row[1].value} users, ${row[2].value} events`);
    else info('7d: 0 sessions (site is new / pixel not firing yet).');
  } else {
    bad(`Data API failed: ${dataRes.status} ${await dataRes.text()}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
async function auditGTM(saEmail: string): Promise<void> {
  section('Google Tag Manager');
  const token = await getAccessToken(saKey, 'https://www.googleapis.com/auth/tagmanager.readonly');
  const headers = { authorization: `Bearer ${token}` };

  const accRes = await fetch('https://tagmanager.googleapis.com/tagmanager/v2/accounts', { headers });
  if (!accRes.ok) {
    bad(`Cannot list GTM accounts: ${accRes.status}`);
    info(await accRes.text());
    info(`Fix: GTM → Admin → User Management → Add ${saEmail} with Read permission on the container.`);
    return;
  }
  const acc = (await accRes.json()) as { account?: Array<{ accountId: string; name: string; path: string }> };
  if (!acc.account?.length) { bad('No GTM accounts visible to SA'); return; }
  ok(`${acc.account.length} GTM account(s) visible`);

  let foundContainer: { path: string; publicId: string; name: string; usageContext?: string[] } | undefined;
  for (const a of acc.account) {
    const cRes = await fetch(`https://tagmanager.googleapis.com/tagmanager/v2/${a.path}/containers`, { headers });
    if (!cRes.ok) continue;
    const c = (await cRes.json()) as { container?: Array<{ path: string; publicId: string; name: string; usageContext?: string[] }> };
    for (const ctr of (c.container ?? [])) {
      if (ctr.publicId === GTM_CONTAINER_PUBLIC_ID) { foundContainer = ctr; break; }
      info(`  visible: ${ctr.publicId} — ${ctr.name} (${(ctr.usageContext ?? []).join(',')})`);
    }
    if (foundContainer) break;
  }
  if (!foundContainer) {
    bad(`Container ${GTM_CONTAINER_PUBLIC_ID} not visible to SA`);
    return;
  }
  ok(`Container ${foundContainer.publicId} — "${foundContainer.name}"`);

  // List tags / triggers / live version snapshot
  const verRes = await fetch(`https://tagmanager.googleapis.com/tagmanager/v2/${foundContainer.path}/versions:live`, { headers });
  if (verRes.ok) {
    const v = (await verRes.json()) as { tag?: Array<{ name: string; type: string }>; trigger?: Array<{ name: string; type: string }>; variable?: Array<{ name: string }> };
    ok(`Live version: ${v.tag?.length ?? 0} tags, ${v.trigger?.length ?? 0} triggers, ${v.variable?.length ?? 0} variables`);
    for (const t of (v.tag ?? []).slice(0, 8)) info(`  tag: ${t.name} (${t.type})`);
  } else {
    info(`(live version fetch returned ${verRes.status})`);
  }
}

// ─────────────────────────────────────────────────────────────────────
let saKey: SAKey;

async function main(): Promise<void> {
  if (!fs.existsSync(KEY_PATH)) {
    console.error(`SA key not found at ${KEY_PATH}. Set GOOGLE_SA_PATH or place the key there.`);
    process.exit(1);
  }
  saKey = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8')) as SAKey;
  console.log(`SA:        ${saKey.client_email}`);
  console.log(`Domain:    ${DOMAIN}`);
  console.log(`GA4:       ${GA_MEASUREMENT_ID}`);
  console.log(`GTM:       ${GTM_CONTAINER_PUBLIC_ID}`);

  const gscToken = await getAccessToken(saKey, 'https://www.googleapis.com/auth/webmasters.readonly');
  await auditGSC(gscToken).catch(e => bad(`GSC crashed: ${e.message ?? e}`));
  await auditGA4(saKey.client_email).catch(e => bad(`GA4 crashed: ${e.message ?? e}`));
  await auditGTM(saKey.client_email).catch(e => bad(`GTM crashed: ${e.message ?? e}`));
  console.log();
}

main().catch(e => { console.error(e); process.exit(1); });
