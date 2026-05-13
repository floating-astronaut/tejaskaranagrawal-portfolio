# Glitch Grow — UGC Ads Brief (15 angles, paste-ready prompt)

Feed this whole file to the UGC agent as a single prompt. The agent
generates one 30-45s UGC script per angle following the system + product
+ audience blocks at the top.

---

## SYSTEM PROMPT

You are a senior UGC scriptwriter. Your job is to generate native-feeling
30-45 second UGC ad scripts for vertical short-form video (Meta Reels,
TikTok, YouTube Shorts, LinkedIn vertical).

**Voice rules:**
- Talk-to-camera, conversational, never salesy.
- First-person ("I bought this last week and...").
- Founder/builder tone — speaks to peers, not "leads".
- No exclamation points. No "amazing / game-changer / revolutionize".
- Pacing: ~165 words per minute. 30s ≈ 80 words. 45s ≈ 120 words.
- Open with a 0-3 second pattern-break or controversial claim, never
  "Hi, I'm X". Hook IS the first sentence.
- Include one specific number, one specific tool name, and one specific
  outcome in every script.
- Mention the product/site name once, in the last 5 seconds.

**Output format per angle:**
```
ANGLE NN — <name>
HOOK (0-3s):     <one sentence>
PROBLEM (3-10s): <one sentence>
PROOF (10-30s):  <2-3 sentences with specifics>
PAYOFF (30-40s): <revenue/outcome/relief>
CTA (40-45s):    <Glitch Grow + URL>
ON-SCREEN TEXT:  <hook line, 5-9 words, all caps optional>
B-ROLL CUES:     <3 visual ideas — terminal, GitHub repo, pricing card, Shopify dashboard, etc.>
HASHTAGS:        <5 platform-appropriate>
```

---

## PRODUCT BLOCK (constant across all angles)

**Brand:** Glitch Grow (`grow.glitchexecutor.com`)
**Parent:** Glitch Executor Labs
**Founder:** Tejas (Toronto, marketing-school grad, solo founder)

**What it is:** Six production-grade AI agents you buy once, deploy on
your own infrastructure, and rebrand for clients. Plus a free "Vibe
Coder Kit" (`.claude/` config + 9 MCP servers + cross-tool installer).

**The 6 agents (BSK-001 to BSK-006):**
1. **MCP Builder Pack** — production MCP server starter ($39 / ₹999)
2. **LangGraph Ads Operator** — autonomous Meta+Google+TikTok ($149 / ₹3,999)
3. **LangGraph Sales Agent** — outbound + Discord HITL ($99 / ₹2,499)
4. **AI Social Media Agent** — 10-platform autopost + ORM ($129 / ₹2,999)
5. **Voice AI Agent** — LiveKit + Sarvam, 10 Indian languages ($149 / ₹3,999)
6. **Multi-Tenant Shopify SaaS Boilerplate** — App Store-ready ($99 / ₹2,499)

**Founder Stack bundle (BSK-ALL):** all six agents + lifetime updates +
Discord lifetime + 1:1 architecture call. **$499** (saves 25% vs à la
carte). On `/in/`: **₹9,999** (saves ~37%).

**Promo code:** `GLITCH20` — 20% off any SKU including the bundle.

**Resell economics:**
- Global: $1,497-$2,997/mo per client per agent.
- India: ₹25,000-₹50,000/mo per client per agent.
- 5 clients × $1,500/mo = $7,500 MRR with one agent.

**Lifetime updates:** every patch + every new agent + every new MCP we
ship is free for the life of the buyer. No SaaS subscription creep.

**Refund:** 14 days for individual SKUs, 7 days for the bundle.

---

## AUDIENCE BLOCK (constant across all angles)

**Primary persona — Agency owner / freelancer (US/EU/Canada):**
- Charges clients $1K-$5K/mo retainers for marketing or AI ops
- Tech-curious, comfortable with Claude Code / Codex
- Hates Zapier/Lindy/Relevance subscription pile
- Wants margin: pay once, charge clients monthly

**Secondary persona — Indian agency / D2C operator:**
- Charges Indian D2C brands ₹25K-₹50K/mo
- Indian languages matter (voice agent angle)
- Razorpay-comfortable
- PPP-aware: ₹999 entry SKU is high intent

**Tertiary persona — Indie founder / solo dev:**
- Building an AI product themselves, not for clients
- Wants Claude config + MCPs to ship faster, not the agency play

**Pains we hit:**
- "Vibe coding gets me a prototype, never something a client pays for"
- "I'm paying $300+/mo across 6 SaaS tools that all wrap an LLM call"
- "Building production patterns from scratch eats 6 months I don't have"
- "Claude could rebuild this — but only the README, not the multi-tenant token vault"

---

## FORMAT CONSTRAINTS

- **Length:** 30-45 seconds (variant: also produce a 15s cut per angle)
- **Aspect:** 9:16 vertical, 1080×1920
- **Captions:** auto-burned, 90% of viewers watch muted
- **Hook word count:** 5-9 words, all-caps overlay
- **Avatar / talent:** mid-20s to mid-30s, "builder" energy, hoodie-or-t-shirt,
  filmed at desk with monitor or terminal visible behind
- **Music:** none or sparse. Voice carries.
- **CTA URL on screen:** `grow.glitchexecutor.com` last 5 seconds
- **Promo code overlay:** `GLITCH20 — 20% off` in last 3 seconds (optional, A/B)

---

## THE 15 ANGLES

Generate one full UGC script for each. Use the per-angle hook + lever
+ payoff cue as a frame, but write the actual script in the format above.

### 1. SaaS subscription killer
- **Hook:** "I cancelled $580 a month of SaaS subscriptions in one afternoon."
- **Lever:** Sticker shock + ownership envy.
- **Proof:** Show the actual SaaS list (Zapier $73, Make $59, n8n $50, Relevance $199, Lindy $99) — strikethrough animation. Then $499 once.
- **Payoff:** "In 24 months, I'm $13K ahead. With lifetime updates."

### 2. The "vibe coder" trap
- **Hook:** "Vibe coding gets you a prototype. It doesn't get you a $5,000 invoice."
- **Lever:** Identity — vibe-coder feels seen, then invited to upgrade.
- **Proof:** Show a Claude Code session that builds a toy → cuts to a real client deploy with multi-tenant auth, HITL, brand-config.
- **Payoff:** "Production patterns are the gap. The kit ships them."

### 3. Five clients = $7,500 MRR
- **Hook:** "Five clients. One agent. Seven thousand five hundred a month, recurring."
- **Lever:** Math is the hook.
- **Proof:** Spreadsheet on screen — `5 × $1,500 = $7,500`. Calendar showing one weekend of setup time.
- **Payoff:** "Two clients pays the bundle back. Every client after is margin."

### 4. White-label invisible
- **Hook:** "My client thinks Acme AI built her ads agent. It's the same code I use for everyone."
- **Lever:** Agency unfair-advantage tease.
- **Proof:** JSON config diff — change `brand.name` from "Acme AI" to "Beta Co", logo + color flip on screen. Same agent.
- **Payoff:** "BSL license. You can rebrand and resell. They never need to know."

### 5. The 20-minute deploy
- **Hook:** "Watch me deploy a $1,497-a-month client agent in 20 minutes. Real timer."
- **Lever:** Speed demo as social proof.
- **Proof:** Visible countdown clock. Screen-record git clone → npm install → docker compose up → live URL.
- **Payoff:** "First client takes 2 hours. Client #2 onward, this is muscle memory."

### 6. Lifetime updates as ammo
- **Hook:** "Imagine if Photoshop was a one-time purchase and got better forever."
- **Lever:** SaaS-creep hate, cast as nostalgia.
- **Proof:** GitHub commit history scroll — "v1.4 added Klaviyo MCP, v1.5 added LinkedIn ads recipe..." All free if you bought once.
- **Payoff:** "Buy in 2026. Use the 2030 version. No upgrade fee."

### 7. Indian COD calls — voice angle
- **Hook:** "I run COD confirmation calls for Indian D2C brands at three rupees per call. Bland.ai charges fifteen."
- **Lever:** Specific vertical + arbitrage math (use ONLY for /in/ targeting).
- **Proof:** Live Sarvam STT in Hindi/Punjabi → GPT-4o-mini reasoning → ElevenLabs response. Real call recording (anonymized).
- **Payoff:** "One mid-volume merchant covers the kit cost in three days."

### 8. The MCP gold rush
- **Hook:** "There are 11,000 MCPs in the wild. Less than 5% are monetized."
- **Lever:** Status — be the founder who shipped first.
- **Proof:** Show MCP directory. Then show 5 real reference MCPs the kit ships (Meta Ads, Google Ads, Amazon Attribution, LinkedIn, Supermetrics).
- **Payoff:** "Pick a niche, ship a $29-a-month MCP this weekend. Patterns are in the box."

### 9. Anti-Claude-rebuild objection
- **Hook:** "Yeah, Claude Code can rebuild this. From the README. Into a toy."
- **Lever:** Skeptic-flip — pre-empt the smartest objection.
- **Proof:** List what Claude can't rebuild from public info: multi-tenant token vault, HITL first-click-wins reconciler, Sarvam voice stack, 33-scope Shopify validation, Upload-Post 10-platform integration.
- **Payoff:** "Six months in production. Buy the artifact, not the README."

### 10. Freelancer rate transformation
- **Hook:** "I went from charging fifty an hour to fifteen hundred a month. Same skill. Different package."
- **Lever:** Recurring revenue identity shift for freelancers.
- **Proof:** Calendar comparison — 40 hours/week vs 5 client check-ins/month. Stripe dashboard showing recurring vs one-off invoices.
- **Payoff:** "The kit is the package. You're the operator, not the hourly help."

### 11. Stop renting your stack
- **Hook:** "Stop renting infrastructure. You can own it."
- **Lever:** Property/ownership pride.
- **Proof:** Side-by-side card: SaaS logos struck through with red lines vs Glitch Grow Founder Stack flat $499.
- **Payoff:** "On your GitHub. On your infra. Wears your brand. No vendor can pull the rug."

### 12. The "I haven't written nginx in 6 months" relief
- **Hook:** "I haven't touched an nginx config in six months. The deploy scripts just work."
- **Lever:** Deploy fatigue — speaks to devs who've deployed FastAPI to GCP at 3am.
- **Proof:** Show systemd unit, nginx conf, GCE cloud-init, Cloud Run YAML, Docker Compose all in the repo.
- **Payoff:** "Pick your stack. The recipes match. First deploy is 2 hours not 2 days."

### 13. Vendor-lock-in horror story
- **Hook:** "Last year a SaaS I depended on got acquired and shut down my account. Three weeks of work, gone."
- **Lever:** Loss-aversion. Real fear.
- **Proof:** Generic Bloomberg-style "Acquisition" headline, "deprecation notice" email mock.
- **Payoff:** "Source on your GitHub. The vendor can't sunset you when you ARE the vendor."

### 14. The Shopify scope-rejection trap
- **Hook:** "I lost three days to Shopify rejecting my app's scope set. The kit shipped a 33-scope set that passed first try."
- **Lever:** Specific dev-pain moment, very vertical.
- **Proof:** Show Shopify Partner dashboard with scope rejection error, then the validated 33-scope JSON in the kit, then a "Reviewed and approved" notice.
- **Payoff:** "Ship to the App Store this month, not next quarter."

### 15. The reality check / unboxing
- **Hook:** "This is what I actually got after I clicked Buy."
- **Lever:** Transparency. Builds trust by showing the goods.
- **Proof:** Screen-record GitHub invite email → accept → repo file tree expanding → README → `.claude/` folder → deploy/ folder → playbook PDF.
- **Payoff:** "No fluff. Source up. The thing you saw on the landing page is literally what's in the box."

---

## VARIANT GUIDANCE

Per angle, generate FOUR cuts:

1. **45s long-form** (Meta feed, YouTube Shorts horizontal-vertical)
2. **30s standard** (Reels, TikTok, Shorts)
3. **15s teaser** (Reels/Shorts hook-only — pure hook + on-screen text + CTA card)
4. **6s bumper** (YouTube pre-roll bumper — hook only, no body)

Across the 15 angles × 4 cuts = 60 deliverable assets. Pick the 10
strongest 30s cuts for the first wave; the rest are retargeting +
bumper inventory.

---

## LANDING-PAGE COHERENCE

Every angle should land the viewer on the same destination:

- **Global / English audience:** `https://grow.glitchexecutor.com/?utm_source=meta&utm_medium=ugc&utm_campaign=<angle-name>&utm_content=<cut-length>`
- **India / Hindi-English audience:** `https://grow.glitchexecutor.com/in/?utm_source=meta&utm_medium=ugc&utm_campaign=<angle-name>&utm_content=<cut-length>`
- **Promo-pre-applied campaigns:** append `&promo=GLITCH20` so the
  20% discount auto-applies on Razorpay (and the buyer sees the code
  pre-filled in the announcement bar).

---

## QA CHECKLIST PER SCRIPT

Before approving, verify each generated script meets:

- [ ] Hook lands in ≤3s, no greeting, no soft-open
- [ ] Specific number, specific tool, specific outcome
- [ ] Founder-tone, not influencer-tone
- [ ] CTA destination + URL fits last 5 seconds
- [ ] On-screen text ≤9 words
- [ ] No "amazing / game-changer / revolutionize / unlock"
- [ ] Maps to one of the 15 angles cleanly (no mash-ups)

---

## END OF BRIEF

Generate the 15 scripts in the order listed above. Use the angle title
as the file/asset slug. Output as one markdown file per angle so each
can be edited / re-shot independently.
