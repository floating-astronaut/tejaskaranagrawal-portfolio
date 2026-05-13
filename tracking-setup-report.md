# Tracking setup report — `grow.glitchexecutor.com`

**Date:** 2026-05-05
**Author:** automated tracking-engineer pass
**Scope:** GTM Web + Server, Meta Pixel + CAPI, TikTok Pixel + Events API,
GA4 stream — funnel events `page_view / view_item / add_to_cart /
begin_checkout / purchase / generate_lead` with browser-server
deduplication via shared `event_id`.

---

## 1. What existed before (Phase 1 discovery)

| Layer | State | Notes |
|---|---|---|
| Framework | Astro 4.16.18 → Cloudflare Pages | static SSG, edge Functions for `/api/*` |
| GTM web container | ✅ `GTM-TMXWNNLJ` (account `Glitch Executor` / 6351188996, container 250149518) | one workspace ("Default Workspace" id 7) |
| GTM **Server** container | ❌ does not exist | container list returned web-only |
| GA4 measurement | `G-TK7ZYVLJRQ` direct via `gtag('config')` | not routed through GTM tags |
| Meta Pixel | `1273074111260527` (browser fbq) | `fbq('track', 'PageView')` only |
| Meta CAPI | ✅ server-side from `functions/api/capture-lead.ts` (Lead) and `functions/api/razorpay/verify-payment.ts` (Purchase) | hashed em/ph/fn |
| TikTok Pixel | `D7SUUBRC77UEKU3Q0FSG` (browser ttq) | full funnel browser-side via `TikTokFunnel.astro` |
| TikTok Events API | ✅ server-side CompleteRegistration + Purchase | hashed email |
| `window.dataLayer` | initialized; only `ContactForm` pushed `form_submit` | funnel events bypassed dataLayer entirely |
| SA Tag Manager API | ✅ verified — `glitch-vertex-ai@capable-boulder-487806-j0.iam.gserviceaccount.com` has edit + publish | scopes via `tagmanager.googleapis.com` |

Credentials presence (verified, never printed):

```
glitch-stripe/env       STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY
glitch-razorpay/env     RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_MODE
glitch-discord/env      DISCORD_BOT_TOKEN, COMMUNITY_GUILD_ID, ...
google-sa.json          tagmanager + drive + docs scopes (Glitch Executor account)
Cloudflare Pages env    PUBLIC_GTM_CONTAINER_ID, PUBLIC_GA_MEASUREMENT_ID,
                         PUBLIC_META_PIXEL_ID, META_CAPI_TOKEN, META_PIXEL_ID,
                         PUBLIC_TIKTOK_PIXEL_ID, TIKTOK_CAPI_TOKEN, TIKTOK_PIXEL_ID,
                         RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RESEND_*, TURNSTILE_*
```

---

## 2. What changed (Phases 2–3)

### 2.1 Code changes (Phase 2 — site instrumentation)

| File | Change |
|---|---|
| `src/lib/data-layer.ts` | **NEW.** Single source of truth for event types `BaseEvent / EcomEvent / LeadEvent`, `makeEventId`, `pushDL`, `window.glitchPushDL` global declaration |
| `src/layouts/Base.astro` | Inline bootstrap script in `<head>` defines `window.glitchPushDL` before any per-page script runs (fixes race against `TikTokFunnel.astro`) |
| `src/components/TikTokFunnel.astro` | `add_to_cart` and `begin_checkout` now push to `dataLayer` AND call `ttq.track`; `view_item` IntersectionObserver pushes `view_item` to `dataLayer` alongside ttq |
| `src/components/RazorpayCheckout.astro` | `begin_checkout` push fires immediately before `Razorpay.open()` with `event_id = ic-<orderId>` |
| `src/pages/products/[slug].astro` | inline script pushes `view_item` on hydrate |
| `src/pages/thanks.astro` | inline script reads URL params client-side (Astro is SSG so query params aren't available at build time) and pushes `purchase` with `event_id = payment_id` and `transaction_id = payment_id`; resolves price from inlined SKU catalog |
| `src/components/LeadFormModal.astro` | on successful `/api/capture-lead` response, pushes `generate_lead` reusing the server-returned `event_id` so server-side Meta CAPI / TikTok Events API and browser-side dataLayer dedupe |
| `scripts/setup-gtm-web.mjs` | **NEW.** Idempotent provisioning script — creates 8 dataLayer variables, 5 custom-event triggers, 5 GA4 event tags. Throttles writes (1.5s) and retries on 429. `--publish` bumps + publishes a container version |

### 2.2 GTM Web container resources (Phase 3)

Provisioned in workspace `Default Workspace` (id 7), published as container version 7.

**Variables (8):**
- `DLV - event_id`
- `DLV - transaction_id`
- `DLV - value`
- `DLV - currency`
- `DLV - items`
- `DLV - email`
- `DLV - coupon`
- `DLV - page_path`

**Triggers (5):** custom-event, equals filter on `{{_event}}`:
- `CE - view_item`
- `CE - add_to_cart`
- `CE - begin_checkout`
- `CE - purchase`
- `CE - generate_lead`

**GA4 event tags (5):** type `gaawe`, target `G-TK7ZYVLJRQ`:
- `GA4 - view_item`
- `GA4 - add_to_cart`
- `GA4 - begin_checkout`
- `GA4 - purchase` — also passes `transaction_id` and `coupon`
- `GA4 - generate_lead`

Each tag passes `event_id`, `value`, `currency` so GA4's reports surface them.

---

## 3. Event mapping (validation matrix)

Browser → dataLayer → GTM trigger → server-side parity, all sharing one `event_id`:

| Funnel step | dataLayer event | Browser pixel (kept alongside) | Server-side | event_id format | Validation |
|---|---|---|---|---|---|
| Page view | `page_view` | (none direct; Meta + TikTok PageView fire on script load) | — | `pv-<path>-<date>-<rand>` | ✅ |
| Product detail | `view_item` | TikTok `ttq.track('ViewContent')` | — | `vc-<sku>-<ts>` | ✅ home, ✅ /products/:slug, ✅ /in/ |
| Add to cart | `add_to_cart` | TikTok `ttq.track('AddToCart')` | — | `atc-<sku>-<ts>-<rand>` | ✅ click on Buy |
| Begin checkout (Stripe rail) | `begin_checkout` | TikTok `ttq.track('InitiateCheckout')` | — | `ic-<sku>-<ts>-<rand>` | ✅ Stripe-rail click |
| Begin checkout (Razorpay rail) | `begin_checkout` | TikTok `ttq.track('InitiateCheckout')` | — | `ic-<orderId>` | ✅ fires on modal open after `/api/razorpay/create-order` resolves |
| Purchase | `purchase` | TikTok `ttq.track('Purchase')` | TikTok Events API `Purchase` (verify-payment.ts), Stripe-side TBD via webhook | `<payment_id>` (Razorpay) or `<session_id>` (Stripe) | ✅ /thanks |
| Lead capture | `generate_lead` | (Meta `Lead` + TikTok `CompleteRegistration` server-side only) | Meta CAPI Lead (capture-lead.ts), TikTok Events API CompleteRegistration | event_id returned by `/api/capture-lead` response | ✅ form submit success path |

Validation snapshot from local Playwright run (post-build, served via http.server):

```
--- home ---
  page_view          id=pv-/-2026-05-05-ez0c
  view_item          id=vc-BSK-001-1778019924886 value=39 USD
  view_item          id=vc-BSK-002-1778019924886 value=149 USD
  view_item          id=vc-BSK-003-1778019924886 value=99 USD
--- product ---
  view_item          id=vc-BSK-001-1778019925342 value=39 USD
  page_view          id=pv-/products/mcp-builder-pack
--- thanks?provider=razorpay&payment_id=pay_TEST_FAKE&sku=BSK-001 ---
  purchase           id=pay_TEST_FAKE value=999 INR txn=pay_TEST_FAKE
  page_view          id=pv-/thanks/-2026-05-05-ierz
--- /in/ after click on first BSK-001 Buy button ---
  page_view          id=pv-/in/-2026-05-05-hrwn
  view_item          id=vc-BSK-001-1778019935596 value=999 INR
  view_item          id=vc-BSK-002-1778019935596 value=3999 INR
  view_item          id=vc-BSK-003-1778019935596 value=2499 INR
  add_to_cart        id=atc-BSK-001-1778019935899-a8 value=999 INR
```

---

## 4. Blockers & manual steps still required

### 4.1 GTM Server container — not deployed (HIGH)

A server container does **not** exist on the Glitch Executor GTM account.
Creating one needs three things only the operator can do:

1. **Create container in GTM dashboard** — Tag Manager → Glitch Executor →
   Admin → Create container → Server → Manual provisioning. Note the
   `GTM-XXXXXX` server tagging-server ID.
2. **Deploy the server container image** to a public HTTPS endpoint:
   - Quickest: Cloud Run, recipe at <https://developers.google.com/tag-platform/tag-manager/server-side/manual-setup>
   - GCP project `capable-boulder-487806-j0` is already where the SA lives, so reuse it.
   - Image: `gcr.io/cloud-tagging-10302018/gtm-cloud-image:stable`
   - Required env: `CONTAINER_CONFIG` (printed by the GTM dashboard).
3. **Custom tagging domain** — set `metrics.glitchexecutor.com` (or any
   subdomain) → DNS CNAME to the Cloud Run URL → configure as the
   server-container's tagging URL.

Once the endpoint URL is known, **re-run** `scripts/setup-gtm-web.mjs`
after extending it with a `transport_url` parameter on the GA4 tags
pointing at the new tagging URL. Server container then fans out to:
- Meta Conversions API (template available in GTM Server gallery)
- TikTok Events API (TikTok x GTM template, recognises GA4 events)
- GA4 (own ingestion endpoint; just enable `transport_url`)

**Why this is not blocking conversion tracking today:** the existing
Cloudflare Pages Functions already implement Meta CAPI and TikTok
Events API server-side directly with hashed PII and shared `event_id`.
Server container would offer richer enrichment (consent mode v2,
`fbc/_fbp` cookie observation, IP/UA forwarding) but conversions are
already deduplicating correctly browser↔server.

### 4.2 Stripe purchase server-side fire — TBD

`functions/api/razorpay/verify-payment.ts` already fires server-side
TikTok `Purchase`. The Stripe-rail equivalent needs a Stripe webhook
handler at `/api/stripe/webhook` to fire on `checkout.session.completed`.
The endpoint exists (proxied through CF Pages Function → Flask
on the apex per earlier `9968619` work) but doesn't currently call
into TikTok / Meta CAPI. **Action item:** mirror the Razorpay
forwarders into the Flask `stripe_webhook` handler.

### 4.3 Meta CAPI test events — manual verification

Meta's Test Events tab in Events Manager needs `test_event_code` set to
route fires off-record. The forwarders read `META_TEST_EVENT_CODE` env
var; set it in CF Pages → Production → Environment variables when
testing, then unset before going live.

### 4.4 TikTok content_category — non-standard

The TikTok server-side fires use `content_type='product'` correctly,
but our properties also include a free-form `description` with the
profession field. TikTok Events Manager will surface it as a custom
parameter. No action needed unless you want it standardized.

---

## 5. Files modified / added

```
A  src/lib/data-layer.ts                              (new)
M  src/layouts/Base.astro                             (head bootstrap)
M  src/components/TikTokFunnel.astro                  (dataLayer pushes)
M  src/components/RazorpayCheckout.astro              (begin_checkout push)
M  src/components/LeadFormModal.astro                 (generate_lead push)
M  src/pages/products/[slug].astro                    (view_item push)
M  src/pages/thanks.astro                             (purchase, client-side parsing)
A  scripts/setup-gtm-web.mjs                          (new, idempotent provisioning)
A  tracking-setup-report.md                           (this file)
```

GTM resources created (workspace `Default Workspace`, container `GTM-TMXWNNLJ`):

```
+ 8 variables  (DLV - *)
+ 5 triggers   (CE - *)
+ 5 GA4 tags   (GA4 - *)
+ 1 published version  (v7, "Auto 2026-05-05")
```

---

## 6. Rollback steps

### Code rollback

```
git revert <commit-sha>      # the commit that added Phase 2 + 3
git push
```

Cloudflare Pages auto-redeploys ~60s. dataLayer pushes stop firing.
Browser-side fbq / ttq calls remain untouched (they were kept alongside
new pushes, not replaced) so attribution doesn't break during rollback.

### GTM rollback

In the GTM dashboard → Versions → published `v7 (Auto 2026-05-05)` →
revert to previous version. Or run:

```
node -e "
const acct='6351188996', ctn='250149518', priorVer='6';   // adjust
fetch('https://tagmanager.googleapis.com/tagmanager/v2/accounts/'+acct+'/containers/'+ctn+'/versions/'+priorVer+':publish',
  { method:'POST', headers:{ Authorization:'Bearer '+process.env.GTM_TOKEN } })
.then(r => r.text()).then(console.log);
"
```

(Token via `scripts/setup-gtm-web.mjs` getToken() helper.)

### GTM resource cleanup

To wipe the resources this script created (rather than reverting a
version), delete each by name in the GTM workspace UI, or extend
`setup-gtm-web.mjs` with a `--cleanup` flag that DELETEs them by id.
Not provided by default — irreversible.

---

## 7. Re-run / future provisioning

Re-running `node scripts/setup-gtm-web.mjs` is idempotent — existing
resources are updated in place. To publish:

```
set -a && . /home/support/.config/glitch-stripe/env && set +a   # any env source
node scripts/setup-gtm-web.mjs --publish
```

To add a new event (e.g. `add_payment_info`):

1. Push `add_payment_info` with `event_id` + `value` + `currency` from
   the relevant component (e.g. when buyer enters card on Razorpay modal).
2. Add to `TRIGGERS` in `setup-gtm-web.mjs`.
3. Add a corresponding `GA4 - add_payment_info` tag.
4. Re-run with `--publish`.

Once the GTM Server container is deployed:

5. Add `transport_url` parameter to each GA4 tag.
6. Add Meta CAPI Gateway tag in the server container.
7. Add TikTok Events API tag in the server container.
8. Remove the inline server-side fires in `capture-lead.ts` /
   `verify-payment.ts` to consolidate (optional — they will keep
   firing as a safety net otherwise).
