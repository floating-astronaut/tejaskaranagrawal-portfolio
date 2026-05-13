# BSK-003 — Walkthrough video script

**Target length:** 6 minutes. **Title:** *LangGraph Sales Agent — vertical outbound that gets replies, not flagged.*

## Beat 0 — Cold open (0:00–0:20)
**On screen:** Gmail with a "Promotions" tab full of cold emails getting buried. Then a different Gmail with an actual inbox reply from a prospect saying "yes, let's talk."
**VO:** "Outbound is dead, except when it's not. The difference is whether your email reads like a template or whether it reads like someone actually looked at the prospect's website before sending. This agent does the second thing."

## Beat 1 — What's running (0:20–1:00)
**On screen:** Discord approval card — *Lead: [Toronto cannabis retailer name] · Recipe: builder-on-Wix · Subject: noticed you're on Wix — here's a 2-min teardown · Body preview: 4 lines.* Operator taps approve. Sent confirmation appears. Two days later — a reply.
**VO:** "Eight recipes, each tuned for a different lead-state — no website, Linktree, generic builder, Lightspeed, custom. Discord approval, one tap. Per-recipe autonomy: once a recipe earns five approvals with no rejections, it auto-sends within a daily cap."

## Beat 2 — Install (1:00–2:30)
**On screen:** terminal — clone, `./scripts/quickstart.sh`. Script asks for Postgres URL, GCP project ID + target SA, Resend API key, Discord bot token. Runs install, runs migrations.
**VO:** "Quickstart prompts for the four tier-1 env vars, installs, runs Alembic, creates the pgvector tables. Three minutes."

## Beat 3 — Smoke test (2:30–3:00)
**On screen:** `python -m sales_agent.cli draft --fixture demo-lead`. A fake lead's drafted email prints to stdout — subject, body, CASL footer. No send, no Discord ping.
**VO:** "Smoke test drafts an email against a fake lead. You see what the agent produces before any real sends. Install confirmed."

## Beat 4 — Wire your first real outbound (3:00–4:15)
**On screen:** `python -m sales_agent.cli discover --radius 8000` — pulls 30 real businesses from Google Places. Show the dedup against existing leads. Then `--draft` runs the recipe selector on those leads. First Discord ping appears with an editable card.
**VO:** "Discover pulls businesses in your geo. Draft selects a recipe per lead based on their site state. Discord becomes your inbox — approve, reject, or inline-edit the draft before it sends."

## Beat 5 — The configuration trap (4:15–4:45)
**On screen:** Gmail OAuth refresh-token failure six months in. Show how to renew + the option to just publish the OAuth app.
**VO:** "Gmail OAuth refresh tokens expire after six months on unverified apps. Two options — publish your OAuth app, or refresh tokens manually quarterly. Publish if you're past 30 days of use; refresh if you're piloting."

## Beat 6 — How to monetise (4:45–5:45)
**On screen:** `/docs/playbook/pricing-tiers.md`.
**VO:** "Two tiers. Studio at $797/mo — one thousand emails per month, three sender domains, monthly recipe-tune. Retainer at $5,000-plus a month — vertical-focused, multi-brand, you pick the verticals."

**Concrete first client:** "Pick one B2B SaaS in a vertical you actually understand. Find their LinkedIn-active founder. DM: *I run vertical outbound for [your-vertical] — first 50 sends free, you keep the leads either way.* That's a 30 percent reply rate when the vertical match is real."

**Concrete price band:** "$797/mo Studio. Don't undercut — outbound looks expensive until the first reply lands a $50K deal."

## Beat 7 — Outro (5:45–6:00)
**On screen:** buyer portal.
**VO:** "Discord, repo, playbook on your buyer portal. Send your first 33 emails this week."

---
## Recording notes
- Use the Glitch Budz outbound run as the live example (already in production).
- Sanitize lead names + emails before recording.
- Demo-lead fixture must produce a coherent draft for the smoke-test beat.
- Same encode + upload spec.
