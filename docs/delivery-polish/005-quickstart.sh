#!/usr/bin/env bash
# BSK-005 — Voice AI Agent / COD Confirm quickstart
# Place at: glitch-cod-confirm-private/scripts/quickstart.sh
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
say()  { echo -e "${BLUE}==>${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
die()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# --- 1. Prereqs ---------------------------------------------------------
say "Checking prerequisites"
command -v node >/dev/null || die "Node.js not found. Install Node 20+: https://nodejs.org/"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[[ "$NODE_MAJOR" -ge 20 ]] || die "Node 20+ required (you have $(node -v))"

command -v pnpm >/dev/null || die "pnpm required (NOT npm — pnpm-lock.yaml is committed). Install: 'npm install -g pnpm@9' or 'corepack enable'"
ok "Node $(node -v), pnpm $(pnpm -v)"

command -v psql >/dev/null || warn "psql not found — Prisma will still try, but DB debugging is harder without it"

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
  if [[ -n "$current" && "$current" != "sk_xxx" && "$current" != "" && "$current" != "your_"* ]]; then
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
prompt_var DATABASE_URL "Postgres URL (postgresql://user:pw@host:5432/db)"
prompt_var LIVEKIT_URL "LiveKit URL (wss://your-project.livekit.cloud)"
prompt_var LIVEKIT_API_KEY "LiveKit API key"
prompt_var LIVEKIT_API_SECRET "LiveKit API secret"
prompt_var SARVAM_API_KEY "Sarvam API key (sk_...)"
prompt_var ELEVEN_API_KEY "ElevenLabs API key (must have voices:read + voices:write + text-to-speech permissions)"
prompt_var ELEVENLABS_VOICE_ID "ElevenLabs voice ID (must be saved in your account library)"
prompt_var EXOTEL_API_KEY "Exotel API key (or skip if using Twilio/Plivo)"

# --- 4. Install + cache prefetch ---------------------------------------
say "pnpm install (this is where pnpm-vs-npm matters — DO NOT switch to npm)"
pnpm install --frozen-lockfile

# Pre-fetch HuggingFace turn-detector cache to avoid 30s lag on first call.
# Real implementation: a small Node script that imports the turn-detector
# package and triggers its lazy fetch. Stub message until the script exists.
if [[ -x scripts/prefetch-turn-detector.mjs ]]; then
  say "Pre-fetching turn-detector model"
  node scripts/prefetch-turn-detector.mjs && ok "Turn-detector cached" || warn "Pre-fetch failed — agent will lazy-fetch on first call"
else
  warn "scripts/prefetch-turn-detector.mjs not yet shipped — first call will warm-up ~30s"
fi

# --- 5. Prisma setup ----------------------------------------------------
say "Running Prisma migrations"
pnpm prisma migrate deploy >/dev/null 2>&1 && ok "Migrations applied" || warn "Prisma migrate failed — check DATABASE_URL"

# --- 6. Smoke tests (in order of risk) ---------------------------------
say "Smoke test 1: hello (no PSTN)"
if pnpm test:hello 2>/dev/null; then
  ok "Hello test passed — agent + LiveKit + TTS wired"
else
  warn "pnpm test:hello not yet wired"
fi

say "Smoke test 2: dispatch dry-run (logs only, no PSTN)"
pnpm dispatch:dry-run 2>/dev/null && ok "Dispatch dry-run OK" || warn "pnpm dispatch:dry-run not yet wired"

# --- 7. Next steps ------------------------------------------------------
echo
ok "Install complete. Next:"
echo "  1. Real PSTN smoke test:  pnpm test:call --to=+91YOURNUMBER"
echo "  2. Wire one Shopify shop: edit SHOPIFY_WEBHOOK_SECRETS map in .env"
echo "  3. Start both processes:  pnpm dev:server  AND  pnpm dev:agent (separate terminals)"
echo "  4. Place a sandbox COD order in Shopify; confirm webhook arrives + scheduler queues call"
echo
echo "Walkthrough video:  <link>"
echo "Resale playbook:    docs/playbook/  (₹3-5/call unit econ + WhatsApp outreach + agency white-label)"
echo "Discord support:    <link>"
