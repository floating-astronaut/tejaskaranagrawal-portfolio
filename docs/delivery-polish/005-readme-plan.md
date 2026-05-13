# BSK-005 — README audit + rewrite plan

**Repo:** `glitch-executor/glitch-cod-confirm-private`
**Local:** `/home/support/glitch-cod-confirm-private/`
**Current README:** 407 lines, comprehensive.

## Audit (current state)

| Surface | Score | Notes |
|---|---|---|
| Install steps | **8/10** | Best of the four. Has Quickstart with prerequisites + install + dry-run instructions. The 10s TTS-failover detail is gold. Missing: `pnpm` is named in scripts but not always called out as a prereq vs npm/yarn. The HuggingFace turn-detector cache footgun (per migration memory) isn't documented in README — it's a real installation trap on fresh boxes. |
| First-run walkthrough | **7/10** | `dispatch_mode=dry_run` and the "test without burning real-customer minutes" section are excellent. Missing: a "say hello" smoke test that doesn't require a Shopify webhook arriving. Spec a `pnpm test:hello` that triggers a synthetic order through the scheduler. |
| Env-var docs | **9/10** | The best of the four. Each var commented in context, multi-store JSON map example, fallback-vs-primary semantics documented. Minor: SHOPIFY_WEBHOOK_SECRETS map vs SHOPIFY_WEBHOOK_SECRET singular is confusingly close — keep the call-out but bold it. |
| Failure modes | **5/10** | Some present (TTS failover, fallback secret). Missing: the LiveKit turn-detector cache issue, Sarvam quota exhaustion, ElevenLabs scoped-key voices:read failure (mentioned in `.env.example` but not in README), Exotel SIP trunk DID-not-whitelisted, R2 egress when recording bucket region mismatches. |
| Resale playbook | **1/10** | `BETA.md`, `HANDOVER.md`, `MILESTONES.md` exist but they're operator/internal docs. The buyer playbook (₹3–5/call pricing math, agency white-label tier, Indian Shopify merchant onboarding, the Sarvam-vs-Bolna positioning script) is missing. |

## Proposed new README structure

The current README is structurally good — it doesn't need a rewrite, it needs **additions and reorganization**.

```
# BSK-005 — Voice AI Agent (LiveKit + Sarvam)

## What this is (buyer framing — keep current intro)

## Prerequisites (NEW — extracted + expanded)
- Node.js 20+ + pnpm 9+ (NOT npm — pnpm-lock.yaml is committed)
- PostgreSQL 14+
- LiveKit Cloud account (free tier works for dev, paid for production SIP)
- Sarvam API key (sign-up: dashboard.sarvam.ai)
- ElevenLabs API key with **full permissions** (scoped keys without
  voices:read FAIL on the multi-stream WS path)
- Cloudflare R2 OR S3 bucket for recordings
- SIP trunk: Exotel (India) or Twilio Programmable Voice (international)
- Shopify Custom App per merchant (or use the multi-store JSON map)

## Quickstart (15 minutes)
1. Clone + `./scripts/quickstart.sh`
2. Smoke test #1 — Hello: `pnpm test:hello`
   → spins up a LiveKit room, makes Priya say "नमस्ते" once, prints transcript
3. Smoke test #2 — Dry-run scheduler: `pnpm dispatch:dry-run`
   → logs what would dispatch given current orders, no PSTN
4. Smoke test #3 — Self-test PSTN: `pnpm test:call --to=+91YOURNUMBER`
   → real call to your phone using a fixture order
5. Connect Shopify: per-shop webhook URL + HMAC secret in JSON map

## Common installation traps (NEW)
- **HuggingFace turn-detector cache**: a fresh `pnpm install` does NOT
  pull the turn-detector model; it's lazy-fetched on first run. Either
  pre-fetch with `pnpm prefetch:turn-detector` or accept a 30s first-call
  warm-up. (See HANDOVER.md if migrating from another machine — copy
  `node_modules/.pnpm/@huggingface+transformers@*/.cache/livekit/` to
  preserve the cache.)
- **ElevenLabs scoped key**: must have `voices:read` AND `voices:write`
  AND `text-to-speech` scopes. The multi-stream WS path silently fails
  on read-only keys.
- **pnpm not npm**: `npm install` will succeed but resolve different
  transitive versions and break LiveKit's WebRTC native modules.

## Stack (current diagram — keep)

## Configuration (current — keep, but rank by required-ness like BSK-002/003)

## Common errors + fixes (EXPAND current section to ~10 entries)
- TTS_PROVIDER=elevenlabs but no audio: scoped key missing voices:read
- Sarvam STT 429 rate limit: free tier caps at ~10 RPS, upgrade plan
- Shopify webhook 401: SHOPIFY_WEBHOOK_SECRETS map vs singular fallback
- LiveKit room created but no audio: turn-detector cache miss; warm up
- Exotel SIP rejected: DID not whitelisted; whitelist in Exotel dashboard
- Recording missing in R2: bucket region mismatch; LiveKit egress
  requires `auto` region or explicit endpoint URL
- "DND blocked" but TRAI window is fine: env DND override IST hours
- Postgres "relation prisma_migrations does not exist": run `pnpm prisma migrate deploy`

## Resale playbook (NEW — this is what buyers paid $149 for)
- The unit economics: $0.02/min raw cost vs ₹3-5/call sale price.
  Spreadsheet template at `/docs/playbook/unit-economics.xlsx`.
- Indian Shopify merchant pitch (the Hindi-language voice angle —
  Bolna and Vapi are English-first; Sarvam is the wedge)
- Pricing tiers:
  - Per-call retail: ₹3-5/call to merchants
  - White-label seat: ₹50,000/mo per agency reseller
  - Volume: ₹2.5/call at >5K calls/month
- The first-merchant outreach kit:
  - WhatsApp-friendly intro (Indian buyers prefer WA over LinkedIn)
  - 90-second Loom script for the demo call
  - Pricing one-pager (Hindi + English versions)
- Compliance: TRAI DND, IT Act 2000 §43A (recordings), DPDP Act
- Operator runbook: how one operator runs 50 merchant accounts

## Support
- Discord: <link>
- Buyer-portal: <link>
- Walkthrough video: <link>
```

## Specific changes vs current

1. **EXTRACT** Prerequisites into its own section (currently buried inside Quickstart).
2. **ADD** "Common installation traps" — turn-detector cache, scoped key, pnpm. These are the exact issues that have already burned migrations on this very box; ship the lessons.
3. **ADD** `pnpm test:hello` smoke test command. **Block on:** the script needs to exist. Spec: spins up an in-process LiveKit room, makes the agent emit one TTS phrase, prints transcript. ~2 hours of work.
4. **EXPAND** Common errors from ~3 to ~10 entries.
5. **ADD** Resale playbook section. **Block on:** writing the unit-economics spreadsheet + the Hindi/English Loom script + the WhatsApp intro template. Estimate 6–8 hours.
6. **MOVE** `BETA.md`, `MILESTONES.md`, `HANDOVER.md` to `/docs/internal/` — these are noise in a buyer's repo root.

## Estimated scope
- README expansion: 2 hours.
- `pnpm test:hello` script: 2 hours.
- `pnpm prefetch:turn-detector` script: 30 min.
- Move internal docs: 15 min.
- Playbook copy: 6–8 hours.
- Total: ~12 hours.

## Tejas decision needed
- The HANDOVER.md was written for *internal* migration. It contains real
  shop domains, real R2 buckets, real LiveKit project IDs — buyer should
  not see those. Confirm: move to `/docs/internal/` (gitignored from buyer
  view via a future split) OR scrub PII and keep public. Recommend
  scrub-and-keep — the migration playbook is genuinely useful for buyers
  setting up their second deployment.
