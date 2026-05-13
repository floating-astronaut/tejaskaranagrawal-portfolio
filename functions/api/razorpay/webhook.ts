/**
 * Cloudflare Pages Function — POST /api/razorpay/webhook
 *
 * Server-side fulfillment safety net for the Razorpay rail.
 *
 * The primary path is `/api/razorpay/verify-payment`, which the browser
 * calls from RazorpayCheckout.astro's success handler after the modal
 * fires `payment.success`. That works for card / netbanking flows where
 * the modal stays focussed end-to-end — but fails reliably for UPI:
 * tapping the UPI app on mobile pulls focus away, and on return the
 * tab can be killed by the OS before the success callback fires. The
 * payment is captured on Razorpay's side; our backend never hears
 * about it; nobody gets fulfilled.
 *
 * This webhook is the redundant path. Razorpay POSTs the event server-
 * to-server within seconds of capture. We verify the HMAC signature,
 * extract the same fields verify-payment would have pulled, and call
 * the central /api/fulfill/grant-access — which is idempotent on
 * payment_id (UPSERT in Postgres + Forgejo collaborator-add returns
 * 204 if already a collaborator). So if both verify-payment AND this
 * webhook fire, the second one no-ops cleanly.
 *
 * Setup in Razorpay Dashboard (one-time):
 *   1. Settings → Webhooks → Add New Webhook
 *   2. URL:    https://grow.glitchexecutor.com/api/razorpay/webhook
 *   3. Secret: generate a long random string. Save it in Cloudflare
 *              Pages env as RAZORPAY_WEBHOOK_SECRET (Type: Secret).
 *   4. Active Events:
 *        ✓ payment.captured       (the canonical success signal)
 *        ✓ payment.failed         (optional — for ops visibility)
 *   5. Save. Razorpay sends a test event on save; this endpoint
 *      returns 200 with `{ ok: true, status: 'ignored' }` for any
 *      event we don't act on.
 *
 * Required env (Cloudflare Pages → Production):
 *   RAZORPAY_WEBHOOK_SECRET   the secret you set in Razorpay step 3
 *   FULFILL_SECRET            shared with /api/fulfill/grant-access
 *   RAZORPAY_KEY_ID           used to fetch order notes (sku +
 *   RAZORPAY_KEY_SECRET       github_username) the webhook payload omits
 */

export interface Env {
  RAZORPAY_WEBHOOK_SECRET?: string;
  FULFILL_SECRET?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  /** Optional override — defaults to same-origin /api/fulfill/grant-access. */
  FULFILL_URL?: string;
}

interface RazorpayPayment {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  email?: string;
  contact?: string;
  status?: string;
  notes?: Record<string, string>;
}

interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPayment };
    order?:   { entity?: { id?: string; notes?: Record<string, string> } };
  };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // ── 1. Signature gate ─────────────────────────────────────────────
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    // Endpoint exists but isn't configured → don't process anything.
    // 200 so Razorpay doesn't keep retrying; logs surface the gap.
    return json({ ok: false, error: 'webhook-not-configured' });
  }
  const sigHeader = request.headers.get('x-razorpay-signature') || '';
  // The body must be read EXACTLY once and used both for signature
  // verification and JSON parse — Razorpay signs the raw bytes,
  // so re-serialising via JSON.parse + JSON.stringify drifts.
  const rawBody = await request.text();
  const computed = await hmacSha256Hex(rawBody, env.RAZORPAY_WEBHOOK_SECRET);
  if (!constTimeEq(computed, sigHeader)) {
    return json({ ok: false, error: 'signature-mismatch' }, 400);
  }

  // ── 2. Parse + filter ─────────────────────────────────────────────
  let body: RazorpayWebhookEvent;
  try {
    body = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return json({ ok: false, error: 'bad-json' }, 400);
  }

  // Only act on payment.captured. payment.failed and other events
  // return 200 so Razorpay marks them delivered, but we don't fulfil.
  if (body.event !== 'payment.captured') {
    return json({ ok: true, status: 'ignored', event: body.event });
  }

  const payment = body.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id) {
    return json({ ok: false, error: 'missing-payment' }, 400);
  }

  // ── 3. Resolve sku + github_username ─────────────────────────────
  // Notes can be on the payment record (Razorpay carries forward at
  // capture time) OR only on the order. Try payment first, fall back
  // to a server-to-server fetch of the order so we always have the
  // SKU even if Razorpay didn't propagate it.
  let sku = payment.notes?.sku || '';
  let githubUsername = payment.notes?.github_username || undefined;
  let orderNotes: Record<string, string> | undefined;
  if ((!sku || !githubUsername) && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    try {
      const auth = 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
      const r = await fetch(`https://api.razorpay.com/v1/orders/${payment.order_id}`, {
        headers: { Authorization: auth },
      });
      if (r.ok) {
        const o = (await r.json()) as { notes?: Record<string, string> };
        orderNotes = o.notes;
        if (!sku && orderNotes?.sku) sku = orderNotes.sku;
        if (!githubUsername && orderNotes?.github_username) {
          githubUsername = orderNotes.github_username;
        }
      }
    } catch { /* keep what we have; fulfill will email-ask if missing */ }
  }
  if (!sku) {
    return json({ ok: false, error: 'missing-sku', payment_id: payment.id }, 400);
  }

  // ── 4. Dispatch to central fulfillment ───────────────────────────
  if (!env.FULFILL_SECRET) {
    return json({ ok: false, error: 'fulfill-secret-not-set' }, 500);
  }
  const url = env.FULFILL_URL
    || new URL('/api/fulfill/grant-access', request.url).toString();
  const dispatchPayload = {
    provider:        'razorpay',
    payment_id:      payment.id,
    sku,
    email:           payment.email || orderNotes?.email || '',
    github_username: githubUsername,
    name:            orderNotes?.buyer_name || orderNotes?.name,
    amount:          (payment.amount ?? 0) / 100,
    currency:        payment.currency || 'INR',
  };

  let dispatchOk = false;
  let dispatchStatus = 0;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-fulfill-secret': env.FULFILL_SECRET,
      },
      body: JSON.stringify(dispatchPayload),
    });
    dispatchOk = r.ok;
    dispatchStatus = r.status;
  } catch (e) {
    // Returning 5xx makes Razorpay retry the webhook — desirable for
    // a transient grant-access outage.
    return json({ ok: false, error: 'dispatch-failed', detail: String(e).slice(0, 120) }, 500);
  }

  return json({
    ok: dispatchOk,
    status: dispatchOk ? 'fulfilled' : 'dispatch-non-2xx',
    payment_id: payment.id,
    sku,
    fulfill_status: dispatchStatus,
  });
};

// ── helpers ─────────────────────────────────────────────────────────

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time string compare so timing attacks can't leak the secret. */
function constTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
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
