# AGENTS.md — AI Ads Agent (BSK-002)

> **For AI coding agents** (Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor — anything that reads project files + runs shell commands) operating this repository on behalf of a non-technical buyer. Follow this file end-to-end when the user says any of: *"set this up"*, *"install this agent"*, *"get me running"*, *"deploy"*, or pastes the welcome-email prompt.

This file is the canonical install + operate guide. The README is for human readers; this file is the actionable contract you execute against.

---

## What this agent is

Production AI ads agent that runs paid acquisition across Meta, Google, and TikTok. Plans → analyzes → executes → reflects. Telegram + Discord HITL for any approval-worthy action. Memory in Postgres + pgvector. The same engine running paid acquisition for 7 production stores at Glitch Executor Labs.

The buyer paid one-time for the source. After install they will use it to:
- Run paid ads for one or more brands they own or manage
- Bill clients $1,497–$2,997/mo (or ₹25,000–₹75,000/mo in India) per brand for managed-ads as a service
- Deploy on their own infra; you (the AI assistant) help them set it up

## Operating principles

When you operate this repo:

1. **Never assume the buyer has CLI experience.** Run commands yourself, surface only the output that matters, ask for keys/values in plain language.
2. **Ask for one thing at a time.** Don't dump a list of 10 env vars and tell them to fill it in. Ask, wait, paste, validate, next.
3. **Validate as you go.** After each env var lands, run a one-line check (`pg_isready`, `curl https://graph.facebook.com/v22.0/me?access_token=...`) and tell the buyer what passed.
4. **Default to the smoke-test fixture.** When asked to test, run `cli plan --brand demo --dry-run`. Never run a real ads call until the buyer explicitly says "do it for real."
5. **Stop on the first error.** Don't retry blindly. Surface the error verbatim, suggest one fix, ask before retrying.

---

## Setup

Run these in order. Stop if any step fails and surface the error to the buyer.

### 1. Detect host environment

```bash
uname -s        # macOS / Linux / WSL
which python3   # need 3.11+
which pnpm      # need 9+
which docker    # optional but recommended
which psql      # optional, only needed if not using Docker for Postgres
```

If any of `python3`, `pnpm`, or `docker` is missing, ask the buyer's permission to install them via the host's package manager. On macOS use `brew`; on Ubuntu/Debian use `apt`; on Windows in WSL use `apt`. Do not install to the system without consent.

### 2. Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate     # Windows (PowerShell): .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

Expected outcome: `pip` prints "Successfully installed glitch-grow-ads-agent-…" with no errors.

### 3. Bring up Postgres

Two paths — pick the one that matches the host. Default to Docker if available; fall back to a system Postgres only if the buyer asks.

**Docker (recommended)** — copies cleanly across Mac / Linux / Windows-WSL:

```bash
docker run -d \
  --name glitch-ads-postgres \
  -e POSTGRES_USER=glitch \
  -e POSTGRES_PASSWORD=$(openssl rand -hex 16) \
  -e POSTGRES_DB=ads_agent \
  -p 5433:5432 \
  -v glitch-ads-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

After this runs, capture the password you generated above and write it into `.env` as `DATABASE_URL=postgresql://glitch:<password>@localhost:5433/ads_agent`.

**System Postgres** — only if the buyer already has one running:

```bash
psql -U postgres -c "CREATE DATABASE ads_agent;"
psql -U postgres -c "CREATE USER glitch WITH PASSWORD '<random>';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ads_agent TO glitch;"
```

### 4. Run database migrations

```bash
alembic upgrade head
```

Expected: prints `Running upgrade … -> …` for each migration, ends with no error.

### 5. Configure `.env`

Copy the template, then populate keys interactively. **Never paste a buyer's keys into chat or commit them.** Use `read -s` for each, write directly to `.env`.

```bash
cp .env.example .env
```

Then fill these in **one at a time**, asking the buyer for each in plain language:

| Var | What to ask | How they get it |
|---|---|---|
| `LITELLM_API_KEY` | "Paste your LiteLLM proxy key, or leave blank if you'll provide an OpenAI/Anthropic key directly." | https://litellm.ai · Settings → API keys |
| `OPENAI_API_KEY` (alt) | "If skipping LiteLLM, paste your OpenAI API key." | https://platform.openai.com/api-keys |
| `META_ACCESS_TOKEN` | "Paste your Meta long-lived system-user token. We need ads_management + business_management scopes." | https://business.facebook.com/settings/system-users → New System User → grant ad-account access → generate token. **Critical: pick "Never expires."** |
| `META_AD_ACCOUNT_ID` | "Paste your Meta ad account ID — looks like `act_123456789`." | https://business.facebook.com/billing — top of page |
| `GOOGLE_ADS_CUSTOMER_ID` | "Paste your Google Ads customer ID — 10 digits, with or without dashes." | https://ads.google.com — top-right of dashboard |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | "Paste your Google Ads developer token from the API Center." | https://ads.google.com/aw/apicenter |
| `GOOGLE_ADS_REFRESH_TOKEN` | "We'll walk through OAuth in a moment — leave this blank for now." | Generated by `pnpm oauth:google` (run after the rest of `.env` is filled) |
| `TIKTOK_ACCESS_TOKEN` | "Paste your TikTok Marketing API access token, or leave blank to skip TikTok for now." | https://business-api.tiktok.com — System Users |
| `TELEGRAM_BOT_TOKEN` | "Paste your Telegram bot token from @BotFather, or leave blank to use Discord-only HITL." | DM `@BotFather` → `/newbot` |
| `DISCORD_WEBHOOK_URL` | "Paste a Discord webhook URL for HITL approvals." | Server → Channel → Settings → Integrations → Webhooks → New Webhook → Copy URL |
| `BRAND_CONFIG_PATH` | (auto-set, no buyer input) | `./brand-configs/demo.yaml` for the smoke run |

After every variable lands, run a one-line validator and report pass/fail to the buyer:

```bash
# After META_ACCESS_TOKEN + META_AD_ACCOUNT_ID:
curl -s "https://graph.facebook.com/v22.0/$META_AD_ACCOUNT_ID?access_token=$META_ACCESS_TOKEN" | jq -r '.name // .error.message'
# Expected: prints the ad-account name. If it prints an error, surface it.

# After DATABASE_URL:
python -c "import os, psycopg; psycopg.connect(os.environ['DATABASE_URL']).close(); print('db ok')"

# After DISCORD_WEBHOOK_URL:
curl -s -X POST "$DISCORD_WEBHOOK_URL" -H 'content-type: application/json' \
  -d '{"content":"✅ Ads agent install reached HITL config step."}'
# Expected: 204; the buyer sees the message in their Discord.
```

---

## Test

Run the smoke test before declaring install complete:

```bash
source .venv/bin/activate
cli plan --brand demo --dry-run
```

Expected output:

```
✓ planner loop OK · 0 errors · agent online
  ↳ would propose 3 actions for brand=demo (none executed; --dry-run)
```

If this passes, the install is functionally complete. Tell the buyer: *"You're live. Try this in Claude Code: 'Run a real plan for the demo brand and show me what it'd do.'"*

---

## Run

After install, the buyer talks to the agent through commands the AI assistant can execute:

| Buyer says | You run |
|---|---|
| "Plan ads for {brand}" | `cli plan --brand {brand}` (waits for HITL approval before executing anything) |
| "Run the ads loop" | `cli run --brand {brand}` (long-running; stream output to the buyer) |
| "Show this week's ROAS" | `cli insights --brand {brand} --window 7d` |
| "Pause anything under {N} ROAS" | `cli rule pause --threshold {N}` |
| "Add a new brand called {name}" | walk the buyer through copying `brand-configs/demo.yaml` to `brand-configs/{name}.yaml` and editing the relevant fields |

For long-running ops (`cli run`), surface progress every 5–10 seconds so the buyer doesn't think it's frozen.

For multi-brand setups, every command takes `--brand {slug}`. The brand slug is the filename in `brand-configs/`.

---

## Update

When the buyer says "update the agent" or "get the latest version":

```bash
git pull
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
cli plan --brand demo --dry-run    # confirm still passes after update
```

If `git pull` shows merge conflicts in `brand-configs/` or `.env`, those are buyer-edited files — ask before resolving. Conflicts in `src/` should never happen on a normal pull; if they do, surface the file list to the buyer and ask if they've made local code changes.

---

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `(#100) Tried accessing nonexisting field` from Meta | wrong API version | bump `META_GRAPH_VERSION` in `.env` to `v22.0` (current as of May 2026) |
| `psycopg.OperationalError: could not connect to server` | Postgres container stopped | `docker start glitch-ads-postgres` |
| Telegram approvals not reaching the bot | webhook not registered | run `pnpm telegram:register` once after first install |
| `litellm.AuthenticationError` | bad LiteLLM key | regenerate at https://litellm.ai · Settings · API keys |
| `cli` not found | venv not activated | `source .venv/bin/activate` before any `cli ...` command |
| Smoke test hangs forever | LLM provider unreachable | check `LITELLM_API_KEY` or `OPENAI_API_KEY`; surface the network error |

---

## Resale playbook (where the buyer's revenue comes from)

The `playbook/` folder in this repo contains the full version. AI assistants should reference it when the buyer asks *"how do I sell this?"* or *"what should I charge?"*

Quick numbers:
- **Managed Meta ads service**: $1,497/mo per brand (US) / ₹25,000/mo (India). One client recoups the $149 license 10× in month one.
- **3-platform Pro tier**: $1,497–$2,997/mo per brand (Meta + Google + TikTok with cross-platform attribution).
- **Agency white-label**: $2,997+/mo per reseller seat — the agency runs the agent, brands it as theirs, you collect a flat seat fee.

When pitching: open with the dollars-saved-vs-AdEspresso ($299/mo) / Madgicx ($55/mo) angle, not the technical superiority. Buyers in this market care about cost-of-tools, not tool-architecture.

---

## Support

If something here breaks for the buyer and the AI assistant can't resolve it:

- **Discord**: https://discord.gg/HBZFKMts — `#ads-agent` channel for buyer-only help
- **Email**: support@glitchexecutor.com — reply with payment_id (printed in the welcome email) and the error
- **Refund**: 14 days from purchase, no questions, no questionnaire

If the buyer hits a problem in setup, escalate to support BEFORE retrying anything destructive (DB drop, repo reset, key regenerate).
