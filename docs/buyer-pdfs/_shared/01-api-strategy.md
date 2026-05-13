# Chapter — API Strategy: when to use what at which scale

> Buyers ask this constantly: "Should I use Make.com or write to the Meta API directly?" "Is Sarvam cheaper than Bland.ai?" "Do I need LiteLLM or just OpenAI?"
>
> This chapter is the decision framework. It applies across every agent in the AI Digital Marketing Stack.

---

## The four tiers — and where you sit on day 1

| Tier | Monthly cost | What it looks like | When you're here |
|---|---|---|---|
| **0 — Free / native APIs** | $0–$50 | Direct platform APIs + open-source libs you host yourself | First 1–3 clients, $0–$5K MRR |
| **1 — Light paid** | $50–$300 | One paid LLM bill + maybe a paid voice/image API + a small DB | 3–10 clients, $5K–$25K MRR |
| **2 — Operational SaaS** | $300–$1,500 | Paid SaaS for the bits where you'd rather not run infra (LiteLLM Cloud, Resend, Cloudflare R2, managed Postgres) | 10–50 clients, $25K–$100K MRR |
| **3 — Enterprise envelope** | $1,500+ | Negotiated enterprise pricing on AI/voice; observability stack; multi-region | 50+ clients, $100K+ MRR |

**Critical principle: never skip a tier upward, never skip down.** Most operators jump straight to Tier 2 because the integration is "easier" and burn margin for the next 18 months. The right answer is to start at Tier 0, prove the unit economics, and graduate.

The agents in this Stack are built to run at every tier. You change config, not code.

---

## Decision tree: native API vs paid SaaS wrapper

For every external service you integrate, walk this tree:

```
Does the platform expose a free native API with enough quota
for your current client volume?
├─ Yes → Use the native API. Always. The agent has native
│         clients for Meta, Google Ads, TikTok, Amazon, Shopify,
│         GA4, GSC, LinkedIn Ads.
└─ No  → Continue.

Is the SaaS wrapper offering something the native API
genuinely can't do (e.g. multi-platform unified webhooks,
cross-platform attribution joins, video-render-as-a-service)?
├─ No  → Stop. Use the native API. Pay the small dev cost
│         of writing the integration yourself; you'll save
│         100× over the year.
└─ Yes → Continue.

Is the SaaS wrapper cost <5% of the revenue per client
you'll bill for the workflow it enables?
├─ No  → Stop. The SaaS will eat your margin.
└─ Yes → Adopt. Monitor monthly; flip back to native if usage
         grows past the unit-economics break-even.
```

This is why the agents ship native clients for everything that has a free tier and paid SaaS only for genuinely unique value.

---

## Per-service guidance

### LLMs (used by every agent)

**Tier 0 — Free / cheap:** OpenAI `gpt-4o-mini` ($0.15/$0.60 per 1M tokens) for caption writing, brief drafting, classification. Anthropic `claude-haiku` ($0.25/$1.25) for low-latency reasoning. Both have $5 free credits.

**Tier 1 — Production default:** OpenAI `gpt-4o` ($2.50/$10) for hooks, copy, audit reports. Anthropic `claude-sonnet` ($3/$15) for agentic workflows that need long context + tool use. Budget $30–$150/mo per client.

**Tier 2 — Add LiteLLM:** Once you're routing >10M tokens/month, install LiteLLM ($50–$100/mo self-hosted or $99/mo Cloud) to pool spend across providers, fall back on quota/outage, and get unified observability. Single line change in `.env`.

**Tier 3 — Enterprise:** Direct Anthropic enterprise contract ($X/min commit) or Azure OpenAI for compliance buyers.

**Never:** chat.openai.com Plus / claude.ai Pro for production work. They're not API tiers; you can't programmatically access them and the limits are tighter.

### Meta Ads (BSK-002 ads, BSK-007 UGC)

**Tier 0:** Meta Marketing API direct. Free. The agent has a native client at `src/ads_agent/meta/`. Requires a System User token from Business Manager (15-min setup; covered in the Meta Business Setup chapter).

**Skip Tier 1.** There's nothing meaningful between native + enterprise.

**Tier 2 — Real cost:** Madgicx Plus ($79–$269/mo per ad account) only buys you a UI; the native API gives the agent everything Madgicx does. Smartly ($45/mo) and AdEspresso ($49–$169/mo) likewise. Don't pay these.

**Tier 3 — Conversions API direct:** Even at scale, stay native. Meta's CAPI is free.

### TikTok Ads (BSK-002, BSK-007)

**Tier 0:** TikTok Business API. Free, but the app-approval flow is slow (10–14 days). Apply day-1 of each new agency client; the agent has the native client at `src/ads_agent/tiktok/`.

**Tier 2:** No good SaaS wrapper exists. Stay native.

### Voice (BSK-005)

**Tier 0 — India market:** Sarvam STT direct ($0.005/min STT + Saaras v3 Hindi). LiveKit Cloud free tier (100 min). ElevenLabs free tier (10K chars/mo). Total: ~$0.02/min per call. Comfortable up to 200 calls/day for one merchant.

**Tier 1:** ElevenLabs Creator ($22/mo, 100K chars) or Pro ($99/mo, 500K chars) once you exceed free. LiveKit Cloud pay-as-you-go ($0.002/participant-min). Sarvam stays direct.

**Tier 2 — Multi-merchant:** ElevenLabs Scale ($330/mo, 2M chars) once you cross 30 merchants. LiveKit self-host on a $40/mo Hetzner box (the agent ships LiveKit-server config) — break-even vs Cloud is ~50K minutes/month.

**Avoid:** Bland.ai ($0.10/min minimum). Retell ($0.07/min). Twilio Voice ($0.013/min + the SIP carrier on top). The agent's stack is 3–5× cheaper because it's not a wrapped product.

**Carrier (SIP):**
- India: Plivo ($0.005/min outbound) or Exotel (₹0.50/min) — depends on your DID region.
- US/CA/UK: Twilio ($0.013–$0.018/min). The agent works with any SIP trunk.

### Image + Video Generation (BSK-004 social, BSK-007 UGC)

**Tier 0:** gpt-image-2 (~$0.04 per still), fal.ai WAN 2.1 i2v ($0.20 per 5s clip), Kling 2.0 (~$0.30 per 5s clip via fal.ai). HeyGen avatar (~$0.30 per 30s clip).

**Tier 1:** Same providers, just larger volume. Most buyers cap at $300–$800/mo total image+video spend per client.

**Tier 2 — Higher-volume UGC pipeline:** Direct fal.ai enterprise (volume discount kicks in past 100K credits). HeyGen API team plan at scale.

**Avoid:** Synthesia ($59/mo + per-video charge, no API parity), DeepBrain (closed-platform).

### Email send (BSK-003 sales)

**Tier 0:** Google Workspace + Gmail API (free with your domain), capped at 2,000 emails/day per sender, 250/day per recipient pattern. The agent uses a domain-wide delegation flow via service account (covered in the GCP SA chapter).

**Tier 1:** Resend ($20/mo for 50K emails). Wire as a fallback / for cold outbound where you don't want to burn your Gmail rep.

**Tier 2:** Customer.io or Sendgrid only if you're sending >500K/mo and need their deliverability infrastructure. Most agencies never get here.

**Avoid:** Smartlead, Instantly, Lemlist, Outreach for production work — they're nice UIs but you're paying $97–$297/mo per seat for what the agent already does natively. Use them only for the inbox-warming side feature.

### Shopify (BSK-005 voice, BSK-006 SEO)

**Tier 0:** Shopify custom app (free with any Shopify plan). Generate Admin API token with the scopes the agent needs (covered in the Shopify Custom App chapter). No Shopify Plus required.

**Tier 1:** Same. Shopify charges per-store; the agent runs unlimited stores on one purchase.

### SEO / GSC / GA4 (BSK-006)

**Tier 0:** Google Search Console API + GA4 Data API, both free, both behind the same service account. The agent uses one SA across both.

**Tier 1:** Optional PageSpeed Insights API key (free quota 25K/day, way more than any operator needs). Add for Core Web Vitals reporting.

**Avoid:** Ahrefs ($129+/mo), SEMrush ($139+/mo), Surfer ($89+/mo) as paid integrations for the agent. You can subscribe to them for your own research, but the agent doesn't need them — it audits via real GSC/GA4 data, which is more accurate than keyword-tool estimates.

### Webhooks + automation glue

**Tier 0:** Don't use Zapier, Make.com, or n8n for the agent's internal wiring. The agent runs as its own service. Use them only at the edges if a client insists on Salesforce/Hubspot syncing.

**If you must:** Make.com Free (1K ops/mo) for personal automations. n8n self-hosted (free, $10/mo VPS) if you do need a visual layer for client-side workflows.

**Avoid:** Zapier Professional ($49–$103/mo per workspace). The cost compounds across your agency.

### Observability + Logs

**Tier 0:** stdout + `journalctl` (if using systemd). The agent logs structured JSON.

**Tier 1:** Better Stack ($25/mo for 1GB/day) or Axiom ($25/mo for 500GB/mo) for hosted log search. Adds visibility for multi-client operators.

**Tier 2:** Datadog or NewRelic only if you have a client requiring SOC 2 audit trails.

---

## The "should I pay for this SaaS?" gut check

Three questions before you sign up for any SaaS to support your agency:

1. **Does the platform you're integrating with already expose this for free via API?** (Meta dashboards yes, Klaviyo segment-creator yes, Shopify everything yes.)
2. **Is the SaaS doing real cross-platform work (the kind you'd otherwise build), or just wrapping one API?** (Madgicx = wrapper. Looker Studio = wrapper. Smartlead = wrapper. None worth paying for at agency scale.)
3. **Would your gross margin per client survive if 10 of these SaaS fees stacked?** (At $1,497/mo MRR per client, ten $97/mo SaaS = $970/mo overhead — gone is 65% of your margin.)

If any answer is "no", default to native. The agent is built around this principle.

---

## What you'll genuinely pay at each tier (per client per month)

For the operator running 1 client on BSK-002 Ads:

| Cost | Amount | Notes |
|---|---|---|
| LLM | $30–$100 | OpenAI gpt-4o for reasoning |
| Meta Ads API | $0 | Native |
| Google Ads API | $0 | Native, requires developer-token approval (free) |
| TikTok Ads API | $0 | Native |
| LiteLLM | $0 | Skip until 10M tokens/mo |
| PostHog | $0 | Free tier 1M events |
| Postgres | $0–$15 | Local Docker, or Supabase free, or Fly.io $5 |
| Domain + email | $1–$10 | One Google Workspace seat for tokens |
| **Total** | **$31–$125/mo** | |

Bill the client **$1,497–$2,997/mo**. Your gross margin: 92–98%.

For the same operator running 30 clients on the full Stack:

| Cost | Amount |
|---|---|
| LLM (LiteLLM pooled) | $400–$900 |
| ElevenLabs Scale | $330 |
| LiveKit self-hosted | $40 |
| Sarvam (volume) | $200 |
| HeyGen team | $99 |
| fal.ai (volume) | $200–$500 |
| Resend | $35 |
| Postgres (managed) | $25 |
| VPS hosting | $80 |
| Observability | $25 |
| **Total** | **~$1,400–$2,300/mo for 30 clients** |

That's **$47–$77 per client per month of infra cost.** Bill 30 clients × $1,497 = $44,910/mo. Gross margin: 95%+.

This is why the math works.
