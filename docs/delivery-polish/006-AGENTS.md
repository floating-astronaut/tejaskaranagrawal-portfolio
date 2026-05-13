# AGENTS.md — AI SEO Agent (BSK-006)

> **For AI coding agents** (Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor — anything that reads project files + runs shell commands) operating this repository on behalf of a non-technical buyer. Follow this file end-to-end when the user says any of: *"set this up"*, *"install this agent"*, *"get me running"*, *"deploy"*, or pastes the welcome-email prompt.

This file is the canonical install + operate guide. The README is for human readers; this file is the actionable contract you execute against.

---

## What this agent is

Production AI SEO agent for site audits, schema markup, llms.txt generation, internal-link planning, and Shopify metafield writing. Plugs into Claude Code as an MCP-shaped CLI. Drives both traditional SEO (rank deltas, meta tags, content briefs) and AI-search readiness (citation-targeted content shape, llms.txt, schema graph). The same engine running grow.glitchexecutor.com/app inside Glitch Executor Labs.

The buyer paid one-time for the source. After install they will use it to:
- Run managed SEO + AI-search ops for one or more sites
- Bill $1,497/mo per site for a managed retainer (or ₹25,000/mo for Indian D2C brands)
- White-label and resell across multiple clients on a single deployment

## Operating principles

When you operate this repo:

1. **Never assume the buyer has CLI experience.** Run commands yourself, surface only what matters.
2. **Ask for one thing at a time.** GSC, GA4, and Shopify creds are separate flows; don't dump them on the buyer at once.
3. **Validate after every credential.** A 401 on Search Console is a different problem from a 401 on Shopify Admin.
4. **Default to dry-run mode for Shopify metafield writes.** Use `cli audit --site {url} --dry-run` until the buyer says "ship it for real."
5. **Stop on first error.** Surface the error verbatim, suggest one fix, ask before retrying.

---

## Setup

### 1. Detect host environment

```bash
uname -s
which node          # need 20+
which pnpm          # need 9+
which docker        # optional but recommended for Postgres
```

### 2. Install Node deps

```bash
pnpm install
```

Expected: pnpm finishes with no peer-dep warnings.

### 3. Bring up Postgres + pgvector

```bash
docker run -d \
  --name glitch-seo-postgres \
  -e POSTGRES_USER=glitch \
  -e POSTGRES_PASSWORD=$(openssl rand -hex 16) \
  -e POSTGRES_DB=seo_agent \
  -p 5436:5432 \
  -v glitch-seo-pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg16
```

Capture the password into `.env` as `DATABASE_URL=postgresql://glitch:<password>@localhost:5436/seo_agent`.

Enable pgvector once:

```bash
docker exec glitch-seo-postgres psql -U glitch -d seo_agent -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 4. Run migrations

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

### 5. Configure `.env`

```bash
cp .env.example .env
```

Fill these one at a time:

| Var | What to ask | How they get it |
|---|---|---|
| `LITELLM_API_KEY` | "Paste your LiteLLM proxy key, or leave blank to use OpenAI/Anthropic directly." | https://litellm.ai · Settings · API keys |
| `ANTHROPIC_API_KEY` (alt) | "If skipping LiteLLM, paste your Anthropic API key." | https://console.anthropic.com/settings/keys |
| `GSC_SERVICE_ACCOUNT_JSON` | "We need a Google service account with Search Console read access. We'll walk through it now." | console.cloud.google.com → APIs & Services → Service accounts → Create + JSON key → Search Console site Settings → add SA email as Owner |
| `GA4_PROPERTY_ID` | "Paste your GA4 property ID (looks like `properties/123456789`)." | analytics.google.com → Admin → Property → Property details |
| `GA4_SERVICE_ACCOUNT_JSON` | (same SA can read GA4; we'll grant Viewer access on the property) | analytics.google.com → Admin → Property Access → Add the SA email as Viewer |
| `SHOPIFY_ADMIN_TOKEN` (optional) | "Skip if you're SEO-only. Otherwise paste a custom-app Admin token." | Shopify Admin → Settings → Apps and sales channels → Develop apps → Create custom app → API access → Admin token |
| `SHOPIFY_STORE_DOMAIN` | "Paste your `*.myshopify.com` domain." | Shopify Admin → top of page |
| `OPENAI_API_KEY` (optional) | "If using gpt-image-2 for visual schema mockups, paste your OpenAI key." | https://platform.openai.com/api-keys |

Validate as you go:

```bash
# After GSC_SERVICE_ACCOUNT_JSON:
pnpm gsc:test --site {buyer-site-url}    # lists last-7d top pages

# After GA4_PROPERTY_ID + GA4_SERVICE_ACCOUNT_JSON:
pnpm ga4:test       # prints active-users metric

# After SHOPIFY_ADMIN_TOKEN:
pnpm shopify:test   # reads store name + locale, no writes
```

---

## Test

```bash
pnpm cli audit --site {buyer-site-url} --dry-run
```

Expected: prints an audit report (top issues found, schema gaps, missing llms.txt, internal-link orphans), but writes nothing.

If this passes, install is functionally complete. Tell the buyer: *"You're live. Try this in Claude Code: 'Audit my site and propose schema + llms.txt updates.'"*

---

## Run

| Buyer says | You run |
|---|---|
| "Audit {site}" | `pnpm cli audit --site {site}` (read-only, generates report) |
| "Ship schema + llms.txt for {site}" | `pnpm cli ship --site {site} --bundle schema-llms` (HITL prompt before each write; on Shopify, writes via Admin metafield) |
| "Plan internal links for {site}" | `pnpm cli links --site {site}` (graph analysis + recommended edges) |
| "Write a content brief for {keyword}" | `pnpm cli brief --kw "{keyword}" --site {site}` |
| "Show GSC ranking deltas this week" | `pnpm cli rank --site {site} --window 7d` |
| "Add a new site" | walk through copying `sites/demo.yaml` to `sites/{slug}.yaml` |

For multi-site deployments, every command takes `--site {url}` or `--site-slug {slug}`.

---

## Update

```bash
git pull
pnpm install
pnpm prisma migrate deploy
pnpm prisma generate
pnpm cli audit --site {known-site} --dry-run    # confirm still passes
```

---

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `googleapis 403 user does not have access` | SA email not added to GSC site / GA4 property | Walk buyer through adding the SA email as Owner (GSC) / Viewer (GA4) |
| `Shopify 401 unauthorized` | Custom-app token lacks `read_metafields, write_metafields, read_products, write_products` scopes | Recreate the custom app with full SEO-relevant scopes; the repo lists them in `docs/shopify-scopes.md` |
| `pgvector` extension missing | Step 3 was skipped | Run the `CREATE EXTENSION IF NOT EXISTS vector;` command from step 3 |
| `cli ship` writes nothing despite no error | Dry-run mode left on | Re-run without `--dry-run`, or `unset SEO_DRY_RUN` if env-flagged |
| llms.txt not picked up by AI search | Domain doesn't have a robots.txt allowing GPTBot/ClaudeBot/PerplexityBot | The agent's `cli audit` flags this; have buyer update robots.txt per the audit recommendation |

---

## Resale playbook

Quick numbers:

- **Managed SEO retainer**: $1,497/mo per site (US) / ₹25,000/mo (India). Fully-managed: audits + monthly schema + llms.txt + content briefs + ranking reports.
- **AI-search add-on**: $497/mo per site for the AI-search-ready bundle (llms.txt + structured-data graph + citation-targeted content shape). Layer on top of any existing SEO retainer.
- **Launch-and-tune engagement**: $5,000+ one-time per site for a full audit + 90-day implementation push.

When pitching: lead with "AI search is the new SEO" — incumbents (SEMrush, Ahrefs, Surfer) are still selling keyword tools; you're shipping outcome-grade work. Most buyers in this market care about traffic delta in 90 days, not feature parity.

---

## Support

- **Discord** (`#seo-agent`): https://discord.gg/HBZFKMts
- **Email**: support@glitchexecutor.com — reply with payment_id
- **Refund**: 14 days from purchase
