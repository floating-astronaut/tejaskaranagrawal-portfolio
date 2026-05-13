# Website tone-refresh plan — 2026-05-08

> Build is good. Design is good. Layout is good.
> The **copy** still reads like the old positioning ("six boilerplates you fork and self-host") instead of the current one ("AI Digital Marketing Stack — six AI agents that plug into Claude Code; Claude does the install for you").
>
> This plan inventories every surface that needs the tone-refresh, names the contract it should hit, and proposes an execution order. **Plan is for review before any edits land.**

---

## 1. The new tone — what we're moving toward

**Anchor message** (every page should support some part of this):

> *"Six AI agents (ads, sales, social, voice, SEO, UGC creative) that plug into Claude Code. Buy once, you own the deployment forever, no terminal needed. Resell to clients as a managed service for $1,497–$2,997/mo per service line."*

**Words to use:**
- "AI Digital Marketing Stack" / "the Stack"
- "Six AI agents that plug into Claude Code"
- "Claude Code installs it for you" / "no terminal required"
- "You own the deployment" / "Your infrastructure, your data"
- "Buy once, perpetual licence"
- "Resell to clients as a managed service"

**Words to retire:**
- "boilerplate" → AI agent (or "production agent" where emphasis matters)
- "fork and deploy" / "clone and deploy" → "open in Claude Code and let it install"
- "self-host" → "deploy on your infrastructure" (only when contrast with hosted SaaS matters)
- "LangGraph orchestrator" → leave in capabilities prose where factually relevant; remove from product names + chips
- "MCP server" as primary marketing term → "AI agent" is the product, "MCP" is the delivery mechanism (so use MCP only in install / technical context)
- "All 6 boilerplates" → "All 6 AI agents"

**Words still to keep:**
- "Source-available" / "BSL 1.1" — buyer trust signal, technical-but-readable
- "White-label" — agencies recognise it; high-conversion verb
- "Production" — "production AI agents" still lands; "production-grade" too
- "Brand-config" / "brand-config schema" — fine in detail-page prose

---

## 2. Surface-by-surface plan

For each file: **what's there now**, **what it should say**, and a one-line **rewrite contract**.

### 2.1 Hero (`src/components/sections/Hero.astro`)
**Now**: H1 reads "Your AI Digital Marketing Stack. / Marketing Stack. / Six agents. Six MCPs." Subhead is correct.
**Refine**:
- Audience-pill text "For agency owners · freelancers · indie devs" — drop "indie devs" (the new tone is marketer-friendly; indie devs aren't the lead ICP). Replace with "For agencies · freelancers · marketing operators".
- Trust strip "Free · no card required · Claude Code, Codex, OpenClaws · Discord included." — fine, but consider replacing OpenClaws with Cursor (more recognisable).
**Effort**: 5 min.

### 2.2 SaaS vs Ownership (`src/components/sections/SaasVsOwnership.astro`)
**Now**: cost slider showing 3-yr TCO of Zapier + Make + n8n + Vapi + … vs $499 once.
**Refine**:
- Top eyebrow + heading should reframe from "SaaS vs ownership" to "Stop renting. Start owning the AI marketing stack."
- "Glitch Grow Founder Stack" display label → "AI Digital Marketing Stack"
- Add a row in the comparison: "Setup time" — SaaS = "weeks of integration" / Stack = "30 minutes with Claude Code". Surfaces the new install story.
**Effort**: 30 min.

### 2.3 TwoPaths / Persona section (`src/components/sections/TwoPaths.astro`)
**Now**: 5 personas (agency-owner, freelancer, indie-dev, vibe-coder, enthusiast) with `first` recommendations.
**Refine**:
- Replace "Indie dev" persona with "Marketing operator" (the marketer-at-a-D2C-brand who runs ads in-house). Higher-volume ICP.
- Replace "AI enthusiast" with "Performance marketer" (paid-ads specialist).
- "vibe-coder" → keep but rename label to "Solo founder" (broader, marketer-friendly).
- Each `first` line should reference a single agent or "the Stack", not technical terms.
- Each `monetize` line should be the dollar-amount pitch, not feature pitch.
**Effort**: 40 min.

### 2.4 HowItWorks (`src/components/sections/HowItWorks.astro`)
**Now**: 4-step flow probably "buy → clone → configure → deploy". File has "boilerplate" matches.
**Refine**: Rewrite the four steps around the new install story:
  1. **Pick an agent (or the Stack)** — six options, one bundle
  2. **Open in Claude Code** — paste the welcome-email prompt
  3. **Claude installs it for you** — asks for keys one at a time, validates each
  4. **Bill clients $1,497–$2,997/mo** — managed service, agent does the work
**Effort**: 45 min — full rewrite of step copy + visuals.

### 2.5 AgentsCatalog (`src/components/sections/AgentsCatalog.astro`)
**Now**: 6 cards driven from `products.ts`. `chips` + `oneLiner` already mostly clean from the typography pass.
**Refine**: Verify each SKU's chips + oneLiner reads outcome-first, not stack-first. Fix anything still leading with technical detail. Same for `productLine`.
**Effort**: 20 min — copy QA across 6 SKUs in `products.ts`.

### 2.6 KitPricing (`src/components/sections/KitPricing.astro`)
**Now**: AI Digital Marketing Stack section title. Six agent chips. CTA "Get the Stack".
**Refine**:
- "One deployable agent stack. / Six MCPs, one operating model." — rewrite to "Stop assembling tools. / Run one stack." or similar marketer-friendly phrasing
- "section-lead" body needs a single line about "Claude Code installs it for you"
- "afterPurchase" tiles ("Source invite", "Deploy guide", "Discord install help", "Architecture call") — second one should be "AGENTS.md auto-installer" / "Claude installs it" framing
**Effort**: 30 min.

### 2.7 ResellerMath / "Who it's for" (`src/components/sections/ResellerMath.astro`)
**Now**: Persona-selector chip pattern (we built this earlier). 6 personas with bullets.
**Refine**: Verify the bullets still read as "you don't need to code" forward and not "you need to know LangGraph". Two of the personas (vibe-coders, enthusiasts) probably tilt technical; rebalance toward outcome-language.
**Effort**: 25 min — file is data-driven so quick.

### 2.8 FAQ (`src/components/sections/FAQ.astro`)
**Now**: probably skews technical (LangGraph, memory, HITL).
**Refine**: Add 4 questions targeting non-coder buyers:
  1. *"I can't code. Can I still use this?"* → Yes, Claude Code installs it for you
  2. *"What's Claude Code?"* → Anthropic's coding-AI client; free tier exists; install link
  3. *"Do I need to host anything?"* → It runs on your laptop or your VPS — your call. We don't host.
  4. *"How do updates work?"* → `git pull` (Claude can do it in one prompt)
Move existing technical-skewed questions later in the list.
**Effort**: 40 min.

### 2.9 CallToAction (`src/components/sections/CallToAction.astro`)
**Now**: final ask block.
**Refine**: One sharp line + one CTA. Recommend: *"Stop assembling. Start owning. Six AI agents, one stack, $499 once."* + "Get the Stack" button.
**Effort**: 15 min.

### 2.10 Hero terminal mock (within `Hero.astro`)
**Now**: real install commands (git clone + quickstart.sh + cli plan --dry-run). Honest but technical.
**Refine**: Two options:
- (a) Keep the terminal as-is (it's behind a `<details>` collapse, devs only see it). No change.
- (b) Replace with what the buyer actually types in Claude Code:
  ```
  > Read AGENTS.md and set this agent up for me.
  ✓ Claude Code: detected Mac · Node 20 ✓ · Postgres ✓
  ✓ Claude Code: please paste your Meta long-lived token
  > [you paste]
  ✓ verified · ad account "Skincare Co" · 247 active ads
  ✓ install complete · agent ready
  > Pause anything below 1.5 ROAS
  ✓ done · 3 ads paused · awaiting Discord approval
  ```
**Recommend (b)** — it's the actual install story, not the technical install story. **Effort**: 20 min.

### 2.11 Product detail pages (`src/pages/products/[slug].astro` + `src/lib/products.ts`)
**Now**: per-SKU `tagline`, `subline`, `whatYouGet`, `bestFor`, `sellAs`, `requirements`, `priceLine`, `capabilities`, `derivativeUseCases`. Per-SKU prose still has "LangGraph orchestrator" / "Full LangGraph orchestrator repo" type language.
**Refine**: Per-SKU pass through `products.ts` — keep technical accuracy but lead each line with outcome:
  - `tagline` should be a 1-liner the buyer would say out loud, not the engineer
  - `subline` opens with what the agent does (3 sentences), THEN gets technical
  - `whatYouGet` — already pretty good
  - `requirements` — replace tone of "you need Postgres + GCE + tokens" with "Claude Code handles the install; you'll need keys for [X, Y, Z]"
**Effort**: 1 hour — across 6 SKUs in `products.ts`.

### 2.12 Free tools (`src/pages/tools/index.astro`, calculators)
**Now**: SaaS-vs-own calculator landing copy still says "Founder Stack" in two places (already swept) but tone leans technical.
**Refine**: Page-title metas + landing intros to mention "AI digital marketing stack" once each for SEO consistency. Calculator output copy unchanged.
**Effort**: 15 min.

### 2.13 Stack section (`src/components/sections/Stack.astro`)
**Now**: Tech-stack diagram or list.
**Refine**: This is a feature-content section — likely lists LangGraph, Postgres, etc. Honest tech-stack table is fine; just retitle the section eyebrow to something like "Under the hood" rather than "What you're buying" so non-coders can scroll past without confusion.
**Effort**: 15 min.

### 2.14 Outcomes (`src/components/sections/Outcomes.astro`)
**Now**: results from production deployments.
**Refine**: Verify the case-study numbers are still accurate; check the framing isn't "look at this code we built" but "look at the outcomes this stack ships".
**Effort**: 20 min.

### 2.15 Pilot (`src/components/sections/Pilot.astro`)
**Now**: pilot/preview / case-study card. Has `boilerplate` mention.
**Refine**: Audit + tone-refresh. Probably 1-2 string swaps.
**Effort**: 10 min.

### 2.16 Audiences data (`src/data/audiences.ts`)
**Now**: 8 personas with `blurb`, `painPoints`, `winValues`, etc. surfaced on `/for/[slug]` pages. Has multiple "boilerplate" mentions.
**Refine**: Replace "boilerplate" → "AI agent" / "the Stack" depending on context. Update price refs (`$39` legacy from BSK-001 days). Verify each persona's pitch matches the new ICP framing.
**Effort**: 30 min.

### 2.17 Schema markup (`src/components/schema/SoftwareApplicationSchema.astro`)
**Now**: structured-data emitter. Probably has hardcoded `boilerplate`-tone description.
**Refine**: Default description string + applicationCategory.
**Effort**: 10 min.

### 2.18 Glossary index (`src/pages/glossary/index.astro` + `[slug].astro`)
**Now**: probably has "boilerplate" in the page lede.
**Refine**: Page lede: *"Working definitions for the terms behind the AI Digital Marketing Stack."*
**Effort**: 10 min.

### 2.19 Legal pages (`src/pages/legal/*` + `src/pages/in/legal/*`)
**Now**: Terms / Refund / Privacy. Use "boilerplate" once or twice.
**Refine**: Two-word swap — "boilerplate" → "AI agent" — without rewriting legal substance.
**Effort**: 10 min.

### 2.20 Compare matrix (`src/pages/compare/index.astro`)
**Now**: 5-category chip rail + comparison tables. Already mostly clean.
**Refine**: Verify the "Glitch Grow alt" column reads as outcomes, not features. Check the body copy under each category for stale framing.
**Effort**: 20 min.

---

## 3. Tone-refresh content contracts (drafts)

These are the actual strings I'd ship. Review and approve / edit before I land them in the right files.

### 3.1 Hero subhead (final form)
> The full **AI Digital Marketing Stack** — six MCP agents (ads, sales, social, voice, SEO, UGC) that plug into Claude Code. Buy once, run on your infra, resell to clients at $1.5K–$3K/mo per service line. **Claude installs it for you** — no terminal required.

### 3.2 SaaS-vs-Ownership eyebrow + h2
- eyebrow: "The math behind owning your stack"
- h2: "Stop renting. **Start owning** the AI marketing stack."
- subhead: "Zapier, AdEspresso, Smartlead, Vapi, AdCreative.ai — five SaaS subscriptions that bill you forever. The AI Digital Marketing Stack does the same outcome work for $499 once. Claude installs it. You own it."

### 3.3 HowItWorks four steps
1. **Pick** — one agent ($99–$149) or the full Stack ($499). Stripe / Razorpay (India).
2. **Open in Claude Code** — paste the prompt from the welcome email.
3. **Let Claude install it** — ask for keys, validate, smoke-test, ready in ~30 minutes.
4. **Run, sell, repeat** — bill clients $1,497–$2,997/mo per managed service line.

### 3.4 New FAQ entries
**Q: I can't code. Can I still use this?**
A: Yes. The agent ships with an `AGENTS.md` file at the root. When you open it in Claude Code (free for the install) and paste *"Read AGENTS.md and set this agent up for me"*, Claude reads the file, installs Node / Postgres / dependencies, asks you for API keys one at a time in plain language, and runs the smoke test for you. You don't open a terminal yourself; Claude does it on your behalf. Same flow works in Codex, Cursor, Aider, Continue.

**Q: What's Claude Code?**
A: Anthropic's coding-AI client. Free tier exists; paid tier is $20/mo and unlocks longer sessions. Download at claude.ai/code. Codex (OpenAI) and Cursor (anysphere) are equivalent — pick whichever you already use. Any AI client that can run shell commands works.

**Q: Do I need to host anything? Where does my data live?**
A: It runs on whatever machine you point it at — your laptop for testing, a $5 VPS for production. We don't host. We don't see your data. Your client tokens, your client data, your decision history — all stays on your infrastructure forever. Per the BSL 1.1 licence, you also own the right to modify the code, white-label deployments, and resell as a managed service to clients.

**Q: How do updates work?**
A: When we ship engine improvements, you ask Claude Code: *"Update the agent to the latest version."* Claude runs `git pull`, reinstalls dependencies, runs migrations, re-runs the smoke test, and tells you when you're back online. No app store, no auto-updater, no surprise breaking changes — you control the timing.

### 3.5 CallToAction final ask
- eyebrow: "Last call"
- h2: "Stop assembling. Start owning."
- body: "Six AI agents. One stack. $499 once. Claude Code installs it for you in 30 minutes."
- primary CTA: "Get the Stack — $499"
- secondary CTA: "Or pick one agent"

### 3.6 Hero terminal mock (Claude-Code-conversation framing)
```
> Read AGENTS.md and set this agent up for me.
✓ Claude Code: detected macOS · Node 20 ✓ · Postgres ✓
✓ Claude Code: paste your Meta long-lived token
> [you paste]
✓ verified · ad account "Skincare Co" · 247 active ads
✓ install complete · agent ready

> Pause anything below 1.5 ROAS in Skincare
✓ proposed 3 pauses · awaiting Discord approval
✓ approved → 3 ads paused · cost saved estimate $84/day
```

---

## 4. Execution order (proposed)

Highest leverage first — fixes the most user-facing surfaces with smallest blast radius. Each step is its own commit so review stays granular.

| # | Group | Files touched | Effort |
|---|---|---|---|
| 1 | Hero polish (subhead + audience-pill + terminal mock swap) | `Hero.astro` | 30 min |
| 2 | New FAQ entries + question reorder | `FAQ.astro` (or wherever the FAQs live in data) | 40 min |
| 3 | HowItWorks four-step rewrite | `HowItWorks.astro` | 45 min |
| 4 | SaaS-vs-Ownership eyebrow + h2 + setup-time row | `SaasVsOwnership.astro` | 30 min |
| 5 | KitPricing copy refresh + afterPurchase tile rewrite | `KitPricing.astro` | 30 min |
| 6 | Per-SKU tone pass on `products.ts` (tagline / subline / requirements) | `src/lib/products.ts` | 1 hr |
| 7 | TwoPaths persona ICP rebalance | `TwoPaths.astro` | 40 min |
| 8 | Audiences.ts persona blurb cleanup | `src/data/audiences.ts` | 30 min |
| 9 | CallToAction final ask | `CallToAction.astro` | 15 min |
| 10 | Stack / Outcomes / Pilot light refresh | three .astro files | 45 min |
| 11 | Glossary index + legal pages "boilerplate" sweep | three files | 20 min |
| 12 | Schema-markup default description | `SoftwareApplicationSchema.astro` | 10 min |

**Total: ~6 hours of focused work**, broken into 12 review-able commits. Doable in one session if uninterrupted.

---

## 5. What's deliberately NOT in this plan

- **MDX content cluster** (`/blog/*.mdx`, `/alternatives/*.mdx`, `/vs/*.mdx`, `/glossary/*.mdx`) — these are SEO content with their own narrative integrity; rewriting them mid-cycle hurts inbound link anchor consistency. Sweep on a dedicated content pass after this tone-refresh ships and we have data on what's ranking.
- **Buyer-portal page + per-SKU buyer PDFs** — separate workstream (delivery), not website-tone.
- **Visual / design changes** — the layout + design are good per Tejas. Only copy changes here.
- **`/llms.txt` and `/llms-full.txt`** — already updated in the SEO pivot commit.
- **Pricing changes** — separate decision. Tone refresh assumes current pricing.

---

## 6. Decisions before I start

Three things to confirm or correct:

1. **Persona swap**: drop "indie dev" + "AI enthusiast" as personas in the audience pill / TwoPaths section, replace with "marketing operator" + "performance marketer". Yes / no / different rebalance?
2. **Hero terminal mock — keep technical (option A) or swap to Claude-Code-conversation framing (option B)?** I lean B — it's the actual install story.
3. **Execution order** — happy with the 1→12 sequence? Anything you want pulled forward / dropped?

Answer those and I start on (1) Hero in the next message.
