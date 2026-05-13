/**
 * Cloudflare Pages Function — POST /api/razorpay/verify-payment
 *
 * Second leg of the Razorpay Standard Checkout flow. Receives the
 * razorpay_order_id + razorpay_payment_id + razorpay_signature posted
 * back from the Razorpay modal handler, verifies the signature
 * server-side using HMAC-SHA256 against KEY_SECRET, and reports back
 * whether the payment is genuine.
 *
 * The signature MUST be verified server-side. A successful Razorpay
 * modal does not, by itself, prove anything — the signature is the
 * cryptographic evidence Razorpay actually charged the buyer.
 *
 * Algorithm per Razorpay docs:
 *   expected = HMAC-SHA256(`${order_id}|${payment_id}`, KEY_SECRET)
 *   verify(expected_hex === razorpay_signature)
 *
 * Built using the Web Crypto API (SubtleCrypto.sign with HMAC) so this
 * runs natively in the Cloudflare Workers runtime — no third-party
 * crypto SDK needed.
 *
 * On success, this endpoint returns { ok: true, paymentId, sku }; the
 * client is responsible for redirecting to /thanks with those query
 * params. Fulfillment (private GitHub repo invite, Discord welcome
 * email, etc.) is handled by the existing capture-lead pipe + manual
 * follow-up; the Razorpay verify endpoint deliberately stays narrow to
 * the signature-check responsibility.
 *
 * Required env:
 *   RAZORPAY_KEY_SECRET  — paired with the KEY_ID used at create-order
 */

export interface Env {
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_KEY_ID?: string;
  // TikTok server-side Purchase event (mirror of capture-lead.ts forwarder).
  TIKTOK_CAPI_TOKEN?: string;
  TIKTOK_PIXEL_ID?: string;
  TIKTOK_TEST_EVENT_CODE?: string;
  // Fulfillment dispatch — verify-payment fires a request to
  // /api/fulfill/grant-access with the shared FULFILL_SECRET so the
  // central pipeline can run GitHub invite + welcome email + Sheet log.
  FULFILL_SECRET?: string;
  /** Optional override for the fulfillment endpoint URL.
   *  Defaults to same-origin /api/fulfill/grant-access. Useful in dev. */
  FULFILL_URL?: string;
}

interface VerifyRequest {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  /** SKU echoed from the create-order response, used for fulfillment routing. */
  sku?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.RAZORPAY_KEY_SECRET) {
    return json({ ok: false, error: 'razorpay-not-configured' }, 500);
  }

  let body: VerifyRequest;
  try {
    body = (await request.json()) as VerifyRequest;
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400);
  }

  const orderId = (body.razorpay_order_id ?? '').trim();
  const paymentId = (body.razorpay_payment_id ?? '').trim();
  const signature = (body.razorpay_signature ?? '').trim();
  const sku = (body.sku ?? '').trim().toUpperCase();

  if (!orderId || !paymentId || !signature) {
    return json({ ok: false, error: 'missing-fields' }, 400);
  }

  const expected = await hmacSha256Hex(`${orderId}|${paymentId}`, env.RAZORPAY_KEY_SECRET);

  // Constant-time-ish comparison — we're comparing fixed-length 64-char
  // hex strings, so the timing variance from a length mismatch is moot,
  // but use a manual equal-length compare anyway to avoid reading
  // beyond the shorter string.
  if (expected.length !== signature.length || !timingSafeEqual(expected, signature)) {
    // Don't leak HMAC details. Caller treats 400 as "do NOT mark as paid."
    return json({ ok: false, error: 'signature-mismatch' }, 400);
  }

  // ── Server-side TikTok Purchase event ──────────────────────────────
  // Fires alongside the browser-side ttq.track('Purchase') on /thanks.
  // Both share event_id = paymentId so TikTok dedupes them. Wrapped so
  // any failure here can never block the verify-success response — the
  // payment is real and the buyer must always see /thanks.
  forwardTikTokPurchase({ paymentId, orderId, sku, request, env }).catch(() => { /* swallow */ });

  // ── Fulfillment dispatch ───────────────────────────────────────────
  // Fire-and-forget POST to /api/fulfill/grant-access. Buyer GitHub
  // username + email are pulled from the Razorpay order.notes /
  // payment record. Same-origin fetch so the request stays inside the
  // Cloudflare Pages runtime.
  dispatchFulfillment({ paymentId, orderId, sku, request, env }).catch(() => { /* swallow */ });

  return json({
    ok: true,
    verified: true,
    paymentId,
    orderId,
    sku,
  });
};

async function dispatchFulfillment(args: {
  paymentId: string;
  orderId: string;
  sku: string;
  request: Request;
  env: Env;
}): Promise<void> {
  const { paymentId, orderId, sku, request, env } = args;
  if (!env.FULFILL_SECRET) return;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return;

  // Pull amount + email + github_username from Razorpay so we don't have
  // to trust client-supplied data on the fulfill endpoint.
  let amount = 0;
  let currency = 'INR';
  let email = '';
  let githubUsername: string | undefined;
  let buyerName: string | undefined;
  try {
    const auth = 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
    const r = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: auth },
    });
    if (r.ok) {
      const p = (await r.json()) as {
        amount?: number;
        currency?: string;
        email?: string;
        notes?: Record<string, string>;
        contact?: string;
      };
      amount = (p.amount ?? 0) / 100;
      currency = p.currency ?? 'INR';
      email = p.email ?? '';
      githubUsername = p.notes?.github_username;
    }
    // Also pull order.notes in case checkout-time notes weren't carried
    // forward onto the payment object.
    if (!githubUsername) {
      const r2 = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: { Authorization: auth },
      });
      if (r2.ok) {
        const o = (await r2.json()) as { notes?: Record<string, string> };
        githubUsername = o.notes?.github_username;
      }
    }
  } catch { /* keep defaults; fulfill will email-ask for github username */ }

  const url = env.FULFILL_URL || new URL('/api/fulfill/grant-access', request.url).toString();
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fulfill-secret': env.FULFILL_SECRET,
    },
    body: JSON.stringify({
      provider: 'razorpay',
      payment_id: paymentId,
      sku,
      email,
      github_username: githubUsername,
      name: buyerName,
      amount,
      currency,
    }),
  });
}

/**
 * Server-side fire to the TikTok Events API for the Purchase event.
 * Looks up the Razorpay order to get the actual paid amount (in case
 * a promo code reduced it), so the conversion value reported to TikTok
 * is the real amount captured — not the catalog list price.
 *
 * No-op when TIKTOK_CAPI_TOKEN / TIKTOK_PIXEL_ID aren't configured.
 */
async function forwardTikTokPurchase(args: {
  paymentId: string;
  orderId: string;
  sku: string;
  request: Request;
  env: Env;
}): Promise<void> {
  const { paymentId, orderId, sku, request, env } = args;
  if (!env.TIKTOK_CAPI_TOKEN || !env.TIKTOK_PIXEL_ID) return;

  // Pull the order amount + email from Razorpay so we report what was
  // actually charged. Auth uses HTTP Basic with KEY_ID:KEY_SECRET.
  let amount = 0;
  let currency = 'INR';
  let email: string | undefined;
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    try {
      const auth = 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
      const r = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { Authorization: auth },
      });
      if (r.ok) {
        const p = (await r.json()) as { amount?: number; currency?: string; email?: string };
        amount = (p.amount ?? 0) / 100;
        currency = p.currency ?? 'INR';
        email = p.email;
      }
    } catch { /* keep defaults */ }
  }

  // Hash email if available (TikTok requires SHA-256 for PII).
  const user: Record<string, unknown> = {};
  if (email) user.email = await sha256Hex(email.toLowerCase().trim());
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
  const ua = request.headers.get('user-agent') || '';
  if (ip) user.ip = ip;
  if (ua) user.user_agent = ua;

  const body: Record<string, unknown> = {
    event_source: 'web',
    event_source_id: env.TIKTOK_PIXEL_ID,
    partner_name: 'Glitch Grow',
    data: [{
      event: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: paymentId, // dedupe with browser-side fire on /thanks
      user,
      page: { url: 'https://grow.glitchexecutor.com/thanks' },
      properties: {
        content_id: sku || 'unknown',
        content_name: sku || 'unknown',
        content_type: 'product',
        currency,
        value: amount,
        order_id: orderId,
      },
    }],
  };
  if (env.TIKTOK_TEST_EVENT_CODE) body.test_event_code = env.TIKTOK_TEST_EVENT_CODE;

  await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': env.TIKTOK_CAPI_TOKEN,
    },
    body: JSON.stringify(body),
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
