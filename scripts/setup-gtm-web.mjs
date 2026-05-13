#!/usr/bin/env node
/**
 * Idempotent provisioning script for the GTM web container variables,
 * triggers, and GA4 event tags that route the dataLayer schema in
 * src/lib/data-layer.ts to GA4 (and, once the server container exists,
 * to its endpoint).
 *
 * Auth: Google service account at GLITCH_GROW_SA_PATH (default
 * /home/support/glitch-grow-public/credentials/google-sa.json).
 * The SA already has tagmanager.edit.containers + publish scopes
 * granted by the user (verified in Phase 1 discovery).
 *
 * Idempotent: every create call is preceded by a list-and-match-by-name
 * call so re-running this script doesn't duplicate resources. Updates
 * existing resources when the spec drifts.
 *
 * Constants below are pinned by Phase 1 discovery:
 *   ACCOUNT_ID    6351188996  (Glitch Executor)
 *   CONTAINER_ID  250149518   (publicId GTM-TMXWNNLJ)
 *   GA4_MEASUREMENT_ID  G-TK7ZYVLJRQ
 *
 * Run:
 *   node scripts/setup-gtm-web.mjs
 *   node scripts/setup-gtm-web.mjs --publish      # bumps version + publishes
 */

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const SA_PATH = process.env.GLITCH_GROW_SA_PATH || '/home/support/glitch-grow-public/credentials/google-sa.json';
const ACCOUNT_ID = process.env.GTM_ACCOUNT_ID || '6351188996';
const CONTAINER_ID = process.env.GTM_CONTAINER_ID || '250149518';
const GA4_MEASUREMENT_ID = process.env.PUBLIC_GA_MEASUREMENT_ID || 'G-TK7ZYVLJRQ';
const WORKSPACE_NAME = process.env.GTM_WORKSPACE_NAME || 'GlitchGrow Funnel';
const PUBLISH = process.argv.includes('--publish');

const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));

// ── OAuth: SA → access token ───────────────────────────────────────────
async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/tagmanager.edit.containers https://www.googleapis.com/auth/tagmanager.edit.containerversions https://www.googleapis.com/auth/tagmanager.publish https://www.googleapis.com/auth/tagmanager.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signed = `${header}.${claim}`;
  const sig = b64uBuf(createSign('RSA-SHA256').update(signed).sign(sa.private_key));
  const jwt = `${signed}.${sig}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token: ${JSON.stringify(j)}`);
  return j.access_token;
}
function b64u(s) { return Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function b64uBuf(b) { return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }

// ── REST helper ────────────────────────────────────────────────────────
let token;
async function api(method, path, body, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await fetch(`https://tagmanager.googleapis.com/tagmanager/v2/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = text; }
    if (r.ok) return parsed;
    // GTM enforces a tight per-minute write quota. Back off + retry on 429.
    if (r.status === 429 && attempt < retries) {
      const delay = 30000 + attempt * 15000;
      console.log(`  (quota — sleeping ${delay / 1000}s)`);
      await new Promise((res) => setTimeout(res, delay));
      continue;
    }
    throw new Error(`${method} ${path} → ${r.status} ${text.slice(0, 300)}`);
  }
  throw new Error('unreachable');
}

// Per-call write throttle so we stay well under the 25 writes/min limit.
const WRITE_THROTTLE_MS = 1500;
async function throttle() { return new Promise((res) => setTimeout(res, WRITE_THROTTLE_MS)); }

// ── Workspace bootstrap ────────────────────────────────────────────────
async function ensureWorkspace() {
  const wsList = await api('GET', `accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/workspaces`);
  const existing = (wsList.workspace || []).find((w) => w.name === WORKSPACE_NAME);
  if (existing) {
    console.log(`workspace exists: ${existing.workspaceId} (${existing.name})`);
    return existing;
  }
  // Reuse Default Workspace if present so we don't pile up workspaces.
  const defWs = (wsList.workspace || []).find((w) => w.name === 'Default Workspace');
  if (defWs) {
    console.log(`using Default Workspace: ${defWs.workspaceId}`);
    return defWs;
  }
  const created = await api('POST', `accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/workspaces`, {
    name: WORKSPACE_NAME, description: 'Auto-managed by setup-gtm-web.mjs',
  });
  console.log(`workspace created: ${created.workspaceId}`);
  return created;
}

// ── Idempotent variable / trigger / tag upsert ─────────────────────────
function paths(ws) {
  const base = `accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/workspaces/${ws.workspaceId}`;
  return {
    variables: `${base}/variables`,
    triggers: `${base}/triggers`,
    tags: `${base}/tags`,
    versions: `${base}:create_version`,
  };
}

async function upsertResource(listPath, resource) {
  // Determine the resource-id field name from the listPath suffix:
  //   .../variables  -> variableId
  //   .../triggers   -> triggerId
  //   .../tags       -> tagId
  const resourceKind = listPath.split('/').pop().slice(0, -1); // strip trailing s
  const idField = `${resourceKind}Id`;
  const list = await api('GET', listPath);
  const items = list[resourceKind] || [];
  const existing = items.find((x) => x.name === resource.name);
  if (existing) {
    const upd = await api('PUT', `${listPath}/${existing[idField]}`,
      { ...existing, ...resource });
    console.log(`  = ${resource.name} (updated)`);
    await throttle();
    return upd;
  }
  const created = await api('POST', listPath, resource);
  console.log(`  + ${resource.name} (created)`);
  await throttle();
  return created;
}

// ── Variable definitions ───────────────────────────────────────────────
function dlVar(name, key, type = 'v') {
  return {
    name,
    type: 'v', // dataLayer variable
    parameter: [
      { type: 'integer', key: 'dataLayerVersion', value: '2' },
      { type: 'boolean', key: 'setDefaultValue', value: 'false' },
      { type: 'template', key: 'name', value: key },
    ],
  };
}

const VARIABLES = [
  dlVar('DLV - event_id', 'event_id'),
  dlVar('DLV - transaction_id', 'transaction_id'),
  dlVar('DLV - value', 'value'),
  dlVar('DLV - currency', 'currency'),
  dlVar('DLV - items', 'items'),
  dlVar('DLV - email', 'email'),
  dlVar('DLV - coupon', 'coupon'),
  dlVar('DLV - page_path', 'page_path'),
];

// ── Triggers ───────────────────────────────────────────────────────────
function customEventTrigger(name, eventName) {
  return {
    name,
    type: 'customEvent',
    customEventFilter: [{
      type: 'equals',
      parameter: [
        { type: 'template', key: 'arg0', value: '{{_event}}' },
        { type: 'template', key: 'arg1', value: eventName },
      ],
    }],
  };
}

const TRIGGERS = [
  customEventTrigger('CE - view_item',       'view_item'),
  customEventTrigger('CE - add_to_cart',     'add_to_cart'),
  customEventTrigger('CE - begin_checkout',  'begin_checkout'),
  customEventTrigger('CE - purchase',        'purchase'),
  customEventTrigger('CE - generate_lead',   'generate_lead'),
];

// ── GA4 event tags ─────────────────────────────────────────────────────
function ga4EventTag(name, eventName, triggerId, extraParams = []) {
  return {
    name,
    type: 'gaawe', // GA4 event tag
    parameter: [
      { type: 'template', key: 'measurementIdOverride', value: GA4_MEASUREMENT_ID },
      { type: 'template', key: 'eventName', value: eventName },
      {
        type: 'list',
        key: 'eventParameters',
        list: [
          { type: 'map', map: [
            { type: 'template', key: 'name', value: 'event_id' },
            { type: 'template', key: 'value', value: '{{DLV - event_id}}' },
          ]},
          { type: 'map', map: [
            { type: 'template', key: 'name', value: 'value' },
            { type: 'template', key: 'value', value: '{{DLV - value}}' },
          ]},
          { type: 'map', map: [
            { type: 'template', key: 'name', value: 'currency' },
            { type: 'template', key: 'value', value: '{{DLV - currency}}' },
          ]},
          ...extraParams,
        ],
      },
    ],
    firingTriggerId: [triggerId],
  };
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  token = await getToken();
  const ws = await ensureWorkspace();
  const p = paths(ws);

  console.log('\n== variables ==');
  for (const v of VARIABLES) await upsertResource(p.variables, v);

  console.log('\n== triggers ==');
  const triggerByName = {};
  for (const t of TRIGGERS) {
    const r = await upsertResource(p.triggers, t);
    triggerByName[t.name] = r.triggerId;
  }

  console.log('\n== GA4 event tags ==');
  const tagSpecs = [
    ga4EventTag('GA4 - view_item',       'view_item',       triggerByName['CE - view_item']),
    ga4EventTag('GA4 - add_to_cart',     'add_to_cart',     triggerByName['CE - add_to_cart']),
    ga4EventTag('GA4 - begin_checkout',  'begin_checkout',  triggerByName['CE - begin_checkout']),
    ga4EventTag('GA4 - purchase',        'purchase',        triggerByName['CE - purchase'], [
      { type: 'map', map: [
        { type: 'template', key: 'name', value: 'transaction_id' },
        { type: 'template', key: 'value', value: '{{DLV - transaction_id}}' },
      ]},
      { type: 'map', map: [
        { type: 'template', key: 'name', value: 'coupon' },
        { type: 'template', key: 'value', value: '{{DLV - coupon}}' },
      ]},
    ]),
    ga4EventTag('GA4 - generate_lead',   'generate_lead',   triggerByName['CE - generate_lead']),
  ];
  for (const tag of tagSpecs) await upsertResource(p.tags, tag);

  if (PUBLISH) {
    console.log('\n== publish ==');
    const v = await api('POST', p.versions, { name: `Auto ${new Date().toISOString().slice(0, 10)}`, notes: 'setup-gtm-web.mjs' });
    const ver = v.containerVersion?.containerVersionId || v.compilerError ? null : null;
    if (v.compilerError) {
      console.error('compiler error:', JSON.stringify(v.compilerError));
      process.exit(2);
    }
    if (v.containerVersion?.containerVersionId) {
      const id = v.containerVersion.containerVersionId;
      console.log(`  version created: ${id}`);
      await api('POST', `accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/versions/${id}:publish`);
      console.log('  published.');
    }
  } else {
    console.log('\n(skipping publish — pass --publish to bump version + publish)');
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
