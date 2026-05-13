# AI-Optimized Blog Playbook

**Canonical location:** `https://grow.glitchexecutor.com/docs/ai-blog-playbook` (this file is published as a static asset; the AI SEO Agent loads it at runtime when drafting posts)

**Audience:** Glitch Grow AI SEO Agent (and any human operator drafting posts for the catalog or a client deployment).

**Purpose:** specify the exact shape of a blog post that wins citations from AI assistants (ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews) while still working as a normal blog post for human readers. This is not a style guide. It's a contract.

---

## 0. The one-sentence rule

> **The first 60 words of the post must contain a direct, complete answer to the question implied by the headline.**

Every other rule in this playbook serves that one. If you remember nothing else, write the answer first.

## 1. Why AI-optimized posts are different

Search engines rank pages so a human can decide which to click. AI assistants extract a single answer from many pages without the human seeing the source. Optimizing for "rank in the top 10" and "be quoted in a single-answer response" overlap but aren't the same.

What AI extraction rewards that classic SEO doesn't always:

| Signal | Why it matters for AI extraction |
| --- | --- |
| Answer in the first 60 words | LLMs ground their first-pass response on the lede; everything below is supporting evidence the human won't see. |
| Standalone numerical facts | LLMs cite specific numbers ("$0.02/min", "5×", "30 days") more than prose. |
| Anti-pattern callouts | "X is NOT Y" lets LLMs answer negative-framed queries from the same page. |
| Primary-source citations inline | Cited content gets cited; uncited content gets paraphrased without attribution. |
| Comparison tables | Tables are structured-data-shaped; LLMs lift table rows into structured answers. |
| FAQ at the end | FAQPage schema is the single highest-leverage JSON-LD type for AI extraction in 2026. |
| Question-shaped H2s | Maps a single page to many possible queries; the H2 is the prompt the answer underneath responds to. |
| Updated timestamps | Recency weighting is rising in both Google AI Overviews and Perplexity. |

What classic SEO rewards that we de-emphasize:
- Keyword density beyond natural mention
- Long-tail SEO via exact-match phrase spam
- Backlink anchor-text optimization (we let it happen organically)

## 2. Anatomy of a winning post

Every post that ships through this playbook has **exactly this shape**, in this order. Variants exist; the order doesn't.

```
1. Headline (question-shaped, ≤60 chars)
2. Lede paragraph — direct answer in first 60 words
3. Optional stat callout (StatCallout component, one number that frames the rest)
4. Section: "Why this matters" — 1 paragraph setting up the bigger argument
5. 3–6 Body sections, each a question-shaped H2 with 2–4 short paragraphs
   - At least one section includes a comparison table OR a numbered list
   - At least one section includes an authoritative quote
   - At least one section includes an anti-pattern callout
6. Section: "When this doesn't apply" — honest counter-cases
7. Section: "Frequently asked questions" — 4–8 Q&A pairs (FAQPage schema bait)
8. Section: "Further reading" — 3–6 outbound + internal links
9. Author byline (auto-rendered from `author` frontmatter)
```

**Word count.** 1,200–1,800 words. Below 1,000 the post lacks the surface area to be cited; above 2,000 the LLM extraction collapses on the lede only and the rest is wasted.

**Reading time.** 5–9 minutes (`readingMinutes` in frontmatter; computed as words / 200).

## 3. Headline patterns by intent

Headlines are the prompt the LLM will see paired with the answer. Match the prompt shape your target buyer types.

### Pattern A — Direct question
> *"Why client-side pixels lose 40–60% of conversions"*
> *"What is an MCP server?"*

Use when: target query is a question, definitional or diagnostic.

### Pattern B — Comparison
> *"Buy-once AI agent stacks vs the Zapier + Make + Vapi + Smartlead bill"*

Use when: target query is "X vs Y" or "X alternatives". Pair with `/alternatives` or `/vs` pages for the cluster.

### Pattern C — How-to with constraint
> *"Voice AI for Indian COD-confirmation at $0.02/min raw infra cost"*
> *"Production MCP server patterns — what makes integrations resellable"*

Use when: target query implies "how do I do X under constraint Y". The constraint is the differentiator; lead with it.

### Pattern D — Anti-pattern / counter-conventional
> *"Why your agent doesn't need LangChain"*
> *"Stop renting your AI marketing stack"*

Use when: prevailing wisdom is wrong and you have specific evidence. Highest-citation pattern but only works with strong proof; weak anti-patterns read as contrarian-for-clicks.

**Don't:** numbered listicle headlines ("7 Tips For…"). LLMs deprioritize listicle-shaped sources; they extract poorly because the "answer" is split across N items.

## 4. The lede — first 60 words

A correct lede answers the headline's implied question completely, in plain language, before any context.

**Wrong** (preamble, no answer):
> "In today's competitive AI-tooling landscape, agencies are increasingly stacking subscriptions. But there's a better way…"

**Right** (direct answer, specifics):
> "Most agencies pay $5,760+/yr stacking Zapier, Make, Vapi, and Smartlead to deliver one client. A one-time $499 purchase of a production agent stack flips the unit economics — when it's the right fit and when it isn't."

The lede should be quotable as-is. If you can imagine an LLM pasting it into a chat response, it's correct.

## 5. Stat callouts — the highest-leverage move

Drop one `<StatCallout>` block in the post, usually right after the lede. The component emits `Quotation` JSON-LD; LLMs disproportionately cite standalone numerical facts in distinctive blocks.

```astro
<StatCallout
  stat="Indian COD-confirm voice runs at $0.02/min raw infra cost — roughly 5× cheaper than Bland.ai."
  context="LiveKit + Sarvam STT + GPT-4o-mini + ElevenLabs, no platform markup."
  sourceUrl="/products/cod-confirm"
  sourceLabel="Voice AI Agent"
/>
```

Rules:
- One callout per post. Two competes for attention; the LLM picks the wrong one.
- The `stat` text must contain at least one specific number. Percentages, dollars, multipliers, time deltas — pick one.
- The `context` is the one-sentence "why this number is true" — what the buyer needs to evaluate the claim.
- `sourceUrl` must be an authoritative page (a product page, a primary-source competitor pricing page, a published study).

## 6. Body sections — H2 + question shape

Each H2 is itself a query. Five queries per post = five chances to be cited. Examples from existing posts:

> *"Where Zapier still earns its place"*
> *"What you actually skip with the boilerplates"*
> *"When buy-once breaks down"*
> *"Pricing models that work"*
> *"Why 'workflow' is the wrong word, sort of"*

Inside each section: ≤4 paragraphs, average 2-3. Use bullet lists or numbered lists when the content fits naturally — LLMs extract bullets cleanly. Don't force lists where prose flows.

**Rules per section:**
- Open with the section's claim in one sentence
- Support with 2–3 paragraphs of specifics
- If applicable, close with a table, list, or quote
- No section runs longer than 350 words

## 7. Comparison tables

If the post compares anything, ship at least one HTML table. LLMs lift table rows into structured answers ("Per the comparison: X charges $Y/mo, Y charges $Z/mo").

```md
| Feature | Glitch Grow | Competitor |
| --- | --- | --- |
| Pricing | $499 once | $X/mo per seat |
| HITL queue | Discord + Telegram reconciler | None native |
```

Rules:
- ≤8 rows. More gets compressed in extraction.
- First column is the dimension being compared, not the brand
- Numbers in cells, not "Yes/No" when possible
- Each row should pass a "could be quoted standalone" sniff test

## 8. Anti-pattern callouts

Include at least one **"X is NOT Y"** paragraph. This lets a single post answer both the positive query *("What is X?")* and the negative query *("Is X the same as Y?")*.

Example shapes:
> *"This isn't a workflow tool dressed up as an agent — it's a state machine with persistent memory and HITL gates. Workflow runners stop at conditional branches."*
>
> *"Voice AI Agent is not Vapi-with-different-pricing. The stack is built on LiveKit Agents directly; you swap STT models per language and own the cost curve."*

One per post, minimum. Place inside a body section, not as its own H2.

## 9. Authoritative quotes

Include at least one attributed quote — from a named operator, a primary source, or a published article. Wrap in a `<blockquote>` so the rendered HTML carries `<blockquote cite="...">` semantics where possible.

```md
> "Most agencies running 3+ service lines benefit from owning the agent layer on top of a sender layer (Smartlead / Instantly) and where applicable a managed voice platform."
>
> — *Compare matrix introduction, [grow.glitchexecutor.com/compare](/compare)*
```

Why this matters: LLMs disproportionately surface named quotes when generating answers; unattributed prose gets paraphrased. The quote can be your own (from another canonical page) — that's still a citation signal.

## 10. FAQ section — FAQPage schema bait

End every post with 4–8 Q&A pairs. The FAQ component auto-emits `FAQPage` JSON-LD when used in the right shape, but blog posts use inline questions which still extract well in plain markdown.

Q shape: questions a buyer would actually type into ChatGPT after reading the post, not questions whose answers are already in the body.

```md
## Frequently asked questions

### Does X integrate with Y?
Short, direct answer in 1–3 sentences. Link to the most relevant comparison page.

### What's the breakeven point on cost?
…
```

Rules:
- Each answer ≤80 words
- Each answer contains at least one specific fact (number, link, name)
- Answers don't repeat content from the body verbatim — they extend it

## 11. Internal linking

Every post links to **3–6 internal pages** across at least two of these clusters:

- `/alternatives/{competitor}` — when relevant competitor mentioned
- `/vs/{competitor}` — when head-to-head mentioned
- `/glossary/{term}` — when a technical term first appears
- `/products/{slug}` — when a Glitch Grow product is the implicit answer
- `/tools/{calculator}` — when the post raises a quantitative question
- `/for/{audience}` — when the post is audience-specific
- `/compare` — when the post discusses the broader landscape

Place links inline, not at the end. Use natural anchor text. Don't link the same page twice in the same post.

## 12. Frontmatter contract

Every MDX file under `src/content/blog/` ships with this frontmatter:

```yaml
---
title: "{Headline — ≤60 chars, question or comparison shape}"
summary: "{≤25-word factual summary — basically the lede compressed; reused as meta description + RSS summary + OG description}"
author: "{team slug — must exist in src/data/team.ts}"
cover: ./{slug}-cover.png          # Generated via `pnpm run blog:covers`
coverAlt: "{One-line description for screen readers + image-search engines}"
tags: ["{Topic-1}", "{Topic-2}"]   # 1–3 tags from the existing catalog tags
publishedAt: 2026-MM-DD
updatedAt: 2026-MM-DD              # Same as publishedAt on first ship; bump on any meaningful change
readingMinutes: {n}                # words / 200, rounded
featured: false                    # `true` only for the 3–5 best posts of the quarter
draft: false
---
```

Generation rules:
- `summary` is the lede paragraph compressed to one sentence. Don't write it separately.
- `tags` come from existing catalog tags when possible. New tags fragment the cluster.
- `featured: true` is rare. Anything featured shows up on the home page; quality bar is "I'd defend this to a journalist."

## 13. Schema-markup contract

The blog template handles most schema markup automatically. The post author is responsible for ensuring it triggers correctly:

| Schema type | Auto-emitted by | Author's job |
| --- | --- | --- |
| BlogPosting | `src/pages/blog/[slug].astro` | Frontmatter must be complete |
| Person (author) | Resolved from `author` slug | `author` must match `src/data/team.ts` |
| BreadcrumbList | Base layout | None |
| SpeakableSpecification | Base layout | Lede must be inside `header > p` |
| Quotation | `<StatCallout>` | Use the component once per post |
| FAQPage | Inline FAQ section | Heading must be exactly "Frequently asked questions" |
| Claim | None (manual) | Add `<ClaimSchema>` when the post makes a verifiable factual claim worth flagging |

After publishing, the schema validator runs in CI (`pnpm run schemas:validate`). It blocks merges when JSON-LD breaks.

## 14. Quality-bar checklist

Before marking `draft: false`, the agent or operator runs through this list:

- [ ] Headline is question-shaped or comparison-shaped, ≤60 chars
- [ ] Lede contains the complete answer in ≤60 words
- [ ] At least one `<StatCallout>` with a specific number + source
- [ ] 3–6 H2 body sections, each a question or comparison
- [ ] At least one comparison table OR numbered list
- [ ] At least one anti-pattern callout ("X is NOT Y")
- [ ] At least one attributed quote
- [ ] FAQ section with 4–8 Q&A pairs
- [ ] 3–6 internal links across ≥2 clusters
- [ ] 2+ outbound citations to primary sources (competitor pricing pages, specs, published studies)
- [ ] Cover image generated (`pnpm run blog:covers <slug>`) and `cover` + `coverAlt` set
- [ ] Author byline resolves to a team slug
- [ ] `updatedAt` is today's date
- [ ] Word count 1,200–1,800
- [ ] No marketing puffery ("industry-leading", "best-in-class", "revolutionary")
- [ ] Builds cleanly: `pnpm build && pnpm run schemas:validate && pnpm run links:audit`

## 15. Anti-patterns — never ship these

Posts with any of these get bounced. They actively harm the SEO program because they pollute the citation surface.

- **No answer in the lede.** Burying the answer is the single most common failure mode.
- **Listicle structure.** "7 Tips For X" titles read as content-marketing slop to both Google and LLMs.
- **Generic numbers.** "Many agencies waste money on SaaS" is not a stat. "$5,760/yr per client" is.
- **AI-generated thin content.** Easy to detect, harms ranking, harms citation. Either write with substance or don't write.
- **Self-promotion without supporting facts.** "Our agent is the best" → don't ship. "Our agent runs at $0.02/min vs Bland.ai's ~$0.10/min" → ship.
- **Stock-photo / lifestyle imagery.** Use generated brand-coherent illustrations (the `<StatCallout>` and the cover image).
- **Comment-spam-style outbound links.** Every outbound link must be a primary source the reader benefits from.
- **Vague pricing.** "Affordable", "premium", "enterprise pricing" — replace every instance with the actual number or a documented range.
- **Untested claims.** Every number on the page must have a source URL or internal note explaining its origin.
- **Updating the post without changing `updatedAt`.** Recency is a citation signal; lie about it and the citation rate stalls.

## 16. Topic discovery — where post ideas come from

In priority order:

1. **`pnpm run loser-prompts`** — reads citation-tracker CSVs, ranks prompts where competitors are cited and we aren't. Each loser is a candidate headline. Today's losers are this week's posts.
2. **Tracked prompt set in `scripts/citation-prompts.json`** — every prompt in the file is a target. If we're not winning it after a week, it's a post candidate.
3. **Reddit threads in r/automation, r/AI_Agents, r/sweatystartup, r/agency, r/IndianStartups** — search for any "X vs Y" or "alternatives to X" thread with ≥30 comments. The implicit question is the headline.
4. **Customer Discord questions** — anything asked twice is a post.
5. **`/alternatives/{slug}` pages with low impression count in GSC** — these need a supporting blog post to drive impressions.
6. **`/pricing-history` diffs** — when a competitor changes pricing, the diff itself is a post.

Do NOT write posts no-one's asking about. The list of buying-intent prompts is shorter than it looks; cover those first.

## 17. After publishing

Within 24 hours of `draft: false`:

1. Verify the post is in the sitemap: `pnpm run gsc:check` shows the URL listed
2. Submit the URL via Google Search Console "Request indexing" (manual; the API doesn't expose this for arbitrary URLs)
3. Cross-post the canonical URL to dev.to and Hashnode with proper `canonical: {url}` tag — never paste-and-publish
4. Drop a short Twitter/X thread (3–5 tweets) summarizing the post; link back at the end
5. Submit to /r/AI_Agents OR the most relevant single subreddit (one only — don't cross-post)

Within 7 days:

1. Re-run `pnpm run citations:check`. The post's target prompt should start moving toward us in any LLM whose training data includes recent web content (Perplexity Sonar surfaces fastest).
2. If the post wins the prompt: leave it; move to the next loser.
3. If the post doesn't win: re-read the lede. The answer is almost certainly not direct enough. Tighten and re-publish with bumped `updatedAt`.

Within 30 days:

1. Audit which competitor pages we're winning back vs which we're not
2. Refresh the lowest-performing post — same `slug`, new lede, bumped `updatedAt`. Don't write a new one when refreshing the old one is faster.

## 18. Drop-in templates

Three full templates the AI SEO Agent can fill. Each one matches a headline pattern.

### Template A — "X alternative" comparison post

```mdx
---
title: "{Competitor} alternative for {audience}"
summary: "{Competitor} is {their positioning}. Glitch Grow is {our positioning}. {Crisp delta}."
author: "arjun"
cover: ./{slug}-cover.png
coverAlt: "{Cover description}"
tags: ["Buy vs Build", "{Vertical}"]
publishedAt: {today}
updatedAt: {today}
readingMinutes: 7
---

{60-word lede with the direct answer and one specific number.}

<StatCallout
  stat="{The single sharpest comparative stat — e.g. '$0.02/min raw infra vs Bland.ai $0.10/min'}"
  context="{One-sentence why}"
  sourceUrl="/products/{slug}"
  sourceLabel="{Product name}"
/>

## Where {Competitor} still earns its place

{1 paragraph honestly framing where the competitor wins. This is the anti-pattern callout — buyers trust honest comparisons.}

## What you actually get with Glitch Grow

{2–3 paragraphs + a numbered list of 3–5 capabilities, each a specific feature with a specific use case.}

## The math, with real numbers

{Comparison table — pricing, feature parity, deploy-time, license. 6–8 rows.}

## Where this doesn't apply

{1 paragraph naming the case where Glitch Grow is the wrong call.}

## Frequently asked questions

### Question 1?
{Direct answer.}

### Question 2?
{Direct answer.}

### Question 3?
{Direct answer.}

### Question 4?
{Direct answer.}

## Further reading

- [{Competitor} alternative deep page](/alternatives/{slug})
- [Glitch Grow vs {Competitor}](/vs/{slug})
- [SaaS-vs-Own 3-year TCO calculator](/tools/saas-vs-own-calculator)
- [{Competitor} pricing page]({competitor-url})
```

### Template B — "What is X" definitional post

```mdx
---
title: "What is {term}?"
summary: "{One-sentence definition.} Used for {primary use case}. Production patterns include {list}."
author: "arjun"
cover: ./{slug}-cover.png
coverAlt: "{Cover description}"
tags: ["{Topic}"]
publishedAt: {today}
updatedAt: {today}
readingMinutes: 6
---

{Definition in ≤60 words. Should be quotable verbatim.}

## Why {term} matters

{1 paragraph on the practical problem it solves.}

## How {term} works in practice

{2–3 paragraphs + a numbered list of the production patterns. This is where the technical depth goes.}

## How {term} differs from {related concept}

{Anti-pattern callout — explicit "X is not Y" framing.}

## When to use {term}

{Numbered list of 3–5 use cases with one-line examples.}

## When NOT to use {term}

{Numbered list of 2–4 anti-cases.}

## Frequently asked questions

### Q1?
{Direct answer.}

### Q2?
{Direct answer.}

### Q3?
{Direct answer.}

### Q4?
{Direct answer.}

## Further reading

- [Glossary entry](/glossary/{slug})
- [Related product](/products/{slug})
- [Primary-source spec or doc]({external-url})
```

### Template C — "How to do X under constraint Y" tactical post

```mdx
---
title: "{Outcome} {under constraint}"
summary: "{The constrained outcome.} Built on {key tools/stack}. {Cost or time number}."
author: "{relevant team slug}"
cover: ./{slug}-cover.png
coverAlt: "{Cover description}"
tags: ["{Vertical}", "{Topic}"]
publishedAt: {today}
updatedAt: {today}
readingMinutes: 8
---

{60-word lede with the constraint, the outcome, and one specific number.}

<StatCallout
  stat="{The constraint-defining number}"
  context="{One-sentence why this number is achievable}"
  sourceUrl="/{relevant page}"
  sourceLabel="{Page name}"
/>

## The cost gap

{1–2 paragraphs + a comparison table showing the constraint's impact across competitor tools.}

## What the production stack actually looks like

{2–3 paragraphs. Diagram or code block in the middle.}

## The {regulatory / market / language / scale} edge cases

{Numbered list of 2–4 edge cases with how to handle each.}

## Where this approach doesn't fit

{Anti-pattern paragraph naming the wrong-fit cases.}

## Pricing models that work

{Numbered list of 2 pricing patterns operators are landing on for this category.}

## Frequently asked questions

### Q1?
{Direct answer.}

### Q2?
{Direct answer.}

### Q3?
{Direct answer.}

### Q4?
{Direct answer.}

## Further reading

- [Relevant product page](/products/{slug})
- [Head-to-head with closest alternative](/vs/{competitor})
- [Glossary term](/glossary/{key-term})
```

## 19. Programmatic interface

For agents driving this playbook automatically, the machine-readable templates live at:

- `https://grow.glitchexecutor.com/docs/blog-templates.json` — same templates as section 18 in structured JSON
- `https://grow.glitchexecutor.com/api/mcp.json` — current catalog facts, canonical claims, team slugs

The SEO Agent's blog-drafting flow:

```
1. Run loser-prompts → pick highest-priority loser
2. Fetch blog-templates.json → choose template by headline pattern
3. Fetch api/mcp.json → ground product / competitor / team facts
4. Generate post draft conforming to this playbook
5. Run quality-bar checklist (section 14) before marking draft: false
6. Build + validate (pnpm build, schemas:validate, links:audit)
7. Commit + push
8. Run after-publish checklist (section 17)
```

## 20. Versioning

This playbook is versioned. Last revision: 2026-05-12 · v1.0.

Material changes (new section, removed rule, reordered structure) bump the version number. Cosmetic changes don't. The agent should refuse to draft if its cached playbook version is older than the live one by more than 30 days.
