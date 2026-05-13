# BSK-001 — Walkthrough video script

**Target length:** 6 minutes. **Title:** *MCP Builder Pack — ship a production MCP server by Friday.*

## Beat 0 — Cold open (0:00–0:20)
**On screen:** terminal with `claude-desktop` open, asking "what ad campaigns ran for store X last week?" — Claude responds *without* a working MCP and gives the apology answer.
**VO:** "Here's the problem. Claude can't see your Meta Ads account. It can't read your Google campaigns. It can't pull Amazon attribution. There are 11,000 MCP servers out there and fewer than 5% are actually monetised — most stop at toy demos."

## Beat 1 — The pack (0:20–1:00)
**On screen:** the `glitch-grow-mcp-builder-pack` repo tree, then the README opening.
**VO:** "MCP Builder Pack ships five working ad-platform MCPs: Meta, Google, Amazon Attribution, LinkedIn, and a Supermetrics scaffold. Plus the playbook to sell them at $29 to $99 a month managed, or five to twenty-five thousand per custom build. Let me get one running."

## Beat 2 — Install (1:00–2:30)
**On screen:** terminal — `git clone <codeberg url>`, then `cd` in, then `./scripts/quickstart.sh`. Script prompts for Python version detection, picks meta-ads-mcp first, asks for `META_ACCESS_TOKEN`. Buyer pastes a token (use a sandboxed test token on screen).
**VO:** "Run quickstart. It detects your Python version, sets up the venv, asks for the one token Meta needs, and runs a self-test."

## Beat 3 — Smoke test (2:30–3:00)
**On screen:** `python3 -m meta_ads_mcp.server --selftest` returns `OK meta-ads-mcp v0.4.1`. Then a one-liner: `python3 -m meta_ads_mcp.server` runs the server.
**VO:** "Self-test green — install worked. Server's running."

## Beat 4 — Wire to Claude Desktop (3:00–4:00)
**On screen:** open `~/Library/Application Support/Claude/claude_desktop_config.json`, paste the snippet from README, save, restart Claude Desktop (Cmd+Q, full quit). Reopen Claude. New chat — "list my Meta ad campaigns from last week." Claude calls the tool, returns campaign rows.
**VO:** "Drop this into Claude Desktop config — full quit, not close — and ask it your question. There are your campaigns, live, from your account."

## Beat 5 — The configuration trap (4:00–4:45)
**On screen:** common error — Claude Desktop returns "tool not available." Show the fix: macOS path vs Linux path is different, and `command:` must be the absolute path to the venv's Python, not `python3`.
**VO:** "One trap that bites everyone: `command:` has to be the absolute path to your venv's Python. Not `python3`. Not `which python`. The full slash path. Use the snippet in the README and you skip this entirely."

## Beat 6 — How to monetise (4:45–6:00)
**On screen:** open `/docs/playbook/pricing-tiers.md` in editor (this needs to be written — see readme-plan).
**VO:** "Here's the part you actually paid for. Three pricing tiers: $29 hobbyist, $79 pro, $199 agency — with feature breakdown. Listing copy for Smithery and MCP.so. The 5-tweet launch sequence I used. Three cold-DM templates for first clients."

**Concrete first client:** "Pick one SaaS you use — Notion, Linear, Stripe — and DM their power users on X. Subject line: *I built a managed MCP for [SaaS] — 30 days free.* That's how I got the first three buyers for the Meta Ads MCP."

**Concrete price band:** "Start at $29/mo for the hobbyist tier. Don't go below — anchor matters. The pack pays itself off at one buyer."

## Beat 7 — Outro (6:00–6:15)
**On screen:** buyer-portal page with Discord link + repo link.
**VO:** "Repo, Discord, and the playbook are on your buyer portal. Ship one this week."

---
## Recording notes (for batch session)
- Use a clean macOS or Linux desktop with no other tools open.
- Pre-create the Meta sandbox account so the token paste doesn't expose anything.
- Pre-cache the Claude Desktop config screen so editing is fast.
- Audio: ~120 wpm, no music.
- Asciinema for terminal sections (export as gif/video for cuts).
- Final encode: 1080p, mp4, upload as YouTube unlisted.
