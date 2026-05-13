# Buyer PDFs

Per-SKU buyer guides — content drafted in Markdown here, rendered to PDF via Playwright print-to-pdf. Surfaced from the welcome email + `/buyer-portal/{payment_id}` page after purchase.

## Layout

```
_shared/         cross-SKU chapters (foundations, API strategy, GCP SA, Meta, TikTok, Shopify, etc.)
00N-{slug}.md    per-SKU file that @includes shared chapters + SKU-specific content
render.mjs       Playwright pipeline → dist/buyer-pdfs/00N-{slug}.pdf
```

## Content status

| Chapter | Status |
|---|---|
| `_shared/01-api-strategy.md` | ✅ Ship-ready (decision trees + per-service guidance + scale tiers + margin math) |
| `_shared/02-gcp-service-account.md` | ✅ Ship-ready (full SA walkthrough + per-property grants + troubleshooting) |
| `_shared/00-foundations.md` | 🟡 Stub |
| `_shared/03-meta-business-setup.md` | 🟡 Stub |
| `_shared/04-tiktok-ads-setup.md` | 🟡 Stub |
| `_shared/05-shopify-custom-app.md` | 🟡 Stub |
| `_shared/06-llm-providers.md` | 🟡 Stub |
| `_shared/07-stripe-razorpay.md` | 🟡 Stub |
| `_shared/08-discord-telegram.md` | 🟡 Stub |
| `_shared/09-deploy-host.md` | 🟡 Stub |
| `_shared/10-resale-playbook.md` | 🟡 Stub |
| `_shared/11-update-support.md` | 🟡 Stub |
| Per-SKU files (002–007) | 🟡 Not started |
| `render.mjs` Playwright pipeline | 🟡 Not started |

## Next iteration

Expand stubs into ship-ready chapters, write per-SKU files, build the Playwright renderer. Hook YouTube embed thumbnails per section once tutorials are recorded.
