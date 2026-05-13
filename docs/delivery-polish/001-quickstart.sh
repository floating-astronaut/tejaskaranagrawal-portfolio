#!/usr/bin/env bash
# BSK-001 — MCP Builder Pack quickstart
# Place at: glitch-grow-mcp-builder-pack/scripts/quickstart.sh
# Run from repo root: ./scripts/quickstart.sh
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
say()  { echo -e "${BLUE}==>${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
die()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# --- 1. Detect prerequisites ---------------------------------------------
say "Checking prerequisites"
command -v python3 >/dev/null || die "Python 3 not found. Install: https://www.python.org/downloads/"
PY_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
PY_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')
[[ "$PY_MAJOR" -ge 3 && "$PY_MINOR" -ge 11 ]] || die "Python 3.11+ required (you have $PY_MAJOR.$PY_MINOR)"
ok "Python $PY_MAJOR.$PY_MINOR detected"

if ! command -v uv >/dev/null && ! command -v pipx >/dev/null; then
  warn "Neither uv nor pipx detected — falling back to plain venv. To switch later: 'pip install uv'."
fi

# --- 2. Pick which MCP to wire first -------------------------------------
say "Which MCP do you want to wire first?"
PS3="Select [1-4]: "
options=("meta-ads-mcp (recommended — easiest auth)" "google-ads-mcp" "linkedin-ads-mcp" "amazon-ads-mcp")
select opt in "${options[@]}"; do
  case $REPLY in
    1) MCP="meta-ads-mcp"; break ;;
    2) MCP="google-ads-mcp"; break ;;
    3) MCP="linkedin-ads-mcp"; break ;;
    4) MCP="amazon-ads-mcp"; break ;;
    *) echo "Pick 1-4." ;;
  esac
done
[[ -d "$MCP" ]] || die "Subdirectory $MCP not found at repo root."
ok "Will wire $MCP first"

# --- 3. Install ----------------------------------------------------------
say "Installing $MCP"
pushd "$MCP" >/dev/null
[[ -d .venv ]] || python3 -m venv .venv
.venv/bin/pip install --upgrade pip >/dev/null
.venv/bin/pip install -e . >/dev/null
ok "$MCP installed in $MCP/.venv"

# --- 4. Env file ---------------------------------------------------------
if [[ ! -f .env && -f .env.example ]]; then
  cp .env.example .env
  ok "Copied .env.example → .env"
fi

# --- 5. Prompt for the one critical env var per MCP ---------------------
case "$MCP" in
  meta-ads-mcp)
    read -r -p "Paste your META_ACCESS_TOKEN (Graph Explorer → User Access Token, ads_management scope): " TOKEN
    [[ -n "$TOKEN" ]] || die "Token required"
    grep -q '^META_ACCESS_TOKEN=' .env 2>/dev/null \
      && sed -i.bak "s|^META_ACCESS_TOKEN=.*|META_ACCESS_TOKEN=$TOKEN|" .env \
      || echo "META_ACCESS_TOKEN=$TOKEN" >> .env
    ;;
  google-ads-mcp)
    warn "Google Ads needs developer-token approval (~5 days). Apply at: https://developers.google.com/google-ads/api/docs/get-started/dev-token"
    warn "For now, .env is initialized — fill in GOOGLE_ADS_DEVELOPER_TOKEN once approved."
    ;;
  linkedin-ads-mcp)
    warn "LinkedIn Marketing API needs partner program approval. .env initialized."
    ;;
  amazon-ads-mcp)
    warn "Amazon Ads needs LWA + profile_id setup. See $MCP/README.md for full flow."
    ;;
esac

# --- 6. Smoke test -------------------------------------------------------
say "Running self-test"
if .venv/bin/python -m "${MCP//-/_}.server" --selftest 2>/dev/null; then
  ok "Self-test passed"
else
  warn "Self-test command not yet implemented in $MCP — manual verify:"
  warn "  cd $MCP && .venv/bin/python -m ${MCP//-/_}.server"
fi

popd >/dev/null

# --- 7. Next steps -------------------------------------------------------
echo
ok "Done. Next steps:"
echo "  1. Wire $MCP into Claude Desktop config (snippet in README.md → 'Wire to Claude Desktop')"
echo "  2. Restart Claude Desktop fully (Cmd+Q on macOS, then reopen)"
echo "  3. Ask Claude something like: 'list my Meta ad campaigns from last week'"
echo "  4. Repeat ./scripts/quickstart.sh to wire additional MCPs"
echo
echo "Walkthrough video:  <YouTube unlisted link, set in welcome email>"
echo "Resale playbook:    docs/playbook/  (pricing tiers + listing copy + 5-tweet launch)"
echo "Discord support:    <link>"
