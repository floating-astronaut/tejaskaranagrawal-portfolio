# Glitch Grow → Agent Platform Strategy

**Author context:** solo founder, ~10 hrs/week, one Oracle A1 box (4 vCPU / 24 GB / 200 GB), no outside funding, BSL 1.1 source-available, India + global dual rail. Today's product: six BSK boilerplates + AI Digital Marketing Stack bundle, sold as Codeberg-collaborator licences ($39–149 / ₹999–3,999, bundle $499 / ₹9,999).

The question is not "what could we build." It is: **given one operator and zero runway, where does each marginal hour of work compound the most?** This memo picks one lane and sequences the rest as derivatives, not parallel bets.

---

## 1. Stage-1 inventory — what we actually have

### The six SKUs

| SKU | Stack | Buyer-paid infra/mo | LLM/API cost (typical buyer) | Buyer profile (real) | Moat |
|---|---|---|---|---|---|
| **BSK-001 AI UGC Agent** ($39) | Python FastMCP + TS MCP SDK, 5 reference servers (Meta/Google/Amazon/LinkedIn/Supermetrics) | $0–10 (Cloud Run idle) | $0 (auth-only servers) | Solo dev / agency engineer who needs the Meta-Ads MCP working today | The 5 working auth patterns. The 11K-MCP-in-the-wild "<5% monetized" framing is real. |
| **BSK-002 Ads Operator** ($149) | LangGraph + 5 ad-platform MCPs + Postgres + Telegram/Discord HITL | $20–40 (small VM + Postgres) | $30–80 (Sonnet for planning, ~5K decisions/mo) | Agency operator running 1–5 D2C brands | Twelve ad-ops recipes + memory of decisions + true blended ROAS via PostHog. Hard to clone. |
| **BSK-003 Sales Agent** ($99) | LangGraph + Gmail OAuth + pgvector + Discord HITL + LiteLLM | $15 | $20–40 (1K emails/mo) | Vertical B2B founder, agency SDR substitute | 8 recipes + per-recipe autonomy thresholds. Distribution moat = AGCO-Toronto Glitch Budz proof. |
| **BSK-004 Social Media Agent** ($129) | Sheet-driven posting + Kling 2.0 video + Upload-Post + ORM classifier | $20 (R2 + small VM) | $40–120 (Kling video is the cost) | Agency running 3–5 brands' social | Upload-Post integration covers 5 brands × 10+ platforms with one key — that's the unlock. |
| **BSK-005 Voice AI** ($149) | LiveKit Agents JS + Sarvam STT + GPT-4o-mini + ElevenLabs + R2 + SIP | $30 base + $0.02/min calls | $0.02/min raw (vs Bland $0.10) | Indian Shopify merchant doing COD confirms; AI receptionist builders | **Sarvam (10 Indian languages) + sub-second latency at $0.02/min.** This is the only SKU with a real competitive cost edge. |
| **BSK-006 Shopify SaaS Boilerplate** ($99) | React Router + Cloudflare Workers + 33-scope Custom App set + Billing API + GDPR webhooks | $5 (Workers) | $0–20 (depends on app) | Solo dev shipping a Shopify app to App Store | The validated 33-scope set + the rejected list. Saves real days of audit pain. |
| **AI Digital Marketing Stack** ($499) | All six | — | — | "Just give me everything" buyer | Bundle economics + Discord + future-SKU promise |

**If each became SaaS tomorrow — competitor map:**

- BSK-001 → Smithery, MCP.so directories, Cloudflare/Pipedream MCP runtimes. We don't compete; we feed them.
- BSK-002 → AdEspresso ($49–299/mo), Madgicx ($55–179/mo), AdCreative.ai ($29–149/mo), Revealbot. Crowded mid-market.
- BSK-003 → Apollo ($59–149/mo), Instantly ($37–97/mo), Smartlead ($39–94/mo), Clay ($149–349/mo). Brutal.
- BSK-004 → Buffer/Hootsuite + AI features, Predis.ai, ContentStudio. Saturated.
- BSK-005 → **Bolna ($0.06/min Hindi), Vapi ($0.05/min EN), Retell ($0.07/min EN), AssemblyAI/Deepgram + bring-your-own**. Voice-for-India is genuinely contested but not won.
- BSK-006 → No direct SaaS — it's a boilerplate. Stays as boilerplate.

### Off-product compounding assets (the ones that matter)

- **161-page SEO site** at `grow.glitchexecutor.com` — already ranked, already pulling. Re-platforming kills this.
- **PSEO matrix** — programmatic page generation infra exists.
- **Citation tracker + GSC integration** — proprietary GEO/AEO data.
- **Free tools** — top-of-funnel SEO magnet.
- **Discord community** — buyer-attached, low churn, lifetime-access bonus.
- **Social-media agent shipping content for the brand itself** — flywheel: BSK-004 markets BSK-001..006.
- **Shopify Custom App approval scar tissue** (BSK-006) — recoverable only the hard way.
- **Stripe + Razorpay dual rail + grant-access webhook** — the licence-grant pipe is built.

**These six assets are the moat. The boilerplates are the lead magnet.** Lose sight of that and we burn the wrong thing.

---

## 2. Stage-2 design — $10–29/mo hosted tier

The honest filter: hosted is only viable when **(a) the per-tenant variable cost is well below $10/mo at the median and (b) the control plane work is shared across tenants**. Run that against each SKU.

| SKU | Median tenant variable cost/mo | Hosted price | Margin | Verdict |
|---|---|---|---|---|
| BSK-001 MCP Pack | <$1 (idle MCP servers) | n/a — boilerplate, not a runtime | — | **Don't host.** Sell the Pack; let buyers self-deploy. Hosting an MCP per buyer is negative-value labour. |
| BSK-002 Ads Operator | LLM ~$40 + Postgres slice ~$2 | $29/mo BYOK or **$79/mo we-pay-keys** | Tight at $29 BYOK; healthy at $79 | **Host at $79+ tier only.** $29 doesn't survive Sonnet token costs unless we cap planning calls. India-mirror at ₹1,499 BYOK. |
| BSK-003 Sales Agent | LLM ~$25 + DB slice ~$2 | $19 BYOK / $49 we-pay | OK at $49 | **Host both tiers.** Sweet spot for solo founders. India ₹999 BYOK. |
| BSK-004 Social Media | Kling video $0.30/clip × 30 = $9 + Upload-Post + storage | $29 starter (5 posts/wk text only) / $79 (with video) | OK if we gate video volume | **Host with strict video quotas.** Without quotas, this bleeds. |
| BSK-005 Voice AI | Per-merchant: 1K calls × 1 min × $0.02 = $20 + R2 $1 + LiveKit base | **$29 base + ₹2/call (we keep ₹1)** | India: ₹3K–15K/mo realised | **Host — and this is the SKU where hosting is the actual product.** Indian merchants will not self-deploy LiveKit + SIP. |
| BSK-006 Shopify Boilerplate | n/a — boilerplate | — | — | **Don't host.** It IS the hosted-app architecture. Hosting it for someone else is "I'll be your dev shop" — not a SaaS. |

**Multi-tenant model recommendation per SKU:**

- **BSK-002, 003, 004:** dual mode. **BYOK default** (buyer brings Anthropic/OpenAI/Meta keys; we charge for orchestration + DB + UI). **We-pay tier** at 2.5× price for the no-keys-please buyer. BYOK is the moat against Lindy/Relevance: their pricing is opaque LLM markup; ours is transparent infra.
- **BSK-005:** **we-pay-keys is the only sane default** in India. Merchants don't have Sarvam accounts, won't get one, and the unit price (₹3–5/call) bakes in the LLM/STT/TTS cost. Token-vault stores LiveKit + Sarvam + ElevenLabs (ours, shared) and Shopify webhook secret (theirs).

**Onboarding flow (all SKUs):**

1. Stripe / Razorpay success → existing `grant-access.ts` webhook.
2. Add a fork: if SKU has hosted tier and buyer chose hosted, provision tenant: `<slug>.glitchgrow.app` subdomain (Cloudflare for SaaS), Postgres schema-per-tenant, encrypted token vault row.
3. **Token vault: Postgres `tenant_secrets` table, AES-256-GCM with a KEK in the Oracle box's systemd-creds, DEK per tenant.** Not Vault, not KMS — overkill for this scale. Document the rotation runbook.
4. **Configuration UI in v1, JSON file in v0.** v0 ships in 14 days as "drop your config.json in the dashboard, agent picks it up." v1 adds a forms-based editor in 60 days.

**Hardware ceiling on the current Oracle A1 (4 vCPU / 24 GB / 200 GB):**

| SKU | Footprint per tenant | Tenants on this box |
|---|---|---|
| BSK-002 | 1 LangGraph worker (memory 200 MB at idle, 600 MB peak) + Postgres schema | ~25 active |
| BSK-003 | Lighter — discovery batches | ~40 |
| BSK-004 | Heavy on disk (image/video staging) + ffmpeg CPU spikes | ~10 |
| BSK-005 | LiveKit worker per concurrent call (CPU-bound) | ~15 concurrent calls = 50–80 paying merchants depending on call concurrency |
| BSK-006 | n/a | — |

**Box-2 trigger:** when monthly hosted MRR > $1,500 OR sustained CPU > 60%, add a second A1 (free tier still). Realistic ceiling per box is 30–40 paying tenants across a SKU mix.

---

## 3. Stage-3 lane comparison

### Lane A — Vertical SaaS (pick one SKU, scale)

The only credible pick is **BSK-005 (Voice AI for Indian D2C / Shopify COD)**. BSK-002 is a tougher fight against US-funded incumbents and has weaker India unlock.

**Competitor honesty (BSK-005 lane):**

- **Bolna AI** — strong India brand, $0.06/min Hindi, raised seed. Targets enterprise + dev API.
- **Vapi** — $20M+ raised, US-centric, English-first, $0.05/min, dev-API.
- **Retell** — same neighborhood, English-strong, $0.07/min.
- **Plivo CX, Exotel AI Voicebot** — incumbents bolting AI on; legacy SIP advantage; weak agent quality.

**Where we win:** **vertical wedge — "COD confirmation for Indian Shopify merchants" — not "voice AI platform."** Bolna/Vapi sell APIs to developers. We sell a Shopify-app-installed, turnkey, ₹3/call service to merchants. Different buyer, different price, different motion. The boilerplate licence becomes a backstop ("agencies can self-host the same engine for white-label").

- 1-year revenue model: low 30 merchants × ₹5K = ₹1.5L/mo · mid 100 × ₹8K = ₹8L/mo · high 250 × ₹10K = ₹25L/mo (~$30K/mo).
- Engineering: 8–12 founder-weeks to merchant-facing Shopify app + dashboard + billing meter.
- Asset reuse: ~75% (BSK-005 engine, BSK-006 Shopify boilerplate, Stripe/Razorpay rail, grant-access). The kept boilerplate sales fund this.
- Distribution: Shopify App Store (BSK-006 is the launchpad) + AGCO/Toronto Indian-merchant Discord/WhatsApp + the existing SEO surface re-aimed at merchants.

### Lane B — Horizontal agent platform (Lindy class)

- **Competitors:** Lindy ($50M+), Relevance AI ($40M+), Stack AI, Gumloop, Sim Studio, n8n AI, Make.com AI agents. All have visual builders, integrations marketplaces, hosted runtimes, and 6–8 figure runways.
- **Founder-fit angle:** there isn't one that's defensible at solo-founder scale. Visual-builder UX alone is ~6 person-months of work to be tolerable. Integrations marketplace is a network-effect game. **This lane is a graveyard for solo founders without funding.**
- 1-year revenue: low ₹0 (most likely) · mid $5K MRR · high $20K MRR.
- Engineering: 30+ founder-weeks to MVP that doesn't embarrass.
- Asset reuse: ~25%. Most of what we have doesn't transplant.
- **Skip.**

### Lane C — AI-agent infra (Modal / Render for agents)

- **Competitors:** Modal ($16M+), Beam, LangGraph Platform (LangChain), Mastra Cloud, Inngest ($21M+), Restate, AgentOps (obs only), Vercel AI SDK serverless. Modal alone has more engineers than Glitch will have for years.
- **Where India/SMB angle could exist:** "deploy your CrewAI/LangGraph agent + HITL via Discord/Telegram + cost dashboard, ₹999/mo, no AWS account needed." Bolted on top of: a base image, Discord/Telegram approval webhook router (we already have it), per-run cost meter, and a proxy LiteLLM key vault.
- Realistic problem: infra products require 99.9% reliability + on-call. Solo founder + 10 hrs/week ≠ infra reliability. The first multi-day outage kills the product.
- 1-year revenue: low ₹0–$2K/mo · mid $5K/mo · high $15K/mo.
- Engineering: 16–24 founder-weeks to credible MVP.
- Asset reuse: ~40% (HITL router, observability patterns, billing rail).
- **Skip for now. Revisit at month 18 if Lane A is healthy** — the infra play is a natural _extension_ from a working SaaS, not a from-scratch bet.

---

## 4. Recommendation + sequencing

### Recommendation: **Lane A — vertical SaaS on BSK-005, branded as Glitch Voice (or kept as Glitch Grow Voice).** Stage-2 hosted tiers across BSK-002/003/004 happen in parallel _because the same multi-tenant control plane serves all of them_, but they are revenue support, not the strategic bet.

The bet is: "We are the COD-confirm + voice-receptionist service for Indian Shopify merchants." Everything else funds it.

### 30-day (by 2026-06-07)
- Build hosted v0 control plane: tenant table, token vault, subdomain provisioning, dashboard shell. One SKU live: **BSK-003** (cheapest to host, lowest support load — proves the rail).
- BSK-005 merchant-facing Shopify app design doc + 3 pilot merchants signed (free month) from existing AGCO/D2C contacts.
- Kill criterion: if 3 pilot merchants can't be lined up in 30 days, the wedge is wrong; revisit Lane A SKU choice.

### 90-day (by 2026-08-07)
- BSK-005 hosted live in Shopify App Store (unlisted/dev-store first), 10 paying merchants, MRR ≥ ₹50K (~$600).
- BSK-002 + BSK-003 hosted tiers public; combined ≥ 15 paying tenants, MRR ≥ $500.
- Kill criterion: <5 paying voice merchants by day 90 → pause Lane A, double down on boilerplate licence sales.

### 6-month (by 2026-11-07)
- BSK-005 hosted: 50 merchants, MRR ≥ ₹3L (~$3.5K).
- All BSK SKUs have a hosted variant (BSK-001/006 stay licence-only).
- Box-2 added if needed.
- Kill criterion: combined hosted MRR < $4K → drop the weakest two hosted SKUs, focus all hours on BSK-005.

### 12-month (by 2027-05-07)
- BSK-005 hosted: 100+ merchants, MRR ≥ ₹8L (~$10K), CAC payback < 60 days.
- Decide Lane C revisit: if BSK-005 hit, can we extract the multi-tenant control plane as a public agent-infra product? Only then.
- Hard kill: total Glitch Grow MRR < $5K → fold hosted, return to pure boilerplate sales + service work.

**Existing buyers:** every Codeberg-licensee keeps repo access forever. Hosted is additive. The AI Digital Marketing Stack bonus "all future SKU additions free for 12 months" applies to new boilerplates, **not** hosted credits — clarify this on the bundle page before launching hosted.

---

## 5. Brand + naming

The SEO equity on `grow.glitchexecutor.com` is real and already indexed for "AI ads agent boilerplate," "MCP server starter," "voice AI Shopify COD" type queries. **Do not move it.**

Recommended structure:

- `grow.glitchexecutor.com` — stays the boilerplate catalog + content + free tools (the magnet).
- `app.glitchgrow.com` (or `app.glitchexecutor.com`) — the hosted control plane. Same brand visually, separate runtime.
- `*.glitchgrow.app` — per-tenant subdomains.
- **No spinout brand for at least 12 months.** A "Glitch Voice" sub-brand becomes worth carving out only if BSK-005 hosted hits ≥ ₹5L MRR. Until then, sub-branding fragments effort.

A future spinout (Lane C revival, or a breakout BSK-005 win) can take a clean name (`glitchcloud.dev`, `glitchvoice.in`) and 301 the relevant cluster from `grow.glitchexecutor.com` — but that's a 2027 question.

---

## 6. Open questions for Tejas

1. Hosted launch SKU — is **BSK-003 first (lowest risk)** acceptable, or do you want to lead with BSK-005 (highest strategic value, hardest to ship)?
2. Pilot merchants for BSK-005 — do you have 3 names you can DM today, or do we need outreach work first?
3. BYOK vs we-pay default — comfortable with BYOK as the headline price, we-pay as the upsell?
4. Subdomain — `glitchgrow.app` (already implied) or stay on `*.glitchexecutor.com`?
5. India billing — Razorpay subscriptions for hosted (recurring), or Razorpay one-shot top-ups (prepaid wallet model, lower compliance)?
6. AI Digital Marketing Stack 12-month "future SKU" bonus — confirm it covers boilerplates only, **not** hosted credits, so we can publish that clarification?
7. License clarity — BSL 1.1 source-available is fine for boilerplates; for the hosted control plane (the multi-tenant code itself), are you OK keeping it proprietary-but-running-on-our-infra (still BSL-compatible since source isn't withheld from buyers, just not separately published)?
8. Kill date — if 90-day pilot misses targets, do you want a hard pivot to "service the existing buyers + sell more licences" rather than persist on the SaaS bet?

---

**Bottom line:** keep the boilerplate catalog as the SEO + lead-gen flywheel; ship BSK-003 hosted in 30 days as the rail-prover; ship BSK-005 in the Shopify App Store in 90 days as the actual strategic bet; treat Lane B and Lane C as 2027 questions earned only by Lane A's success.
