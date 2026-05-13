# Buyer-portal page — design spec

**Path:** `/buyer-portal` (Astro page) on `grow.glitchexecutor.com`
**Endpoint:** `GET /api/grow/buyer-portal-data?payment_id=...` (Pages Function)
**Status:** spec only — implementation in a follow-up session.

## Goal
After the buyer accepts the Codeberg invite, instead of wondering "what now?", they hit a single page that lists everything they need: SKU name, walkthrough video, repo link, Discord channel, escalation path. The welcome email links here as the canonical "next step."

## URL contract
```
https://grow.glitchexecutor.com/buyer-portal?payment_id=cs_test_a1b2c3...
```
- `payment_id` is **the bearer token**. Knowing it = proving purchase.
- It's already what `/api/grow/buyers` keys on (see `payment/server.py:1548`).
- No login required, no separate password. Bearer-only.

## Page contents (rendered server-side via the Astro page calling the GET endpoint)

```
─────────────────────────────────────────────────────
 Glitch Grow buyer portal
 ─────────────────────────────────────────────────────
 Hi {first_name}, you bought:

 ▸ {SKU name}                    [shipped 2026-04-12]
 ▸ {SKU name}  (if bundle)       [shipped 2026-04-12]

 ─── Get started ─────────────────────────────────────
 1. Watch the walkthrough video (6 min):
    [▶ Open YouTube unlisted]

 2. Clone the repo:
    git clone git@codeberg.org:{org/repo}.git
    [📋 Copy command]

 3. Run quickstart:
    cd {repo} && ./scripts/quickstart.sh

 4. Read the playbook (in repo /docs/playbook/)

 ─── Community + support ─────────────────────────────
 ▸ Discord (buyer-only channels):  [Open invite]
 ▸ Need help?                      tejas@glitchexecutor.com
 ▸ Office hours:                   #ask-tejas in Discord, weekdays 10-11 ET

 ─── For bundle buyers ───────────────────────────────
 ▸ 30-min 1:1 architecture call    [Book on Cal.com]
 ▸ Founding-buyer badge active in Discord

─────────────────────────────────────────────────────
```

## API endpoint design

**Path:** `/api/grow/buyer-portal-data` — new Cloudflare Pages Function.
**Method:** `GET`.
**Query param:** `payment_id` (string, required).

### Response — happy path (200)
```json
{
  "ok": true,
  "buyer": {
    "first_name": "Sam",
    "purchased_at": "2026-04-12T14:33:09Z"
  },
  "skus": [
    {
      "sku": "BSK-002",
      "name": "LangGraph Ads Operator",
      "repo": "glitch-executor/glitch-grow-ads-agent-private",
      "video_url": "https://youtube.com/watch?v=...",
      "playbook_path": "docs/playbook/"
    }
  ],
  "discord_invite_url": "https://discord.gg/...",
  "is_bundle": false,
  "calcom_url": null
}
```

### Response — payment_id not found (404)
```json
{ "ok": false, "error": "not-found" }
```
**Important:** the page must NOT distinguish "wrong format" from "not in DB" — both render as a generic "Couldn't find that purchase. Email tejas@glitchexecutor.com if this is wrong." This avoids enumeration leaks.

### Response — rate limited (429)
After 5 requests/minute per IP, return 429. Use Cloudflare's built-in rate limiting at the route level.

## Data sources

The Cloudflare Pages Function must reach into the existing `/api/grow/buyers` endpoint at `payment/server.py:1548`. Two implementation options:

1. **Server-to-server fetch (recommended):** the Pages Function calls `https://glitchexecutor.com/api/grow/buyers/{payment_id}` with a shared HMAC token. This re-uses the existing Postgres connection on the FastAPI box, doesn't move the DB.
2. **Direct Cloudflare D1 / Hyperdrive:** would require duplicating the buyer table in Cloudflare. Overkill.

Pick (1).

## Security model
- **Bearer token = payment_id.** Stripe/Razorpay payment IDs are >40 chars of high-entropy. Brute-force is computationally infeasible at any sane rate-limit.
- **Rate limit per IP:** 5 GET/min, hard 429 above. Cloudflare WAF rule.
- **No PII leak on miss:** generic error message regardless of cause.
- **No HTML reflection:** all dynamic fields HTML-escape via Astro's default templating; no `set:html` anywhere.
- **HTTPS only:** already enforced site-wide on Cloudflare Pages.
- **Logging:** log payment_id misses to a Discord webhook (not Sentry — keeps the alert path lightweight) so we can spot a brute-force attempt.

## Required Cloudflare Pages env vars

| Var | Purpose | Secret? |
|---|---|---|
| `BUYERS_API_BASE` | URL of the FastAPI box (`https://glitchexecutor.com`) | No (URL only) |
| `BUYERS_API_HMAC_SECRET` | HMAC shared secret with the FastAPI server, signs the proxy call | **Yes** |
| `DISCORD_BUYER_INVITE_URL` | Discord invite URL with role-based auto-grant | No |
| `BUYER_MISS_WEBHOOK` | Discord webhook for logging misses (rate-limit / 404) | Yes |
| `CALCOM_BUNDLE_URL` | Cal.com booking link for the bundle 1:1 call | No |

All secrets via `wrangler secret put` or Cloudflare dashboard → Pages → Settings → Environment variables.

## Astro page implementation notes (for follow-up)

- File: `src/pages/buyer-portal.astro`.
- Server-side rendered (do NOT statically prerender — the param matters).
- Fetch the endpoint inside the frontmatter (`Astro.fetch`) so the SKU list is available at first paint.
- If `Astro.url.searchParams.get('payment_id')` is missing or empty, render a "this URL needs a `?payment_id=...` parameter" message.
- Use existing `src/components/` for header/footer to inherit branding.

## Welcome email integration (cross-link to `welcome-email-rewrite.md`)
The CTA in the welcome email is a single link:
```
https://grow.glitchexecutor.com/buyer-portal?payment_id={STRIPE_OR_RAZORPAY_ID}
```
where `{STRIPE_OR_RAZORPAY_ID}` is whatever the existing webhook pipeline already has. Do **not** invent a new identifier.

## Open questions for Tejas

1. Cal.com link for bundle buyers — do you have a bundle-specific 30-min booking URL set up? If not, recommend creating one so it can be hard-coded for `BSK-ALL` only.
2. Should we expose the playbook path as a clickable link (Codeberg deep-link to `/docs/playbook/`) or just text? Recommend deep-link — saves a click.
3. Bundle buyers see the same page or a different layout? Recommend same page, just shows multiple SKUs in the list + the bundle bonuses block at the bottom. Less code, same UX.
4. Do we want to surface "your support channel" per-SKU (e.g. `#bsk-002-help` Discord channel)? Adds value but requires buyer-role automation in Discord. Defer to v2 unless the role automation already exists.
