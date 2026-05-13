#!/usr/bin/env bash
# BSK-003 — LangGraph Sales Agent quickstart
# Place at: glitch-grow-sales-agent-private/scripts/quickstart.sh
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
[[ "$(printf '%s\n' "3.11" "$PY" | sort -V | head -1)" = "3.11" ]] || die "Python 3.11+ required"
command -v gcloud >/dev/null || warn "gcloud not found — needed if you use ADC for Places API impersonation"
ok "Python $PY"

# --- 2. Env scaffold ----------------------------------------------------
if [[ ! -f .env ]]; then
  [[ -f .env.example ]] || die ".env.example missing"
  cp .env.example .env
  ok "Copied .env.example → .env"
fi

# --- 3. Tier-1 env vars -------------------------------------------------
prompt_var() {
  local var="$1" desc="$2"
  local current; current=$(grep -E "^${var}=" .env 2>/dev/null | cut -d= -f2- || true)
  if [[ -n "$current" && "$current" != "CHANGE_ME"* && "$current" != "REPLACE"* ]]; then
    ok "$var already set"
    return
  fi
  read -r -p "$desc: " val
  [[ -n "$val" ]] || { warn "$var skipped"; return; }
  if grep -qE "^${var}=" .env; then
    sed -i.bak "s|^${var}=.*|${var}=${val}|" .env
  else
    echo "${var}=${val}" >> .env
  fi
}

say "Configuring required env vars"
prompt_var POSTGRES_RW_URL "Postgres URL (must have pgvector available)"
prompt_var GCP_PROJECT_ID "GCP project ID (for Places API)"
prompt_var GCP_PLACES_TARGET_SA "Target service account (sa-name@project.iam.gserviceaccount.com)"
prompt_var RESEND_API_KEY "Resend API key (re_...)"
prompt_var RESEND_FROM_EMAIL "Verified From: address (e.g. you@yourdomain.com)"
prompt_var DISCORD_BOT_TOKEN "Discord bot token"
prompt_var DISCORD_GUILD_ID "Discord guild ID"
prompt_var DISCORD_APPROVAL_CHANNEL_ID "Discord approval channel ID"

# --- 4. CASL footer (legally required for Canadian outbound) -----------
prompt_var CASL_SENDER_NAME "CASL sender name (your legal entity name)"
prompt_var CASL_SENDER_ADDRESS "CASL sender postal address (legally required on every cold email)"

# --- 5. Install ---------------------------------------------------------
say "Installing engine"
[[ -d .venv ]] || python3 -m venv .venv
.venv/bin/pip install --upgrade pip >/dev/null
.venv/bin/pip install -e . >/dev/null
ok "Engine installed"

# --- 6. Postgres setup --------------------------------------------------
DB_URL=$(grep '^POSTGRES_RW_URL=' .env | cut -d= -f2-)
if [[ -n "$DB_URL" ]] && command -v psql >/dev/null; then
  say "Ensuring pgvector + running migrations"
  psql "$DB_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1 \
    && ok "pgvector enabled" \
    || warn "psql connect failed — check POSTGRES_RW_URL and DB permissions"
  [[ -d migrations ]] && .venv/bin/alembic upgrade head 2>/dev/null && ok "Migrations applied" \
    || warn "Alembic skipped — run manually"
fi

# --- 7. Smoke test ------------------------------------------------------
say "Smoke test: draft email against fixture lead"
if .venv/bin/python -m sales_agent.cli draft --fixture demo-lead 2>/dev/null; then
  ok "Smoke test passed — drafter produced an email; no send, no Discord"
else
  warn "Smoke-test command not yet wired (sales_agent.cli draft --fixture demo-lead)"
fi

# --- 8. Next steps ------------------------------------------------------
echo
ok "Install complete. Next:"
echo "  1. Discover real leads: python -m sales_agent.cli discover --radius 8000"
echo "  2. Draft + Discord ping: python -m sales_agent.cli draft --send-to-discord"
echo "  3. Approve in Discord; then add --send to enable real sending"
echo
echo "Walkthrough video:  <link>"
echo "Resale playbook:    docs/playbook/  (Studio + Retainer pricing + outreach kit)"
echo "Discord support:    <link>"
