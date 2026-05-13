// Geo helpers for the dual-variant site.
//
// `/` and `/legal/*` → Global variant ('GL')
//    Stripe-facing, USD pricing, Nuraveda (Canada) entity in ToS/Privacy.
//
// `/in` and `/in/*` → India variant ('IN')
//    Razorpay-facing, INR pricing, Bani Thani (India) entity in ToS/Privacy.
//
// The split is purely path-based — never IP-based. Each URL is "pure" for
// its market so payment-gateway compliance teams (Stripe, Razorpay) see
// consistent pricing + entity + policies whenever they crawl.
//
// Indian visitors landing on `/` get a banner suggesting `/in` (see
// GeoBanner component). They're free to stay on `/` if they want USD pricing
// and the global flow.

import { legalEntityGL, legalEntityIN } from './site';

export type Geo = 'GL' | 'IN';

/** Derive the geo variant from a URL pathname. */
export function getGeo(pathname: string): Geo {
  // Match `/in`, `/in/`, `/in/anything`. Don't match `/india` or anything else.
  if (pathname === '/in' || pathname === '/in/' || pathname.startsWith('/in/')) {
    return 'IN';
  }
  return 'GL';
}

/** Map a geo to its legal entity. */
export function getLegalEntity(geo: Geo) {
  return geo === 'IN' ? legalEntityIN : legalEntityGL;
}

/** Currency symbol + code for the given geo. */
export const currencySymbol = (geo: Geo): string => (geo === 'IN' ? '₹' : '$');
export const currencyCode = (geo: Geo): string => (geo === 'IN' ? 'INR' : 'USD');

/**
 * Format a price for display. Geo-aware — picks the right symbol and
 * thousands-separator. Numbers are stored on each Product as priceUsd
 * (cents → dollars-style integers, e.g. 49) and priceInr (e.g. 999) so
 * we never do FX conversion at runtime; PPP-adjusted INR prices are set
 * intentionally to match the Indian digital-product market.
 */
export function formatPrice(geo: Geo, amounts: { priceUsd: number; priceInr: number }): string {
  if (geo === 'IN') {
    // Indian numbering: 9,999 / 99,999 / 1,00,000
    return '₹' + new Intl.NumberFormat('en-IN').format(amounts.priceInr);
  }
  return '$' + amounts.priceUsd.toLocaleString('en-US');
}

/** The "other" geo — used for the variant-toggle link. */
export function otherGeo(geo: Geo): Geo {
  return geo === 'IN' ? 'GL' : 'IN';
}

/** Path to the home of the given geo. */
export function geoHomePath(geo: Geo): string {
  return geo === 'IN' ? '/in/' : '/';
}

/** Path to a legal/policy page for the given geo. The five Razorpay-required
 *  India pages (terms / privacy / refund / shipping / contact) all live under
 *  /in/legal/. Global has only the first two for now; the rest 404 there
 *  intentionally — global commerce uses Stripe and Stripe doesn't ask for the
 *  refund/shipping/contact split. */
export function geoLegalPath(
  geo: Geo,
  page: 'privacy' | 'terms' | 'refund' | 'shipping' | 'contact',
): string {
  return geo === 'IN' ? `/in/legal/${page}` : `/legal/${page}`;
}

/** Geo-aware price labels for ancillary recurring offerings (Discord
 *  community access, etc.) — these are OUR prices and need to switch with
 *  the variant. Cloud-infra costs, Anthropic subscriptions, and other
 *  third-party USD-billed services don't go through here; they stay USD. */
export const discordMonthlyLabel = (geo: Geo): string =>
  geo === 'IN' ? '₹399/mo' : '$19/mo';

/** Geo-aware "agency-resell single client" benchmark — used in copy that
 *  references typical client invoices for services built on the agents. */
export const resellSingleClient = (geo: Geo): string =>
  geo === 'IN' ? '₹25,000/mo' : '$1,497/mo';

/** Geo-aware "agency-resell band" reference — wider range used in
 *  hero/two-paths style copy. */
export const resellRange = (geo: Geo): string =>
  geo === 'IN' ? '₹25K–₹50K/mo' : '$1.5K–$3K/mo';
