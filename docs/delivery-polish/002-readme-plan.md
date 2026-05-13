# BSK-002 — README audit + rewrite plan

**Repo:** `glitch-executor/glitch-grow-ads-agent-private`
**Local:** `/home/support/glitch-grow-ads-agent-private/`
**Current README:** 38 lines, 5 sections.

## Audit (current state)

| Surface | Score | Notes |
|---|---|---|
| Install steps | **3/10** | The README assumes the buyer also has the public engine repo. It says `pip install git+ssh://...private` but doesn't tell you that without the public repo cloned + installed, the agent won't run. The actual install path for a paying buyer (who only sees the private repo) is undocumented. |
| First-run walkthrough | **1/10** | None. README is entirely about overlay semantics. A buyer cloning this and running `python -m ads_agent` gets... what? No smoke test, no "dry-run a plan" command shown. |
| Env-var docs | **5/10** | `.env.example` exists and is well-commented, but the README never mentions it. Buyer has to discover it. Also: `STORES_JSON` is a mandatory blob without an explanation of how to construct one for a single-brand buyer. |
| Failure modes | **0/10** | No troubleshooting. The known sharp edges (Meta token expiry, TikTok sandbox-vs-production confusion, Postgres `pgvector` extension missing, Discord webhook 404) are entirely undocumented. |
| Resale playbook | **0/10** | This is **the biggest gap**. The buyer paid $149 for an "ads ops agent that runs 7 stores" and the README is internal-team copy ("the operator's edge"). No pricing-tier guidance, no client onboarding template, no SOP for the first agency client. |

## Proposed new README structure

```
# BSK-002 — LangGraph Ads Operator

## What this is (buyer framing, not internal)
The autonomous ads agent running paid ads across Meta + Google + TikTok for
7 production brands. You bought the engine + 12 ad-ops recipes + the playbook
to sell this as a $1.5K/mo retainer.

## Prerequisites
- Python 3.11+
- Postgres 14+ with pgvector extension (one-line install: ...)
- A Linux VM (1 vCPU, 2 GB RAM minimum — this DOES NOT run on serverless)
- Discord webhook + Telegram bot (5-min setup, link to docs)

## Quickstart (run the agent against a fake brand in 10 minutes)
1. Clone the repo + `./scripts/quickstart.sh`
2. Smoke test: `python -m ads_agent.cli plan --brand demo --dry-run`
   → outputs a planned action set against a fixture brand, no API calls
3. Wire your first real brand: edit `.env` STORES_JSON (template in /docs/configs/)
4. Run live: `python -m ads_agent run --brand <slug>`
5. First Discord ping should arrive within 60s

## Configuration (the env vars, ranked by required-ness)
**Tier 1 — required for any operation:**
- POSTGRES_RW_URL, STORES_JSON, META_ACCESS_TOKEN, DISCORD_WEBHOOK
**Tier 2 — required per platform you enable:**
- TIKTOK_APP_ID/SECRET (skip if not running TikTok)
- GOOGLE_ADS_DEV_TOKEN (skip if not running Google)
**Tier 3 — optional polish:**
- POSTHOG_API_KEY (true blended ROAS — skip with degraded ROAS calc)

## Architecture (one-page summary, link to docs/architecture.md for deep dive)

## Recipes shipped (12 named, 1-line each)

## Common errors + fixes
- "pgvector extension not found" → CREATE EXTENSION vector;
- "Meta token expired" → regenerate via Graph API Explorer, set META_ACCESS_TOKEN
- "Discord 404 on webhook" → webhook URL must be the full https://discord.com/api/webhooks/... not the channel ID
- "TikTok sandbox returns empty data" → switch TIKTOK_ENV=production once your app is approved
- "Agent loops on the same brand" → check STORE_AD_ACCOUNTS_JSON for empty arrays

## Resale playbook (NEW — this is what buyers paid for)
- Pricing: $1,497/mo per brand managed-ads (US) / ₹25K/mo (India)
- The 3-tier ladder: Solo / Studio / Multi-Brand with concrete features per tier
- Client onboarding SOP (10-step, ~3 hours per new brand)
- The first-client outreach kit:
  - LinkedIn DM template (verbatim)
  - Loom-script for the discovery call (4 min)
  - Pricing one-pager PDF (in /docs/sales/)
- Operator playbook: how to run 5 brands in 90 min/day
- Pricing rationale (why $1,497 not $999, with breakdown of cost-of-goods)

## Support
- Discord: <link>
- Buyer-portal: <link>
- Walkthrough video: <link>
```

## Specific changes vs current

1. **REWRITE TONE** — the current README is internal team copy ("the operator's edge", "iteration on real ₹"). Buyer-facing copy needs to be "here's what you have, here's how you ship it."
2. **ADD** Quickstart with a fake-brand fixture. **Block on:** the fixture needs to exist. Spec it: `docs/fixtures/demo-brand.json` with placeholder Meta/Google IDs that resolve to a no-op planner pass.
3. **ADD** Tier 1/2/3 env-var ranking — current `.env.example` is flat and overwhelming.
4. **ADD** the 12 recipes catalog (just names + 1-liners). They exist in code but aren't surfaced.
5. **ADD** "Common errors" — 5 entries minimum.
6. **ADD** Resale playbook. **Block on:** the playbook copy needs to be written — pricing rationale, onboarding SOP, first-client outreach. Estimate 6–8 hours of writing. Recommend Tejas drafts pricing + outreach in his voice; the rest can be templated.
7. **MOVE** "Why it's private" + "Development" sections to `/docs/CONTRIBUTING.md` — these are operator-context, not buyer-context.

## Estimated scope
- README rewrite: 3 hours.
- Demo-brand fixture + `--dry-run` plan command: 2 hours.
- Recipes catalog surfaced: 1 hour.
- Playbook copy: 6–8 hours (separate session).
- Total: ~14 hours.

## Tejas decision needed
- Some recipes overlap with the operator's actual production tuning (the things in `glitch_grow_ads_playbook/`). Are we comfortable surfacing the recipe **names** in the public-facing README? Recommend yes — the names are not the moat; the calibration is.
