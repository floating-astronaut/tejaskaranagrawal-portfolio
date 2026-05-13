/**
 * Single source of truth for window.dataLayer pushes.
 *
 * Every conversion-relevant event the site fires must go through pushDL()
 * so GTM (web container, then server container once deployed) sees a
 * uniform shape. Each event carries an event_id for browser-server
 * deduplication — the server-side CAPI / Events API forwarders use the
 * same id when they exist (capture-lead.ts forwardMetaCapi /
 * forwardTikTokCapi; verify-payment.ts forwardTikTokPurchase).
 *
 * Schema follows GA4 ecommerce conventions (view_item, add_to_cart,
 * begin_checkout, purchase) plus generate_lead for the kit-form capture.
 * GTM templates for Meta / TikTok understand the GA4 names natively.
 */

export interface BaseEvent {
  /** GA4 / Meta / TikTok recognised event name in lowercase_with_underscores. */
  event: string;
  /** Unique per-fire id used for browser-server deduplication. */
  event_id: string;
  /** Stable buyer email after lead capture, when available — server-side
   *  CAPI hashing happens in the GTM Server / CF Function. */
  email?: string;
}

export interface EcomItem {
  item_id: string;
  item_name?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}

export interface EcomEvent extends BaseEvent {
  event: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase';
  currency: string;
  value: number;
  items: EcomItem[];
  /** Only on purchase. */
  transaction_id?: string;
  /** Only on purchase — absolute coupon discount in major-currency units. */
  discount?: number;
  /** Only on purchase — applied promo code. */
  coupon?: string;
}

export interface LeadEvent extends BaseEvent {
  event: 'generate_lead' | 'sign_up';
  /** Marketing-segment metadata. */
  profession?: string;
  /** Lifecycle source for Resend / Meta CAPI matching. */
  utm_source?: string;
}

export type DataLayerEvent = EcomEvent | LeadEvent;

/** Generate a stable event_id of the form `<prefix>-<timestamp>-<rand>`. */
export function makeEventId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${t}-${r}`;
}

/**
 * Server-injected stub. Real push happens in the inline TikTokFunnel.astro
 * runtime (see window.glitchPushDL). At build time this file is imported
 * by component scripts, but the push call itself runs in the browser.
 */
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    glitchPushDL?: (event: DataLayerEvent) => void;
    /** Legacy helper retained for direct ttq.track callers — wraps pushDL. */
    ttFire?: (eventName: string, data: Record<string, unknown>, opts?: { event_id?: string }) => void;
  }
}

/** Browser-safe push — drops silently when window or dataLayer is missing. */
export function pushDL(ev: DataLayerEvent): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(ev as unknown as Record<string, unknown>);
}
