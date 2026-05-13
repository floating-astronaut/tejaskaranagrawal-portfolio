#!/usr/bin/env bash
# One-shot: configure Codeberg Actions secrets/variables + enable Actions
# unit + trigger the first deploy. Re-runnable; uses Forgejo's idempotent
# PUT-by-name endpoints.
#
# Run as:
#   CODEBERG_TOKEN=...   CLOUDFLARE_API_TOKEN=...   bash scripts/setup-codeberg-actions.sh
#
# Required env on this shell (NOT echoed anywhere by the script):
#   CODEBERG_TOKEN          — write:repository PAT for codeberg.org/glitch-executor
#   CLOUDFLARE_API_TOKEN    — rotated token, scopes Pages:Edit + User:Read
#
# Optional:
#   CB_OWNER  default 'glitch-executor'
#   CB_REPO   default 'glitch-grow-site'

set -euo pipefail

: "${CODEBERG_TOKEN:?need CODEBERG_TOKEN env var}"
: "${CLOUDFLARE_API_TOKEN:?need CLOUDFLARE_API_TOKEN env var}"
CB_OWNER="${CB_OWNER:-glitch-executor}"
CB_REPO="${CB_REPO:-glitch-grow-site}"
CF_ACCOUNT_ID='718adb77270c9f6346604595009b55c4'
API="https://codeberg.org/api/v1"
HDR=(-H "Authorization: token ${CODEBERG_TOKEN}" -H 'content-type: application/json')

# ── 0. probe token + repo access ──────────────────────────────────────
who="$(curl -sS "${HDR[@]}" "${API}/user" | grep -oE '"login":"[^"]+"' | head -1)"
echo "✓ token belongs to ${who:-(unknown)}"

# ── 1. enable Actions unit on the repo ────────────────────────────────
echo
echo "→ enable Actions unit on ${CB_OWNER}/${CB_REPO}"
curl -sS -o /dev/null -w "  PATCH /repos/${CB_OWNER}/${CB_REPO} → %{http_code}\n" \
  -X PATCH "${HDR[@]}" \
  "${API}/repos/${CB_OWNER}/${CB_REPO}" \
  -d '{"has_actions": true}'

# ── 2. helper: set a Forgejo Actions secret (encrypted) ───────────────
put_secret () {
  local name="$1"; local value="$2"
  curl -sS -o /dev/null -w "  PUT secret ${name} → %{http_code}\n" \
    -X PUT "${HDR[@]}" \
    "${API}/repos/${CB_OWNER}/${CB_REPO}/actions/secrets/${name}" \
    --data-binary @<(printf '{"data":%s}' "$(jq -Rn --arg v "$value" '$v')")
}

# ── 3. helper: set a Forgejo Actions variable (plaintext) ─────────────
put_variable () {
  local name="$1"; local value="$2"
  # Forgejo: POST creates, PUT updates. Try POST first, fall back to PUT.
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST "${HDR[@]}" \
    "${API}/repos/${CB_OWNER}/${CB_REPO}/actions/variables/${name}" \
    --data-binary @<(printf '{"value":%s}' "$(jq -Rn --arg v "$value" '$v')"))
  if [ "$code" = "409" ] || [ "$code" = "400" ]; then
    code=$(curl -sS -o /dev/null -w "%{http_code}" \
      -X PUT "${HDR[@]}" \
      "${API}/repos/${CB_OWNER}/${CB_REPO}/actions/variables/${name}" \
      --data-binary @<(printf '{"value":%s}' "$(jq -Rn --arg v "$value" '$v')"))
  fi
  echo "  PUT variable ${name} → ${code}"
}

# ── 4. write secrets ──────────────────────────────────────────────────
echo
echo "→ secrets"
put_secret CLOUDFLARE_API_TOKEN  "$CLOUDFLARE_API_TOKEN"
put_secret CLOUDFLARE_ACCOUNT_ID "$CF_ACCOUNT_ID"

# ── 5. write public build-time variables ──────────────────────────────
echo
echo "→ variables"
put_variable PUBLIC_GTM_CONTAINER_ID    'GTM-TMXWNNLJ'
put_variable PUBLIC_GA_MEASUREMENT_ID   'G-TK7ZYVLJRQ'
put_variable PUBLIC_META_PIXEL_ID       '1273074111260527'
put_variable PUBLIC_TIKTOK_PIXEL_ID     'D7SUUBRC77UEKU3Q0FSG'
# Turnstile site key — fetched live from the deployed site so we don't
# need to re-paste it. Falls back to empty (Turnstile gracefully no-ops
# if missing on a build).
TURNSTILE_KEY="$(curl -sS https://grow.glitchexecutor.com/ \
  | grep -oE 'data-sitekey="[^"]+"' | head -1 | cut -d'"' -f2)"
put_variable PUBLIC_TURNSTILE_SITE_KEY "${TURNSTILE_KEY:-}"

# ── 6. trigger first workflow run ─────────────────────────────────────
echo
echo "→ trigger workflow run on main"
curl -sS -o /dev/null -w "  POST workflow dispatch → %{http_code}\n" \
  -X POST "${HDR[@]}" \
  "${API}/repos/${CB_OWNER}/${CB_REPO}/actions/workflows/deploy-cloudflare-pages.yml/dispatches" \
  -d '{"ref": "main", "inputs": {}}'

echo
echo "Done. Watch the run at:"
echo "  https://codeberg.org/${CB_OWNER}/${CB_REPO}/actions"
