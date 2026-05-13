# Welcome-email rewrite — per-SKU templates

**Current state:** `functions/api/fulfill/grant-access.ts` → `sendWelcomeEmail()` builds one generic HTML body (line 312–~380) referencing the repo URL and a `/playbook` folder. Same copy regardless of SKU.
**Goal:** SKU-specific email — links the walkthrough video, the buyer portal, the cloned-and-ready clone command, the Discord channel, and a tailored "first 24 hours" checklist.
**Scope:** spec only. Integration into `grant-access.ts` is a follow-up session.

## Shared structure (every SKU)

```
Subject: {sku.name} — your first 24 hours
From: Tejas <tejas@glitchexecutor.com>

Hi {first_name},

Thanks for buying {sku.name}. Here's your one-page jump:

  ▸ Walkthrough video (6 min):  {video_url}
  ▸ Buyer portal (links + Discord):  https://grow.glitchexecutor.com/buyer-portal?payment_id={payment_id}
  ▸ Clone the repo:
        git clone git@codeberg.org:{repo}.git
        cd {repo_dir} && ./scripts/quickstart.sh
  ▸ Discord (buyer-only):  {discord_invite_url}

Your first 24 hours
─────────────────────
{per-SKU checklist — see below}

Stuck on anything? Reply to this email or ping me in #ask-tejas on Discord.

— Tejas
```

The buyer-portal link is the single canonical "what now?" — every other channel (this email, Discord welcome, in-repo README) points back to it.

## Per-SKU checklists

### BSK-001 — MCP Builder Pack
```
Your first 24 hours
─────────────────────
☐ Run quickstart with meta-ads-mcp (5 min — easiest auth)
☐ Wire it to Claude Desktop (snippet in README)
☐ Ask Claude: "list my Meta ad campaigns from last week" — confirm it answers
☐ Read the playbook (/docs/playbook/) — pricing tiers + listing copy
☐ Pick ONE SaaS to build a managed-MCP for (Notion / Linear / Stripe / your favorite)
☐ Draft your launch tweet from the 5-tweet template

By Friday: have the second MCP wired (google-ads or linkedin-ads).
By next week: first $29 buyer.
```

### BSK-002 — LangGraph Ads Operator
```
Your first 24 hours
─────────────────────
☐ Run quickstart (Postgres + pgvector + Discord webhook)
☐ Smoke test: python -m ads_agent.cli plan --brand demo --dry-run
☐ Wire your first real brand into STORES_JSON (template in /docs/configs/)
☐ Confirm first Discord ping arrives within 60 seconds
☐ Read the playbook (/docs/playbook/) — Solo / Studio / Multi-Brand pricing

By Friday: pick one D2C Shopify brand to outreach as Studio-tier client.
Cold-DM template + Loom script in the playbook.
```

### BSK-003 — LangGraph Sales Agent
```
Your first 24 hours
─────────────────────
☐ Run quickstart (Postgres + GCP Places + Resend domain verified + Discord)
☐ Smoke test: python -m sales_agent.cli draft --fixture demo-lead
☐ Run discovery in YOUR geography: python -m sales_agent.cli discover --radius 8000
☐ Approve your first 3 drafts in Discord (no --send yet — review the copy)
☐ Read the playbook (/docs/playbook/) — Studio + Retainer pricing + verticals

CASL note: your sender postal address is required on every cold email.
Set CASL_SENDER_NAME + CASL_SENDER_ADDRESS in .env before --send.

By Friday: 33-lead pilot run live. Reply rate target: 5-10%.
```

### BSK-005 — Voice AI Agent
```
Your first 24 hours
─────────────────────
☐ Run quickstart (pnpm — NOT npm — Postgres, LiveKit, Sarvam, ElevenLabs)
☐ Smoke test 1: pnpm test:hello (agent says "नमस्ते, मैं प्रिया")
☐ Smoke test 2: pnpm dispatch:dry-run (zero PSTN, logs only)
☐ Smoke test 3: pnpm test:call --to=+91YOURNUMBER (real call to your phone)
☐ Read the playbook + unit-economics sheet (/docs/playbook/)

ElevenLabs gotcha: scoped keys without voices:read silently fail.
Use a full-permission key OR scope to voices:read + voices:write + text-to-speech.

By Friday: one Indian Shopify merchant signed up for free 50-call pilot.
WhatsApp intro template (Hindi + English) is in the playbook.
```

### BSK-ALL — Founder Stack (all four shipped + bundle bonuses)
```
Your first 24 hours
─────────────────────
☐ Pick ONE BSK to start with — recommend BSK-002 (Ads) if you have ad clients today,
  BSK-003 (Sales) if you're starting cold, BSK-005 (Voice) if you're targeting India D2C
☐ Run that BSK's quickstart end-to-end before opening the others
☐ Book your 30-min architecture call:  {calcom_url}
☐ Join Discord with the founding-buyer badge
☐ Skim all four playbooks (in each repo's /docs/playbook/) for the resale angles

You also get future SKUs free for 12 months (one new SKU per quarter — we'll
email when each lands).
```

## Per-SKU video URL mapping (placeholders until recording done)

| SKU | YouTube unlisted URL |
|---|---|
| BSK-001 | `<set after recording>` |
| BSK-002 | `<set after recording>` |
| BSK-003 | `<set after recording>` |
| BSK-005 | `<set after recording>` |
| BSK-ALL | landing page that lists all four videos (a single Astro page on grow.glitchexecutor.com) |

Recommend storing these in `_sku-catalog.ts` alongside `repo` so `grant-access.ts` can interpolate them without a separate lookup table.

## Implementation notes (for follow-up session)

1. Extend `SkuEntry` in `_sku-catalog.ts` with optional `videoUrl`, `discordChannel`, `firstDayChecklist` (array of strings).
2. Refactor `sendWelcomeEmail()` in `grant-access.ts`:
   - Accept the SKU entry (already passed as `entry`).
   - Build the buyer-portal URL via `${env.SITE_URL}/buyer-portal?payment_id=${body.payment_id}`.
   - Render checklist via a `renderChecklist(entry)` helper.
   - Bundle case: iterate `entry.repos` and render multiple clone commands; use `BSK-ALL` checklist verbatim.
3. Keep the plaintext fallback in sync with the HTML — same five sections, same checklist.
4. Subject line: change from generic to `{sku.name} — your first 24 hours`.
5. The `manualOnly` SKU path (currently used for BSK-004 and BSK-006) should still work — show "repo access pending" in place of the clone command, keep everything else.

## Tejas decision needed

1. From-address: keep `tejas@glitchexecutor.com`, or move to `support@`? Recommend `tejas@` for the welcome — buyers like the founder name; transactional-only after.
2. Reply-to: same as From, or split to `support@`? Recommend same — replies should reach you, not a shared inbox at this scale.
3. Cal.com URL for the bundle: do you have a 30-min architecture-call booking link? Hard-code into the BSK-ALL checklist once provided.
4. Should the email mention pricing for the OTHER BSKs (cross-sell) or stay focused on what they bought? Recommend stay focused — cross-sell goes in a separate "30 days in" email.
5. Should we wait until the videos are recorded before shipping the new email template? Recommend ship now with `<video coming soon — buyer portal will update>` placeholder; backfill in `_sku-catalog.ts` after recording. The other four sections deliver value today.
