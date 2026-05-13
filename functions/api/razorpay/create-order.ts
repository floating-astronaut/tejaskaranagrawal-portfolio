/**
 * Cloudflare Pages Function — POST /api/razorpay/create-order
 *
 * First leg of the Razorpay Standard Checkout flow. Receives a SKU from
 * the client, looks up the authoritative INR amount in our server-side
 * catalog (so buyers can't tamper with the price by editing client-side
 * code), creates an Order via Razorpay REST API, returns the order_id +
 * amount + currency + the public Key ID that the client uses to
 * initialise the checkout modal.
 *
 * Frontend flow:
 *   click Buy → POST {sku} here → receive {orderId, amount, keyId}
 *   → window.Razorpay.open({...}) with those values
 *   → user pays → razorpay handler fires with payment_id, signature
 *   → POST those + sku to /api/razorpay/verify-payment
 *
 * Required env (set in Cloudflare Pages dashboard, Production + Preview):
 *   RAZORPAY_KEY_ID      — rzp_test_* in dev, rzp_live_* in prod
 *   RAZORPAY_KEY_SECRET  — paired secret; never returned to the browser
 */

import { RAZORPAY_CATALOG, type CatalogItem } from '../../_razorpay-catalog';

export interface Env {
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
}

interface CreateOrderRequest {
  sku?: string;
  /** Optional buyer-supplied receipt string (max 40 chars per Razorpay). */
  receipt?: string;
  /** Optional metadata that should ride along on the Razorpay order. */
  notes?: Record<string, string>;
  /** Optional promo code. Server-side allowlist below decides the discount. */
  promoCode?: string;
  /** Optional buyer-supplied GitHub username. Persisted into order.notes
   *  so the verify-payment Function can hand it off to fulfill/grant-access
   *  for the collaborator invite. */
  githubUsername?: string;
}

const MAX_RECEIPT_LEN = 40;

/**
 * Server-authoritative promo allowlist. Razorpay Standard Checkout has no
 * native promo-code field, so we apply the discount at order-creation time
 * by reducing `amount`. Keeping this on the server prevents tampering: the
 * client may send any string, but only codes listed here apply.
 *
 * Each code maps to a percentage off (0 < pct < 100). Add new codes here
 * to roll a new promo without touching Stripe — the corresponding Stripe
 * coupon is created separately via scripts/setup-stripe-promo.mjs.
 */
const PROMO_CODES: Record<string, number> = {
  GLITCH20: 20,
};

interface AppliedPromo {
  code: string;
  percent: number;
  amountBeforePaise: number;
  amountAfterPaise: number;
  discountPaise: number;
}

function applyPromo(amountPaise: number, raw: string | undefined): AppliedPromo | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!code) return null;
  const pct = PROMO_CODES[code];
  if (!pct) return null;
  // Round DOWN to the nearest whole rupee on the discount so the amount
  // stays an integer in paise and we never charge a fraction off the buyer.
  const discountPaise = Math.floor((amountPaise * pct) / 100);
  return {
    code,
    percent: pct,
    amountBeforePaise: amountPaise,
    amountAfterPaise: amountPaise - discountPaise,
    discountPaise,
  };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return json({ ok: false, error: 'razorpay-not-configured' }, 500);
  }

  let body: CreateOrderRequest;
  try {
    body = (await request.json()) as CreateOrderRequest;
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400);
  }

  const sku = (body.sku ?? '').trim().toUpperCase();
  if (!sku) {
    return json({ ok: false, error: 'missing-sku' }, 400);
  }

  const item: CatalogItem | undefined = RAZORPAY_CATALOG[sku];
  if (!item) {
    return json({ ok: false, error: 'unknown-sku', sku }, 400);
  }

  // Razorpay deals in the smallest currency unit (paise). 1 INR = 100 paise.
  // Razorpay's API minimum is 100 paise (₹1). Our cheapest SKU is ₹999 so
  // we're always above the floor; defensive check below anyway.
  const amountFullPaise = item.priceInr * 100;
  const promo = applyPromo(amountFullPaise, body.promoCode);
  const amountPaise = promo ? promo.amountAfterPaise : amountFullPaise;
  if (amountPaise < 100) {
    return json({ ok: false, error: 'amount-below-minimum', amountPaise }, 400);
  }

  // Receipt must be ≤ 40 chars; defaults to "<sku>-<unix>" if not provided.
  const receipt = (body.receipt ?? `${sku}-${Date.now()}`).slice(0, MAX_RECEIPT_LEN);

  // Razorpay Orders API expects HTTP Basic auth: KEY_ID:KEY_SECRET.
  // Create the auth header inline; never log it.
  const authHeader = 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

  let rzpRes: Response;
  try {
    rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          sku,
          source: 'glitch-grow-site',
          ...(body.githubUsername ? { github_username: body.githubUsername.trim() } : {}),
          ...(promo
            ? {
                promo_code: promo.code,
                promo_percent: String(promo.percent),
                amount_before_paise: String(promo.amountBeforePaise),
                discount_paise: String(promo.discountPaise),
              }
            : {}),
          ...(body.notes ?? {}),
        },
      }),
    });
  } catch (err) {
    return json({ ok: false, error: 'razorpay-network-error' }, 502);
  }

  if (rzpRes.status === 401) {
    return json({ ok: false, error: 'razorpay-auth-failed' }, 401);
  }
  if (!rzpRes.ok) {
    const errBody = await rzpRes.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error('[razorpay/create-order] non-2xx', rzpRes.status, errBody.slice(0, 500));
    return json({ ok: false, error: 'razorpay-api-error', status: rzpRes.status }, 500);
  }

  const order = (await rzpRes.json()) as {
    id?: string;
    amount?: number;
    currency?: string;
    receipt?: string;
    status?: string;
  };

  if (!order.id) {
    return json({ ok: false, error: 'razorpay-no-order-id' }, 500);
  }

  return json({
    ok: true,
    orderId: order.id,
    amount: order.amount ?? amountPaise,
    currency: order.currency ?? 'INR',
    receipt: order.receipt ?? receipt,
    // Public Key ID is safe to return to the browser — the SECRET is not.
    keyId: env.RAZORPAY_KEY_ID,
    // Echo the SKU + display fields so the client can populate the
    // Razorpay modal without a second round-trip.
    sku: item.sku,
    name: item.name,
    description: item.description,
    // Echo applied promo for the client (used for the Meta CAPI / TikTok
    // event values + so the modal can display "20% off — GLITCH20").
    promo: promo
      ? { code: promo.code, percent: promo.percent, discountPaise: promo.discountPaise }
      : null,
  });
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
