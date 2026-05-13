# BSK-002 buyer PDF — copy spec

> Final output: a 6–8 page branded PDF, generated from this MDX (or rendered with `playwright print-to-pdf` once the source is final). Surfaced from the welcome email + the `/buyer-portal/{payment_id}` page after purchase.

---

## Page 1 — Cover

```
GLITCH GROW

AI Ads Agent
SKU BSK-002

Welcome, {buyer_first_name}.

You just bought a one-time license to the
production ads-ops engine running paid
acquisition for 7 D2C stores at Glitch
Executor Labs.

This guide covers what you bought, how to
get it running in 30 minutes, and how to
turn it into $1,497–$2,997 per month per
client.

Payment ID: {payment_id}
Purchased on: {purchase_date}
License: BSL 1.1 (source-available, resale-permitted)
```

---

## Page 2 — What you bought

### A real ads agent, not a prompt pack

You now have full source access to the same agent that runs Meta + Google + TikTok ads for seven brands inside Glitch Executor Labs. This is not a workflow template, not a Zapier scenario, not a prompt library. It's a deployable production system:

- **LangGraph orchestrator** — plan → analyze → execute → reflect, with swappable nodes
- **5 platform connectors** — Meta, Google, TikTok, Amazon Attribution, LinkedIn (all five tested, all five working today)
- **Telegram + Discord HITL** — approve actions on either, both stay in sync
- **12 ad-ops recipes** — creative-fatigue swap, audience refresh, budget scale, dayparting, and more
- **Memory in Postgres + pgvector** — every decision logged with rationale, alternatives considered, predicted outcome
- **Multi-brand config** — one deployment runs unlimited brands, each with its own autonomy thresholds

### What that means in plain English

You can run paid ads better than most $300/month SaaS tools, on infrastructure you own, for as many brands as you want, with full access to modify the code if you ever need to.

---

## Page 3 — Your first 30 minutes

You don't need to install Node, Python, Postgres, or Docker yourself. Open the agent in **Claude Code** (or Codex / Cursor / any AI coding assistant), and let it run the install for you.

### Step 1 — Get the source

Check your email for the Codeberg invite. Accept it, then in your terminal:

```
git clone git@codeberg.org:glitch-executor/glitch-grow-ads-agent-private
cd glitch-grow-ads-agent-private
```

> **No terminal experience? No problem.** Open the folder in Claude Code (File → Open Folder) and skip to step 2 — Claude Code can clone repos for you from inside its own UI.

### Step 2 — Open in Claude Code, paste this prompt

```
Read AGENTS.md and set this agent up for me. Ask me for any
keys or config values you need, then run the smoke test and
tell me when I'm live.
```

Claude reads the `AGENTS.md` file in the repo root and runs the install on your behalf. It'll ask you for:

- A LiteLLM key (or OpenAI key)
- A Meta long-lived token (we link to where to get this)
- A Meta ad-account ID
- A Discord webhook URL (we walk you through creating one)
- Optional: Google Ads + TikTok keys (you can skip these for now and add later)

Claude installs Python, Node, and Postgres if your machine doesn't have them. It validates each key as you paste it. Total time: ~30 minutes including the wait-for-things-to-install.

### Step 3 — Run a dry-run

When Claude says you're live, paste this:

```
Run a dry-run plan for the demo brand and show me what
it'd propose if it had real ad-account access.
```

You'll see the planner loop run end-to-end against a fake brand. No real ads change. This is your "yes, the engine works" moment.

---

## Page 4 — How you'll talk to your ads agent

After install, you don't run commands — you talk to Claude Code, and Claude calls the agent on your behalf:

| You say to Claude Code | What happens |
|---|---|
| *"Plan Meta ads for my Skincare brand."* | Claude runs the planner. You see proposed actions in Discord. Approve in Discord, the agent executes. |
| *"Show me ROAS for the last 7 days across all brands."* | Claude pulls insights. You see a table per brand. |
| *"Pause anything under 1.5 ROAS in Skincare."* | Claude runs the pause recipe. Discord asks you to confirm before any pauses go live. |
| *"Add a new brand called Coffee."* | Claude walks you through the brand-config setup, asks for ad-account IDs + brand voice, hands you back a working multi-brand setup. |
| *"Update the agent to the latest version."* | Claude runs `git pull`, reinstalls deps, runs migrations, re-runs the smoke test. |

You never write code. You never edit `.env`. You never touch the database. Claude does all of it.

---

## Page 5 — Resale playbook

This is the page that pays for itself in the first client.

### The pitch (use this verbatim or adapt)

> "I run an AI ads service. We use a stack that out-performs AdEspresso, Madgicx, and Revealbot — and because I run it on my own infrastructure, I pass the savings to you. $1,497/month, all platforms, full reporting, fully managed. Two-week pilot, cancel any time."

### What to charge

| Service tier | Price (US) | Price (India) | What's included |
|---|---|---|---|
| Single platform | $897/mo | ₹15,000/mo | Meta-only OR Google-only ads ops |
| Pro (multi-platform) | $1,497/mo | ₹25,000/mo | Meta + Google + TikTok cross-platform |
| Agency white-label | $2,997+/mo | ₹50,000+/mo | Reseller seat — agency runs it under their brand |

### Two-client breakeven

The license cost ($149 / ₹3,999) is recovered in **less than one month** with one Pro-tier client. Two clients in your first 90 days = 10× return on the license.

### Where to find clients

- D2C brands spending $5K+/month on Meta ads with no in-house specialist
- Ecom store owners on Shopify whose current "agency" is one freelancer with AdEspresso
- Local service businesses who heard "AI" was a thing and want it
- Existing clients of yours who currently buy other services from you (cross-sell ads as an add-on)

The full playbook (deck, proposal template, three first-call scripts, how to set autonomy thresholds per client) is in the `/playbook` folder of the repo.

---

## Page 6 — Support and license

### Discord

Real-time help in `#ads-agent` for buyers only. Daily questions, code reviews on extensions, occasional pair-debugging when something is genuinely weird.

**Join**: {discord_invite_url}

### Email

For payment, license, or refund questions: **support@glitchexecutor.com**. Include your payment ID (`{payment_id}`) and we'll move it to the front of the queue.

### Refund

14 days from purchase, no questions, no questionnaire. Email support@glitchexecutor.com with your payment ID. Refund hits your card or UPI within 5 business days.

After the refund processes, your access to the Codeberg repo is revoked and your role in the Glitch Grow Discord server is removed. You keep any code or output you generated up to that point — that's yours to keep.

### License (BSL 1.1)

You may:
- Modify the code freely
- Deploy on your own infrastructure
- Rebrand and resell the service to clients
- Run unlimited brands on one license

You may not:
- Repackage this kit and sell it as a competing kit
- Distribute the source publicly

Full license text: `LICENSE.md` in the repo root. Transitions to Apache 2.0 on April 18, 2030.

---

## Page 7 (optional) — What's next

After you've run your first dry-run and your first real plan:

1. **Open a Discord intro** — drop into `#ads-agent` and say hi. We'll point you at the people running the same agent for similar verticals.
2. **Watch the 12 ad-ops recipes video** — 18 minutes, walks through each recipe with examples. Linked from the buyer portal at https://grow.glitchexecutor.com/buyer-portal/{payment_id}.
3. **Send your first cold email** — the playbook has 3 outreach templates pre-filled with your service description. Hit reply with three brand names you want to pitch and we'll help tune the angle.

You bought the engine. The first client is the only thing left between you and recovering the license cost 10× over.

— Tejas, Glitch Grow
