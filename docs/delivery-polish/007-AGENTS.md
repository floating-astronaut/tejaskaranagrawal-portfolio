# AGENTS.md — AI UGC Agent (BSK-007)

> **For AI coding agents** (Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor — anything that reads project files + runs shell commands) operating this repository on behalf of a non-technical buyer. Follow this file end-to-end when the user says any of: *"set this up"*, *"install this agent"*, *"get me running"*, *"deploy"*, or pastes the welcome-email prompt.

This file is the canonical install + operate guide. The README is for human readers; this file is the actionable contract you execute against.

---

## What this agent is

Production AI UGC (user-generated-content style) video ad pipeline for paid acquisition. Different beast from BSK-004 (organic social) — this one is built for **CPA**, not views. One product brief becomes a script + 5–8 hook variants per script + HeyGen avatar + gpt-image-2 stills + WAN i2v motion clips + ElevenLabs voiceover, assembled with Remotion + ffmpeg into 1080×1920 vertical ads, then drafted into Meta Ads Manager / TikTok Ads Manager.

The buyer paid one-time for the source. After install they will use it to:
- Generate paid-ad creative for one or more brands
- Bill $1,497/mo per brand for managed UGC creative service (₹25,000/mo for Indian D2C)
- Replace $7K+/mo specialist UGC agency retainers with their own pipeline

## Operating principles

When you operate this repo:

1. **This pipeline is API-key-heavy.** HeyGen, ElevenLabs, OpenAI, fal.ai, optional Meta/TikTok Ads. Walk the buyer through one at a time; surface estimated per-render cost before any real generation.
2. **Default to the example brief.** Use `briefs/example.yaml` for the smoke run. Never spend real avatar/video credits until the buyer hands over a real brief and explicitly says "render it."
3. **Validate every key before the next.** A 401 on HeyGen is a different debug from a 401 on ElevenLabs.
4. **Show buyer the cost estimate first.** Each `pnpm render` should print "estimated render cost: ~$X" before kicking off; surface that number.
5. **Stop on first error.** Unlike text agents, here a half-rendered video is a real-money waste. Don't retry blindly.

---

## Setup

### 1. Detect host environment

```bash
uname -s
which python3   # need 3.11+ (orchestration + script writer)
which node      # need 20+ (Remotion + assembly)
which pnpm      # need 9+
which ffmpeg    # required for video concat
which docker    # optional
```

If any tool is missing, ask the buyer's permission to install. ffmpeg is the most likely missing dependency — `brew install ffmpeg` (macOS) / `apt install ffmpeg` (Linux).

### 2. Install Python + Node deps

```bash
python3 -m venv .venv
source .venv/bin/activate     # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"

pnpm install
```

Both must succeed. The orchestrator is Python; Remotion + ffmpeg compose layer is Node.

### 3. Configure `.env`

```bash
cp .env.example .env
```

Fill these one at a time:

| Var | What to ask | How they get it · Cost ballpark |
|---|---|---|
| `HEYGEN_API_KEY` | "Paste your HeyGen API key. We use it for the talking-head avatar layer." | https://app.heygen.com → API Settings · ~$0.30 per 30s clip |
| `HEYGEN_AVATAR_ID` | "Pick an avatar. Stock works for the demo; custom avatars are higher-conversion." | https://app.heygen.com/avatars · stock IDs ship in `briefs/example.yaml` |
| `OPENAI_API_KEY` | "We use OpenAI for the script writer + gpt-image-2 stills." | https://platform.openai.com/api-keys · ~$0.04 per still |
| `ELEVENLABS_API_KEY` | "Paste your ElevenLabs key. Workspace key, not personal — we'll explain why if you hit a 401." | https://elevenlabs.io/app/settings/api-keys · ~$0.30 per 30s voiceover |
| `ELEVENLABS_VOICE_ID` | "Pick a voice. Default to Rachel; custom-cloned voices land higher CTR." | https://elevenlabs.io/app/voice-library |
| `FAL_API_KEY` | "Paste your fal.ai key. We use WAN 2.1 i2v for motion clips." | https://fal.ai/dashboard/keys · ~$0.20 per 5s motion clip |
| `META_ADS_TOKEN` (optional) | "Skip if you're delivering files; paste if you want auto-upload as Meta Ads draft creatives." | business.facebook.com → System Users → Generate token (ads_management scope) |
| `TIKTOK_ADS_TOKEN` (optional) | "Same as Meta — skip or generate." | business-api.tiktok.com → System Users |
| `OUTPUT_DIR` | (auto-set to `./output`) | local path for rendered videos |
| `BRIEFS_DIR` | (auto-set to `./briefs`) | local path for product briefs |

Validate as you go:

```bash
# After HEYGEN_API_KEY + HEYGEN_AVATAR_ID:
pnpm heygen:test     # generates a 5s test clip with the chosen avatar (~$0.05)

# After OPENAI_API_KEY:
pnpm openai:test     # generates a 256x256 test still (~$0.01)

# After ELEVENLABS_API_KEY:
pnpm tts:test        # synthesises "test" — ~free under monthly quota

# After FAL_API_KEY:
pnpm fal:test        # generates a 1s motion clip (~$0.04)
```

Show the buyer the running cost total after these tests so they understand what real briefs will spend.

---

## Test

```bash
pnpm render --brief briefs/example.yaml --variants 1
```

Expected: produces ONE complete 15s vertical UGC ad in `output/example/example-v1.mp4`. Estimated cost ~$0.80–$1.50 per variant (printed before render starts).

If this passes, install is functionally complete. Tell the buyer: *"You're live. Try this in Claude Code: 'Generate 5 hook variants for my new {product} launch.'"*

---

## Run

| Buyer says | You run |
|---|---|
| "Generate {N} hook variants for {product}" | walk through copying `briefs/example.yaml` to `briefs/{slug}.yaml`, fill in product name + key benefits + target audience, then `pnpm render --brief briefs/{slug}.yaml --variants {N}` |
| "Show me last week's renders" | `pnpm cli renders --window 7d` (lists output files + estimated total spend) |
| "Upload {variant} as Meta Ads draft" | `pnpm cli upload --file {output_path} --platform meta` (creates draft creative, doesn't activate) |
| "Iterate on hook 3" | walk through editing `briefs/{slug}.yaml` hooks list, rerun `pnpm render --brief … --variants 1 --start-from 3` |
| "Add a new brand" | walk through copying `brands/example.yaml` to `brands/{slug}.yaml` (brand voice + asset library + competitor refs) |

For long-running renders (~3–6 minutes per variant), surface progress every 30s and the running cost.

---

## Update

```bash
git pull
source .venv/bin/activate
pip install -e ".[dev]"
pnpm install
pnpm render --brief briefs/example.yaml --variants 1    # confirm still passes
```

If `git pull` shows merge conflicts in `briefs/`, `brands/`, or `.env`, those are buyer-edited — ask before resolving.

---

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `HeyGen 401 unauthorized` | API key wrong or trial expired | Regenerate at app.heygen.com → API Settings; HeyGen trial keys expire at 30 days |
| `ElevenLabs 401` | Personal vs workspace key | Regenerate at workspace level; personal keys block programmatic use |
| `fal.ai timeout` | i2v model load delay on cold start | Retry once; if it fails twice, switch model in `briefs/{slug}.yaml` to a smaller checkpoint |
| `ffmpeg: codec h264_videotoolbox not found` | macOS-only optimisation; falls back to libx264 | Add `FFMPEG_CODEC=libx264` to `.env` to force the portable encoder |
| Render hangs at "assembling" | Remotion compositor crashed silently | Check `output/{slug}/render.log`; usually an asset-resolution mismatch |
| Cost runs higher than estimate | Buyer requested more variants than estimated, or fal.ai upgraded the i2v model | Surface the actual cost in the post-render log; the estimate-vs-actual is logged for every render |

---

## Resale playbook

Quick numbers:

- **Managed UGC creative**: $1,497/mo per brand (US) / ₹25,000/mo (India). Replaces $7K+/mo specialist UGC agency retainers.
- **Per-launch creative pack**: $5,000–$10,000 one-time for a launch campaign creative bundle (5 hook variants × 3 iterations × all platforms).
- **Bundled with BSK-002 (Ads Agent)**: $2,997+/mo per brand for full creative + ads-ops. End-to-end paid acquisition delivery.

When pitching: lead with the cost-of-creative angle. Most D2C brands burn $200–$600 per UGC variant when working with creators or specialist agencies; you ship variants at $1–$3 each. The arbitrage is brutal in the buyer's favour and obvious to performance-marketing budget owners.

---

## Support

- **Discord** (`#ugc-agent`): https://discord.gg/HBZFKMts
- **Email**: support@glitchexecutor.com — reply with payment_id
- **Refund**: 14 days from purchase

For render-quality issues, attach the offending video + the brief YAML so we can reproduce.
