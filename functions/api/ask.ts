/**
 * Cloudflare Pages Function — POST /api/ask
 *
 * Proxies a user question to Vertex AI Search (Discovery Engine) and returns
 * a grounded generative answer with source citations.
 *
 * Datastore: projects/capable-boulder-487806-j0/.../dataStores/grow-site-ds
 * Engine:    grow-site-engine (Standard tier + LLM add-on)
 *
 * Env (wire in Cloudflare Pages dashboard → Settings → Environment variables):
 *   GCP_PROJECT_ID          — e.g. "capable-boulder-487806-j0"
 *   GCP_ENGINE_ID           — e.g. "grow-site-engine"
 *   GCP_SA_CLIENT_EMAIL     — service-account email (must have
 *                             roles/discoveryengine.viewer on the project)
 *   GCP_SA_PRIVATE_KEY      — PEM private key. Paste the literal value
 *                             of "private_key" from the SA JSON, including
 *                             the BEGIN/END lines. Newlines may be escaped
 *                             as "\n" — we'll normalize.
 *   TURNSTILE_SECRET        — optional; when set, requires a valid
 *                             Turnstile token to gate abuse.
 *
 * Body: { query: string, token?: string }
 * Returns: { answer: string, citations: { uri, title }[] }
 */

export interface Env {
  GCP_PROJECT_ID: string;
  GCP_ENGINE_ID: string;
  GCP_SA_CLIENT_EMAIL: string;
  GCP_SA_PRIVATE_KEY: string;
  TURNSTILE_SECRET?: string;
}

const LOCATION = 'global';
const COLLECTION = 'default_collection';
const SERVING_CONFIG = 'default_search';
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

// Module-scope token cache — survives across requests on the same worker isolate.
let cachedToken: { value: string; expiresAt: number } | null = null;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { query?: unknown; token?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad-request' }, 400);
  }

  const query = typeof body.query === 'string' ? body.query.trim().slice(0, 500) : '';
  if (!query) return json({ error: 'missing-query' }, 400);

  if (env.TURNSTILE_SECRET) {
    const token = typeof body.token === 'string' ? body.token : '';
    const ok = await verifyTurnstile(token, env.TURNSTILE_SECRET, clientIp(request));
    if (!ok) return json({ error: 'turnstile-failed' }, 403);
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(env);
  } catch (e) {
    return json({ error: 'auth-failed', detail: String(e) }, 500);
  }

  const url = `https://discoveryengine.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/locations/${LOCATION}/collections/${COLLECTION}/engines/${env.GCP_ENGINE_ID}/servingConfigs/${SERVING_CONFIG}:answer`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': env.GCP_PROJECT_ID,
    },
    body: JSON.stringify({
      query: { text: query },
      answerGenerationSpec: {
        ignoreAdversarialQuery: true,
        ignoreNonAnswerSeekingQuery: false,
        includeCitations: true,
        modelSpec: { modelVersion: 'stable' },
      },
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return json({ error: 'search-failed', status: resp.status, detail }, 502);
  }

  const data = (await resp.json()) as DiscoveryAnswerResponse;
  return json({
    answer: data.answer?.answerText ?? '',
    citations: extractCitations(data),
  });
};

interface DiscoveryAnswerResponse {
  answer?: {
    answerText?: string;
    references?: Array<{
      chunkInfo?: { documentMetadata?: { uri?: string; title?: string } };
      unstructuredDocumentInfo?: { uri?: string; title?: string };
    }>;
  };
}

function extractCitations(d: DiscoveryAnswerResponse): Array<{ uri: string; title: string }> {
  const refs = d.answer?.references ?? [];
  const seen = new Set<string>();
  const out: Array<{ uri: string; title: string }> = [];
  for (const r of refs) {
    const meta = r.chunkInfo?.documentMetadata ?? r.unstructuredDocumentInfo ?? {};
    const uri = meta.uri ?? '';
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    out.push({ uri, title: meta.title ?? uri });
  }
  return out;
}

async function getAccessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: env.GCP_SA_CLIENT_EMAIL,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const headerB64 = b64url(JSON.stringify(header));
  const claimB64 = b64url(JSON.stringify(claim));
  const signingInput = `${headerB64}.${claimB64}`;
  const sig = await signRS256(signingInput, env.GCP_SA_PRIVATE_KEY);
  const jwt = `${signingInput}.${sig}`;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!r.ok) throw new Error(`oauth ${r.status}: ${await r.text()}`);
  const data = (await r.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

async function signRS256(input: string, pemKey: string): Promise<string> {
  const pem = pemKey.replace(/\\n/g, '\n');
  const pkcs8 = pemToArrayBuffer(pem);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  return b64urlBytes(new Uint8Array(sigBuf));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function b64url(s: string): string {
  return b64urlBytes(new TextEncoder().encode(s));
}

function b64urlBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body,
  });
  if (!r.ok) return false;
  const data = (await r.json()) as { success: boolean };
  return data.success === true;
}

function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? '';
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
