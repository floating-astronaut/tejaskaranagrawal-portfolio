# BSK-003 — README audit + rewrite plan

**Repo:** `glitch-executor/glitch-grow-sales-agent-private`
**Local:** `/home/support/glitch-grow-sales-agent-private/`
**Current README:** 47 lines, 5 sections.

## Audit (current state)

| Surface | Score | Notes |
|---|---|---|
| Install steps | **3/10** | Same overlay-doc problem as BSK-002 — assumes the public engine is already cloned. The buyer-only-sees-private path is undocumented. |
| First-run walkthrough | **2/10** | No walkthrough. The buyer can't tell whether their install worked without sending real outbound. There's no "draft a fake email to a fixture lead" smoke test. |
| Env-var docs | **6/10** | `.env.example` is the best of the four — clearly grouped, comments explain GCP service-account impersonation, CASL footer requirements called out. But the README doesn't reference it. Postgres + pgvector requirement isn't called out as a prerequisite. |
| Failure modes | **0/10** | None. Known issues: GCP SA impersonation token expiry, Resend domain verification not done, Discord bot not invited to guild, Gmail OAuth refresh-token revocation, pgvector missing. |
| Resale playbook | **1/10** | The Glitch Budz brand fact-sheet exists in `brand/` but is the *example product*, not the buyer playbook. The buyer needs: how to onboard a vertical, how to price the Studio outbound tier, the discovery-radius tuning guide. |

## Proposed new README structure

```
# BSK-003 — LangGraph Sales Agent

## What this is (buyer framing)
Autonomous outbound: discover → enrich → draft → Discord-approve → send → learn.
Running today for Glitch Budz outbound (cannabis e-commerce SaaS).
You bought the engine + 8 recipes + the brand fact-sheet template + the
Discord HITL surface to sell vertical-focused outbound at $797/mo Studio
or $5K+/mo retainers.

## Prerequisites
- Python 3.11+
- Postgres 14+ with pgvector extension
- GCP project with Places API enabled + a service account with
  Places API permissions (impersonation pattern documented below)
- Resend account with verified sending domain
- Discord server + webhook
- Gmail account with OAuth app credentials (for sending)

## Quickstart (10 minutes)
1. Clone + `./scripts/quickstart.sh`
2. Smoke test: `python -m sales_agent.cli draft --fixture demo-lead`
   → drafts an email against a fake lead, prints to stdout (no send, no Discord)
3. First real run: `python -m sales_agent.cli discover --radius 8000`
   then approve drafts in Discord, then `--send` flag flips on real sends
4. Reply tracking: IMAP poll cron — set up via `scripts/setup-imap-cron.sh`

## Configuration (env vars ranked)
**Tier 1 — required:**
POSTGRES_RW_URL, GCP_PROJECT_ID, GCP_PLACES_TARGET_SA, RESEND_API_KEY,
RESEND_FROM_EMAIL, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_APPROVAL_CHANNEL_ID
**Tier 2 — required for production sending (not smoke test):**
GMAIL_OAUTH_REFRESH_TOKEN, IMAP_USER, IMAP_PASSWORD
**Tier 3 — tunables:**
DISCOVERY_CENTER_LAT/LNG/RADIUS_M, CASL_SENDER_NAME, CASL_SENDER_ADDRESS

## Architecture (1-page; link to /docs/architecture.md)

## The 8 email recipes
[1-liner each, listing the buyer-recognizable subject pattern]

## Per-recipe autonomy thresholds
The agent earns trust per recipe. Once recipe X has 5 approvals + 0 rejections,
it auto-sends within a daily cap. Tune via `RECIPE_AUTONOMY_THRESHOLD` env vars.

## Common errors + fixes
- "GCP impersonation 403": SA on the metadata server lacks
  `roles/iam.serviceAccountTokenCreator` on the target SA
- "Resend 422 domain not verified": go to Resend dashboard → domains
- "Discord bot not in guild": invite link with scopes=bot+applications.commands
- "pgvector extension not found": CREATE EXTENSION vector;
- "Gmail OAuth refresh failed": tokens expire after 6 months unverified;
  publish your OAuth app or refresh manually
- "CASL footer missing on cold mail": legally required in Canada — never disable

## Resale playbook (NEW)
- The Studio tier: $797/mo, 1,000 emails/mo, 3 senders. Cost-of-goods
  breakdown so you know your margins.
- The Retainer tier: $5K+/mo, vertical-focused, multi-brand. When to upsell.
- Vertical onboarding SOP (the brand fact-sheet template — adapted from
  brand/glitch-budz.md — fill it in for any new vertical in 90 minutes)
- The first-client outreach kit:
  - LinkedIn DM template
  - Discovery-call script
  - Pricing one-pager PDF
- Discovery radius tuning: how to pick your geo + ICP density (the 8km
  default is North York; recipe to recompute for your market)
- Compliance crib sheet: CASL (Canada), CAN-SPAM (US), GDPR (EU) — when
  each applies, what each requires

## Support
- Discord: <link>
- Buyer-portal: <link>
- Walkthrough video: <link>
```

## Specific changes vs current

1. **REWRITE TONE** — same overlay-doc problem as BSK-002. Buyer copy not internal copy.
2. **ADD** Quickstart with `--fixture demo-lead` smoke test. **Block on:** fixture creation. Spec: a single fake business in `tests/fixtures/demo_lead.json` with name/website/email such that the drafter produces a deterministic-ish output for human review.
3. **ADD** the 8 recipes surfaced.
4. **ADD** "Common errors" — 6 entries minimum (this BSK has the most distinct failure modes).
5. **ADD** Resale playbook. The Glitch Budz brand fact-sheet IS the template — point at it explicitly as the pattern, not the only example.
6. **CLARIFY** Gmail vs Resend — the current `.env.example` references Resend but the marketing copy says "Gmail outbound." Pick the canonical path or document both. Recommend: Resend as the default (already wired), Gmail OAuth as advanced.
7. **MOVE** "Why it's private" / "Development" to CONTRIBUTING.md.

## Estimated scope
- README rewrite: 3 hours.
- Demo-lead fixture + `draft --fixture` command: 2 hours.
- Recipes catalog surfaced: 1 hour.
- Playbook copy: 5–7 hours.
- Total: ~13 hours.

## Tejas decision needed
- Resend vs Gmail OAuth: which is the default story for buyers? `.env.example`
  says Resend, marketing says Gmail. Recommend Resend (less auth pain, faster
  to first email) — Gmail becomes the upsell for "warm inbox" reputation.
