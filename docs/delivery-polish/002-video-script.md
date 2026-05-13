# BSK-002 — Walkthrough video script

**Target length:** 7 minutes. **Title:** *LangGraph Ads Operator — run paid ads for 5 brands in 90 minutes a day.*

## Beat 0 — Cold open (0:00–0:20)
**On screen:** Telegram chat with a stack of ad-account approval requests pinging in. Then a Discord channel doing the same. Operator on a phone, swiping approve/reject.
**VO:** "If you manage paid ads for more than two brands, you already know — Slack, email, three different ad-platform UIs, the same five decisions over and over. This is what running five brands looks like with the agent."

## Beat 1 — What's running (0:20–1:00)
**On screen:** live Telegram approval card showing — *Brand: Glitch Budz · Action: scale ad set X by 20% · ROAS: 4.2 last 7d · Predicted lift: 18%*. Operator taps approve. Card disappears, the same row's status changes in Discord.
**VO:** "First-click-wins reconciliation. Approve once on Telegram or Discord, the other side closes. Same memory row, same agent, twelve recipes covering creative fatigue, audience refresh, budget scale, dayparting, all of it."

## Beat 2 — Install (1:00–2:30)
**On screen:** terminal — `git clone <codeberg url>`, `cd`, `./scripts/quickstart.sh`. Script detects Python, prompts for tier-1 env vars (Postgres URL, Meta token, Discord webhook), creates `.env`, runs `pip install -e .`, runs `psql -c 'CREATE EXTENSION vector'`.
**VO:** "Quickstart asks for the four required env vars, installs the engine, sets up Postgres with pgvector. About two minutes."

## Beat 3 — Smoke test (2:30–3:30)
**On screen:** `python -m ads_agent.cli plan --brand demo --dry-run`. Output: a planned action set against a fixture brand — shows the LangGraph state transitions, lists three proposed actions, no API calls made.
**VO:** "Smoke test runs against a fake brand. You see the planner think, see the proposed actions, no real money touched. Install confirmed."

## Beat 4 — Wire your first real brand (3:30–4:30)
**On screen:** edit `.env`, fill in `STORES_JSON` for one real brand (use a placeholder demo brand for the recording). Show the JSON template. Restart agent. First Discord ping arrives within 60s with a real proposed action.
**VO:** "Add one real brand to STORES_JSON, restart, and within a minute you see the agent's first real proposal in Discord. That's your operator surface from now on."

## Beat 5 — The configuration trap (4:30–5:15)
**On screen:** the agent loops on the same brand because `STORE_AD_ACCOUNTS_JSON` has an empty array. Show the error. Show the fix.
**VO:** "One trap: if STORE_AD_ACCOUNTS_JSON has an empty array for a brand, the agent thinks ROAS is zero and loops trying to fix it. Always set at least one ad-account ID per store, or remove the brand from the map."

## Beat 6 — How to monetise (5:15–6:45)
**On screen:** open `/docs/playbook/pricing-tiers.md`.
**VO:** "Three tiers. Solo at $497/mo: one brand, two platforms. Studio at $1,497/mo: three brands, three platforms — this is the sweet spot, recoups the kit price ten times over with two clients. Multi-Brand at $4,997/mo: five brands, all platforms, white-label."

**Concrete first client:** "Pick one D2C brand on Shopify spending $5K to $30K a month on Meta. They're hiring agencies and getting bad blended ROAS reports. Subject line for outreach: *True blended ROAS for [brand] — 30-min teardown.* Show them the agent's PostHog-grounded ROAS calc on the call. Three pitches and you'll close one."

**Concrete price band:** "$1,497/mo Studio is the anchor. Don't go below $997 — the cost-of-goods doesn't work and you're commoditizing yourself."

## Beat 7 — Outro (6:45–7:00)
**On screen:** buyer portal page.
**VO:** "Discord, repo, playbook on your buyer portal. Run your first real brand by Sunday."

---
## Recording notes
- Use a real Glitch Budz screenshot (or a sanitized demo) for Telegram + Discord cards.
- Pre-stage Postgres with pgvector so the install doesn't trip on extension creation.
- Demo-brand fixture file must exist and produce reproducible output.
- Asciinema for the terminal beats; OBS for the Telegram + Discord cards.
- Same encode + upload spec as BSK-001 video.
