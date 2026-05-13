#!/usr/bin/env bash
# BSK-002 — LangGraph Ads Operator quickstart
# Place at: glitch-grow-ads-agent-private/scripts/quickstart.sh
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
say()  { echo -e "${BLUE}==>${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
die()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# --- 1. Prereqs ----------------------------------------------------------
say "Checking prerequisites"
command -v python3 >/dev/null || die "Python 3 not found"
PY=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
[[ "$(printf '%s\n' "3.11" "$PY" | sort -V | head -1)" = "3.11" ]] || die "Python 3.11+ required (you have $PY)"
command -v psql >/dev/null || warn "psql not found — Postgres client recommended for migrations"
ok "Python $PY"

# --- 2. Env scaffold ----------------------------------------------------
if [[ ! -f .env ]]; then
  [[ -f .env.example ]] || die ".env.example missing — repo state broken"
  cp .env.example .env
  ok "Copied .env.example → .env"
fi

# --- 3. Prompt for tier-1 env vars only ---------------------------------
prompt_var() {
  local var="$1" desc="$2" default="${3-}"
  local current; current=$(grep -E "^${var}=" .env 2>/dev/null | cut -d= -f2- || true)
  if [[ -n "$current" && "$current" != "REPLACE"* && "$current" != "" ]]; then
    ok "$var already set"
    return
  fi
  read -r -p "$desc${default:+ [default: $default]}: " val
  val="${val:-$default}"
  [[ -n "$val" ]] || { warn "$var skipped — fill in .env later"; return; }
  if grep -qE "^${var}=" .env; then
    sed -i.bak "s|^${var}=.*|${var}=${val}|" .env
  else
    echo "${var}=${val}" >> .env
  fi
}

say "Configuring required env vars (Tier 2/3 — TikTok, PostHog, Telegram — fill in .env later)"
prompt_var POSTGRES_RW_URL "Postgres URL (postgresql://user:pw@host:5432/db)"
prompt_var META_ACCESS_TOKEN "Meta long-lived access token"
prompt_var META_APP_ID "Meta App ID"
prompt_var DISCORD_WEBHOOK_URL "Discord webhook URL"

# --- 4. Install ---------------------------------------------------------
say "Installing engine"
[[ -d .venv ]] || python3 -m venv .venv
.venv/bin/pip install --upgrade pip >/dev/null
.venv/bin/pip install -e . >/dev/null
ok "Engine installed"

# --- 5. Postgres setup --------------------------------------------------
DB_URL=$(grep '^POSTGRES_RW_URL=' .env | cut -d= -f2-)
if [[ -n "$DB_URL" ]] && command -v psql >/dev/null; then
  say "Ensuring pgvector extension + running migrations"
  psql "$DB_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1 \
    && ok "pgvector enabled" \
    || warn "Could not connect or pgvector unavailable — check Postgres permissions"
  if [[ -d migrations ]]; then
    .venv/bin/alembic upgrade head 2>/dev/null && ok "Migrations applied" || warn "Alembic upgrade failed — run manually"
  fi
fi

# --- 6. Smoke test: dry-run plan against demo brand --------------------
say "Smoke test: dry-run plan against fixture brand"
if .venv/bin/python -m ads_agent.cli plan --brand demo --dry-run 2>/dev/null; then
  ok "Smoke test passed — planner produced an action set without API calls"
else
  warn "Smoke-test command not yet wired (ads_agent.cli plan --brand demo --dry-run)"
  warn "Manual check: python -m ads_agent.actions.planner --help"
fi

# --- 7. Next steps ------------------------------------------------------
echo
ok "Install complete. Next:"
echo "  1. Edit .env STORES_JSON with your first real brand (template in docs/configs/)"
echo "  2. python -m ads_agent run --brand <slug>"
echo "  3. First Discord ping should arrive within 60 seconds"
echo
echo "Walkthrough video:  <link>"
echo "Resale playbook:    docs/playbook/  (3-tier pricing + first-client outreach kit)"
echo "Discord support:    <link>"
