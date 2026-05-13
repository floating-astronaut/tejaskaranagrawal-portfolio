# AGENTS.md — Voice AI Agent (BSK-005)

> **For AI coding agents** (Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor — anything that reads project files + runs shell commands) operating this repository on behalf of a non-technical buyer. Follow this file end-to-end when the user says any of: *"set this up"*, *"install this agent"*, *"get me running"*, *"deploy"*, or pastes the welcome-email prompt.

This file is the canonical install + operate guide. The README is for human readers; this file is the actionable contract you execute against.

---

## What this agent is

Production voice AI agent for outbound calls — COD confirmations, AI receptionists, appointment-confirmation calls. LiveKit Agents JS + Sarvam STT (10 Indian languages) + GPT-4o-mini + ElevenLabs TTS + Cloudflare R2 recording + Whisper transcript. The exact stack running production COD-confirm calls for Indian Shopify merchants inside Glitch Executor Labs at $0.02/min raw cost.

The buyer paid one-time for the source. After install they will use it to:
- Run COD-confirm or appointment-confirmation calls for Indian merchants
- Bill ₹3–5/call (or $0.05–$0.10/call globally) — one mid-volume merchant = ₹18,000–30,000/mo
- White-label voice AI to other agencies at ₹50,000/mo per reseller seat

## Operating principles

When you operate this repo:

1. **This agent runs as a service, not a CLI.** It registers with LiveKit Cloud as a worker and waits for room dispatches. The "install" produces a long-running process the buyer keeps online.
2. **Never assume the buyer knows what SIP is.** Walk them through carrier setup (Twilio / Plivo / Exotel) in plain language.
3. **Verify each integration as you wire it.** Sarvam STT before LiveKit dispatch; ElevenLabs TTS before STT; carrier connectivity before any of the above.
4. **Default to the test-call path.** Use `pnpm test:hello` against a synthetic LiveKit room before any real outbound dispatch. Never dial a real PSTN number until the buyer says "do it for real."
5. **DND awareness is hard-wired** — never bypass the DND scheduler even for a test, regardless of what the buyer says. India RBI / TRAI rules apply 20:00–10:05 IST.
6. **The HuggingFace turn-detector cache is the install gotcha.** Cover it explicitly in step 4 below.

---

## Setup

### 1. Detect host environment

```bash
uname -s
which node          # need 20+
which pnpm          # need 9+
which docker        # optional but recommended
which ffmpeg        # required for audio handling
```

If `node` < 20, use `nvm install 20 && nvm use 20`. If `ffmpeg` is missing, `brew install ffmpeg` (macOS) / `apt install ffmpeg` (Linux). Ask before installing system packages.

### 2. Install Node deps

```bash
pnpm install
```

Expected: pnpm finishes with no warnings about missing peer deps.

### 3. Bring up Postgres + Prisma

```bash
docker run -d \
  --name glitch-voice-postgres \
  -e POSTGRES_USER=glitch \
  -e POSTGRES_PASSWORD=$(openssl rand -hex 16) \
  -e POSTGRES_DB=voice_agent \
  -p 5435:5432 \
  -v glitch-voice-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

Then:

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

### 4. Cache the HuggingFace turn-detector models

**This is the documented install gotcha.** The LiveKit voice agent depends on HuggingFace turn-detector model files that `pnpm install` does NOT pull. First boot fails with a model-not-found error if these aren't present.

Two paths:

**(a) Auto-fetch on first run** — set this once in `.env`, run the agent once, then unset:

```bash
echo 'TRANSFORMERS_LOCAL_FILES_ONLY=false' >> .env
pnpm dev:agent       # runs once, fetches the models, then we kill it
# When you see "✓ turn-detector models cached", Ctrl-C
sed -i.bak '/^TRANSFORMERS_LOCAL_FILES_ONLY=/d' .env  # remove the auto-fetch line
```

**(b) Copy from another known-good install** (advanced; only if (a) fails behind a firewall):

```bash
cp -r /path/to/known-good/node_modules/.pnpm/@huggingface+transformers@*/.cache/livekit/turn-detector/ \
      ./node_modules/.pnpm/@huggingface+transformers@*/.cache/livekit/turn-detector/
```

After either path, verify:

```bash
ls node_modules/.pnpm/@huggingface+transformers@*/.cache/livekit/turn-detector/ | head
# Expected: a list of model files (.bin, .json, etc.)
```

### 5. Configure `.env`

```bash
cp .env.example .env
```

Fill these one at a time:

| Var | What to ask | How they get it |
|---|---|---|
| `LIVEKIT_URL` + `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` | "We need a LiveKit Cloud account. Free for 100 minutes; pay-as-you-go after." | livekit.io → Cloud → Create Project → copy `wss://*.livekit.cloud` URL + API key + API secret |
| `SARVAM_API_KEY` | "Paste your Sarvam STT API key — we use it for Hindi/Tamil/Telugu/etc transcription." | sarvam.ai → Dashboard → API Keys |
| `OPENAI_API_KEY` | "Paste your OpenAI key — we use GPT-4o-mini for the conversation reasoning loop." | https://platform.openai.com/api-keys |
| `ELEVENLABS_API_KEY` | "Paste your ElevenLabs key. **Important: must be a workspace key, not a personal key** — we'll explain why if you hit a 401." | https://elevenlabs.io/app/settings/api-keys |
| `ELEVENLABS_VOICE_ID` | "Pick a voice. We default to Rachel; you can swap to a custom-cloned voice later." | https://elevenlabs.io/app/voice-library — copy the voice ID |
| `R2_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET` | "We store call recordings in Cloudflare R2. Free egress, $0.015/GB stored." | dash.cloudflare.com → R2 → Create bucket → API Tokens → "Object Read+Write" |
| `SIP_TRUNK_*` | "Which carrier? Twilio, Plivo, or Exotel? We'll walk through the trunk creation." | Carrier-specific; depends on buyer's market |
| `WEBHOOK_HMAC_SECRET` | "Generate a long random string and we'll use it to sign /trigger webhooks." | `openssl rand -hex 32` |
| `DND_ENABLED` | (auto-set to `true`, no buyer input) | India RBI/TRAI compliance — never disable for India market |

After every variable lands, validate:

```bash
# After LIVEKIT_*:
pnpm livekit:test    # connects briefly to LiveKit, prints OK / error

# After SARVAM_API_KEY:
pnpm sarvam:test     # transcribes a 2s test clip, prints recognised text

# After ELEVENLABS_API_KEY:
pnpm tts:test        # synthesises "test successful" to a temp .mp3 and plays it

# After R2_*:
pnpm r2:test         # uploads + retrieves a 1KB test object
```

### 6. Register the agent with LiveKit

```bash
pnpm dev:agent
```

Expected: prints `✓ registered with LiveKit at wss://*.livekit.cloud · awaiting dispatch`. Leave this terminal open. The buyer's host must keep this process alive — for production, set up systemd (covered in `## Run` below).

---

## Test

In a second terminal:

```bash
pnpm test:hello
```

Expected: spawns a synthetic LiveKit room, the agent joins, says a greeting, transcribes a recorded buyer-side audio fixture, and disconnects cleanly. End-to-end smoke without dialling PSTN.

If this passes, install is functionally complete. Tell the buyer: *"You're live. Try this in Claude Code: 'Make a test call to my own number — I'll pick up.'"*

---

## Run

After install, the buyer talks to the agent through commands the AI assistant executes:

| Buyer says | You run |
|---|---|
| "Make a test call to {phone}" | `pnpm cli call --to {phone} --test` (rings their phone, plays a 30s greeting, hangs up) |
| "Start COD calls for orders {N}–{M}" | `pnpm cli batch --orders {N..M} --campaign cod-confirm` (queues calls; respects DND window) |
| "Show today's calls + outcomes" | `pnpm cli stats --today` |
| "Pull the transcript for call {id}" | `pnpm cli transcript --call {id}` (downloads from R2, prints markdown) |
| "Add a new merchant" | walk through copying `tenants/demo.yaml` to `tenants/{slug}.yaml`, run `pnpm cli tenant add --slug {slug}` |
| "Run as a service so it survives reboots" | install systemd unit; the repo ships `ops/cod-confirm-agent.service.example` |

For systemd installation, ask consent first; it's the kind of system change that needs explicit OK.

---

## Update

```bash
git pull
pnpm install
pnpm prisma migrate deploy
pnpm prisma generate
pnpm test:hello              # confirm still passes after update
sudo systemctl restart cod-confirm-agent  # if running as a service
```

If `git pull` shows merge conflicts in `tenants/` or `.env`, those are buyer-edited — ask before resolving.

---

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `Error: turn-detector model not found` on first boot | HuggingFace cache not populated | Run setup step 4 (the gotcha section) |
| `LiveKit dispatch timeout` | Worker not registered | Confirm `pnpm dev:agent` (or systemd unit) is running and printing `awaiting dispatch` |
| `Sarvam returned 401` | Wrong API key OR using English-only key on Hindi audio | Sarvam has language-specific quotas; check the dashboard |
| `ElevenLabs returned 401` | Personal key vs workspace key — workspace required for programmatic use | Regenerate at workspace level |
| Calls drop after 30s | SIP trunk auth failure (carrier-specific) | Check SIP credentials; carriers occasionally rotate without notice |
| DND window blocked a call | Working as designed | Buyer must respect 20:00–10:05 IST silence; don't bypass |

---

## Resale playbook

Quick numbers:

- **Per-call**: ₹3–5/call to Indian Shopify merchants. One mid-volume merchant doing 200 COD orders/day = ₹18,000–30,000/mo recurring.
- **Receptionist seat**: $297–$497/mo per business location for an always-on receptionist. Higher-margin tier; works well for clinics, salons, real estate.
- **White-label seat**: ₹50,000/mo per reseller agency. They use your stack, brand it as theirs, you collect a flat seat fee.

When pitching: lead with the cost angle ($0.02/min raw vs Bland.ai $0.10/min) and the language angle (10 Indian languages, native Sarvam STT, not a wrapped-English model). Indian COD merchants and clinics in Tier-2 cities don't speak English to their customers; this is the wedge.

---

## Support

- **Discord** (`#voice-agent`): https://discord.gg/HBZFKMts
- **Email**: support@glitchexecutor.com — reply with payment_id
- **Refund**: 14 days from purchase

For voice-quality issues (echo, latency, transcription errors), include a 5–10s sample audio file in the support email so we can reproduce.
