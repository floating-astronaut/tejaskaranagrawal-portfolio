# AGENTS.md — AI Sales Agent (BSK-003)

> **For AI coding agents** (Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor — anything that reads project files + runs shell commands) operating this repository on behalf of a non-technical buyer. Follow this file end-to-end when the user says any of: *"set this up"*, *"install this agent"*, *"get me running"*, *"deploy"*, or pastes the welcome-email prompt.

This file is the canonical install + operate guide. The README is for human readers; this file is the actionable contract you execute against.

---

## What this agent is

Production AI sales agent for B2B outbound. Discovers prospects from Google Maps + registry data, enriches with public signals, drafts personalised email per a tunable recipe library, escalates to Discord for one-tap approval, sends through Gmail, tracks replies, and writes every decision to memory. The same engine running outbound for Glitch Budz inside Glitch Executor Labs.

The buyer paid one-time for the source. After install they will use it to:
- Run vertical-focused B2B outbound for one or more clients
- Bill Studio outbound at $797/mo (1,000 emails/mo, 3 senders) or agency retainers at $5K+/mo
- Deploy on their own infra; you (the AI assistant) help them set it up

## Operating principles

When you operate this repo:

1. **Never assume the buyer has CLI experience.** Run commands yourself, surface only the output that matters, ask for keys/values in plain language.
2. **Ask for one thing at a time.** Don't dump a list of 10 env vars and expect them to fill it in. Ask, wait, paste, validate, next.
3. **Validate as you go.** After Gmail OAuth lands, send a test draft to the buyer's own inbox. After Postgres is wired, run a connection check.
4. **Default to fixture data for smoke tests.** Run `cli draft --fixture demo-lead`. Never pull real Google Maps results until the buyer explicitly says "do it for real."
5. **Stop on the first error.** Don't retry blindly. Surface the error verbatim, suggest one fix, ask before retrying.
6. **HITL is not optional.** The agent ships with Discord-approval-before-Gmail-send hard-wired. Don't bypass it on any pretext, even for "just a test."

---

## Setup

Run these in order. Stop if any step fails and surface the error to the buyer.

### 1. Detect host environment

```bash
uname -s        # macOS / Linux / WSL
which python3   # need 3.11+
which pnpm      # need 9+ (used for utility scripts)
which docker    # optional but recommended for Postgres
which psql      # only if not using Docker
```

If any required tool is missing, ask the buyer's permission to install it. macOS: `brew`; Ubuntu/Debian: `apt`; Windows: WSL + apt. Do not install to the system without consent.

### 2. Install Python deps

```bash
python3 -m venv .venv
source .venv/bin/activate     # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

Expected: `pip` prints "Successfully installed glitch-grow-sales-agent-…" with no errors.

### 3. Bring up Postgres + pgvector

This agent uses pgvector for outcome embeddings (which drafts converted vs ignored). The Docker path is the default because pgvector requires the extension.

```bash
docker run -d \
  --name glitch-sales-postgres \
  -e POSTGRES_USER=glitch \
  -e POSTGRES_PASSWORD=$(openssl rand -hex 16) \
  -e POSTGRES_DB=sales_agent \
  -p 5434:5432 \
  -v glitch-sales-pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg16
```

After this runs, capture the password and write it into `.env` as
`DATABASE_URL=postgresql://glitch:<password>@localhost:5434/sales_agent`.

Then enable the extension once:

```bash
docker exec glitch-sales-postgres psql -U glitch -d sales_agent -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 4. Run migrations

```bash
alembic upgrade head
```

Expected: prints `Running upgrade … -> …` for each migration, ends with no error.

### 5. Configure `.env`

Copy the template, then populate keys interactively. **Never paste a buyer's keys into chat or commit them.**

```bash
cp .env.example .env
```

Fill these one at a time:

| Var | What to ask | How they get it |
|---|---|---|
| `LITELLM_API_KEY` | "Paste your LiteLLM proxy key, or leave blank to use OpenAI/Anthropic directly." | https://litellm.ai · Settings · API keys |
| `ANTHROPIC_API_KEY` (alt) | "If skipping LiteLLM, paste your Anthropic API key." | https://console.anthropic.com/settings/keys |
| `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET` | "We need a Google Cloud OAuth client for Gmail send. We'll walk through it now." | console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 client (type: Desktop app). Walk the buyer through the consent screen + scopes (`gmail.send`, `gmail.readonly`). |
| `DISCORD_WEBHOOK_URL` | "Paste a Discord webhook URL for HITL approvals." | Discord Server → Channel → Settings → Integrations → Webhooks → New Webhook → Copy URL |
| `DISCORD_BOT_TOKEN` | "Paste a Discord bot token — we use it to read approve/reject reactions on draft messages." | discord.com/developers → New Application → Bot → Reset Token |
| `SENDER_DOMAIN` | "What domain will you send from? (e.g. yourdomain.com)" | Buyer provides; we'll verify SPF + DKIM later via `pnpm verify:dns` |
| `MAPS_API_KEY` (optional) | "Paste your Google Maps Platform API key, or skip — discovery falls back to AGCO registry / OpenStreetMap." | console.cloud.google.com → Maps Platform → Credentials |

After every variable lands, run a one-line validator:

```bash
# After DATABASE_URL:
python -c "import os, psycopg; psycopg.connect(os.environ['DATABASE_URL']).close(); print('db ok')"

# After Gmail OAuth wiring:
pnpm oauth:gmail   # interactive — opens browser, captures refresh_token

# After DISCORD_WEBHOOK_URL:
curl -s -X POST "$DISCORD_WEBHOOK_URL" -H 'content-type: application/json' \
  -d '{"content":"✅ Sales agent install reached HITL config step."}'
# Expected: 204; buyer sees the message in their Discord.
```

---

## Test

Before declaring install complete, run the smoke test:

```bash
source .venv/bin/activate
cli draft --fixture demo-lead
```

Expected output:

```
✓ draft generated for fixture lead "Acme Dental"
  recipe: founder-led-v2
  subject: "Quick question about your patient acquisition"
  body: 287 chars · 0 reply-friction issues · sentiment OK
  → posted to Discord for approval (NOT sent)
```

The draft lands in the buyer's Discord channel as a preview — they approve/reject/edit there before any real send. If this passes, install is functionally complete. Tell the buyer: *"You're live. Try this in Claude Code: 'Find 5 dental clinics in {city} and queue drafts for review.'"*

---

## Run

After install, the buyer talks to the agent through commands the AI assistant executes:

| Buyer says | You run |
|---|---|
| "Find {N} {vertical} in {city} and queue drafts" | `cli discover --vertical {v} --city {c} --limit {N}` then `cli draft --queue` |
| "Show me what's awaiting approval" | `cli queue --pending` (lists the Discord-pending drafts) |
| "Send everything I approved in Discord" | `cli send --approved` (Gmail bulk-send for approved drafts only) |
| "What's our reply rate this week?" | `cli stats --window 7d` |
| "Add a new sender" | walk the buyer through OAuth for the second sender, then `cli sender add --email <addr>` |
| "Add a new client / vertical" | walk through copying `clients/demo.yaml` to `clients/{slug}.yaml` and editing |

For long-running ops (`cli discover`, `cli send`), surface progress every 10–30 seconds.

For the multi-client setup, every command takes `--client {slug}`. Slug is the filename in `clients/`.

---

## Update

When the buyer says "update the agent":

```bash
git pull
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
cli draft --fixture demo-lead    # confirm still passes
```

If `git pull` shows merge conflicts in `clients/` or `.env`, those are buyer-edited — ask before resolving.

---

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `gmail.errors.HttpError 401 invalid_grant` | OAuth refresh token expired (90-day inactivity) | Re-run `pnpm oauth:gmail` — generates new refresh_token, updates `.env` |
| `psycopg.errors.UndefinedFunction: function vector_l2_distance` | pgvector extension not enabled | `docker exec glitch-sales-postgres psql -U glitch -d sales_agent -c "CREATE EXTENSION IF NOT EXISTS vector;"` |
| Discord approve-reaction not picked up | bot lacks `READ_MESSAGE_HISTORY` + `ADD_REACTIONS` perms in the channel | Re-invite bot with proper scope; details in `docs/discord-setup.md` |
| Drafts hanging in "queued" forever | `cli send --approved` never run; the bot drafts but doesn't auto-send | Tell the buyer Discord-approval is required + buyer must run `cli send --approved` (or set `AUTO_SEND_AFTER_APPROVE=true` in `.env` if they trust the recipe enough) |
| `litellm.AuthenticationError` | bad LiteLLM key | Regenerate at https://litellm.ai · Settings · API keys |

---

## Resale playbook (where the buyer's revenue comes from)

The `playbook/` folder has the full version. Quick numbers:

- **Studio outbound**: $797/mo per client (1,000 emails/mo, 3 senders). Two clients = $1,594/mo recurring.
- **Agency retainer**: $5,000+/mo per client for a vertical-focused outbound program. Write the recipes, manage the senders, deliver leads.
- **Per-domain warmup add-on**: $297/mo per new sender domain.

When pitching: lead with the deliverability-vs-Smartlead/Instantly angle (Glitch Grow gives them senders + deliverability + agentic discovery, Smartlead is sender-only). Smart prospects in this market care about reply rate, not feature lists.

---

## Support

- **Discord** (`#sales-agent`): https://discord.gg/HBZFKMts
- **Email**: support@glitchexecutor.com — reply with payment_id
- **Refund**: 14 days from purchase, no questions

If install breaks and the AI assistant can't resolve it, escalate to support BEFORE any destructive action (DB drop, OAuth revoke, etc.).
