# BSK-001 — README audit + rewrite plan

**Repo:** `glitch-executor/glitch-grow-mcp-builder-pack`
**Local:** `/home/support/glitch-grow-mcp-builder-pack/`
**Current README:** 92 lines, 7 sections.

## Audit (current state)

| Surface | Score | Notes |
|---|---|---|
| Install steps | **6/10** | Has a top-level loop, but skips `supermetrics-mcp` correctly. Missing: prerequisite versions stated up-front (`Python 3.11+`, `pipx`/`uv` is mentioned but not how to get it). The `for d in ...` loop runs sequentially with no error handling — if one MCP fails, the others silently continue. |
| First-run walkthrough | **3/10** | After install, the buyer is dropped at "see the per-MCP README." There's **no end-to-end smoke test** at the pack level — no "run this one command to confirm everything is wired." Buyer has to pick an MCP, find its auth flow, and only then see signs of life. |
| Env-var docs | **2/10** | The pack-level README has zero env-var reference. Each sub-MCP documents its own, but a buyer wiring all five hits five separate auth setups without a consolidated checklist. No `.env.example` at the pack root. |
| Failure modes | **1/10** | No troubleshooting section. The most likely buyer failures (Meta token expiry, Google Ads developer-token approval, LinkedIn restli quirks, Amazon LWA profile mismatch) are nowhere acknowledged. |
| Resale playbook | **2/10** | "Want it managed?" section exists but is upsell, not playbook. The 15-page playbook promised in marketing copy is **not actually in the repo** — major gap. Buyer paid $39 for it. |

## Proposed new README structure

```
# Glitch Grow MCP Builder Pack — BSK-001

> 60-second pitch (one paragraph, no marketing fluff)

## Prerequisites
- Python 3.11+ (verify: `python3 --version`)
- pipx or uv (one-line install commands shown)
- An MCP-capable client (Claude Desktop / Cursor / your own agent)

## Quickstart (5 minutes)
1. Clone + run `./scripts/quickstart.sh`
2. Pick ONE MCP to wire first (recommend meta-ads — most buyers have a Meta token already)
3. Smoke test: `python3 -m meta_ads_mcp.server --selftest` returns `OK`
4. Wire to Claude Desktop: copy-paste the snippet below

## What you get (the table that's already there — keep)

## The 5 MCPs, ranked by buyer ROI
1. meta-ads — most demand, easiest sale ($29-99/mo managed)
2. google-ads — second most demand, hardest auth (developer-token approval)
3. linkedin-ads — niche but high-value (B2B $99/mo+)
4. amazon-ads — Meta-CAPI bridge is the unique angle
5. supermetrics — STUB, treat as starter code

## Auth setup per MCP
[For each: "what you need", "where to get it", "common rejection reasons"]

## Common errors + fixes
- "Invalid OAuth token" (Meta): regenerate via Graph API Explorer, scopes...
- "developer-token not approved" (Google Ads): apply at...
- "restli encoding error" (LinkedIn): see linkedin-ads-mcp/docs/restli.md
- "LWA profile_id missing" (Amazon): ...
- "Claude Desktop doesn't see the MCP": restart Claude Desktop fully (Cmd+Q, not just close)

## Wire to Claude Desktop
[Existing JSON skeleton — keep, but add macOS + Linux + Windows paths]

## Resale playbook (NEW — this is what buyers paid for)
- Pricing tiers: $29 hobbyist / $79 pro / $199 agency (with feature breakdown)
- Listing copy templates for: Smithery, Pipedream, MCP.so, your own site
- The 5-tweet launch sequence (verbatim, just swap the SKU name)
- First-client outreach: 3 cold-DM templates (LinkedIn / Twitter / Email)
- Maintenance contract template (linked, in /docs/playbook/)

## Support
- Discord: <link>
- Buyer-portal: grow.glitchexecutor.com/buyer-portal?payment_id=...
- Walkthrough video: <YouTube unlisted link>
```

## Specific changes vs current

1. **ADD** `Prerequisites` section above install — currently buried.
2. **ADD** `./scripts/quickstart.sh` invocation (shipped via Deliverable 3).
3. **ADD** `--selftest` flag spec to each MCP (sub-tasks for follow-up; here just document the contract: exit 0 + prints `OK <mcp-name> v<version>`).
4. **ADD** "Common errors + fixes" — 5 entries minimum, one per MCP.
5. **ADD** Resale playbook section. **Block on:** the 15-page playbook content needs to be written. Current options: (a) write it now in `/docs/playbook/` (4–6 hours), (b) cut it from marketing copy until written. Recommend (a) for the next session.
6. **REMOVE** "Want it managed?" upsell — it's noise inside a doc the buyer already paid for. Move to a footer link.
7. **ADD** ranked-by-ROI subsection — current "everything is equal" framing leaves the buyer paralyzed. Order them.
8. **CLARIFY** supermetrics-mcp status — current callout is good but should be in the table title not a footnote, so it's impossible to miss.

## Estimated scope
- README rewrite: 2 hours.
- `--selftest` flag stubbed across 4 MCPs: 1 hour each.
- Playbook content (the missing $39 promise): 4–6 hours, separate session.
- Total: ~12 hours before this BSK feels finished.

## Tejas decision needed
- Does the playbook content live in this repo's `/docs/playbook/` (most useful for buyers, but exposes copy in case of leak), or in a separately-gated Notion/Discord channel? Recommend in-repo — simpler, and the BSL licence + buyer-restricted access already gates it.
