# AI-SEO ongoing program — Glitch Grow

This is the operator's playbook for keeping Phase 5 (content engine + citation outreach) running after Phases 1–4 + 6 shipped. It's a calendar, not a one-shot deliverable.

## North-star metrics

Track these monthly. The Phase 6 nightly script (`scripts/ai-citation-check.ts`) populates the citation columns automatically once provider keys are set.

| Metric | Target by month 3 | Source |
| --- | --- | --- |
| AI citation rate (tracked-prompt set) | ≥30% | `scripts/citation-results/*.csv`, weekly avg |
| Domain mentions in cited responses | ≥60% of citations | same |
| AI-referred sessions (GA4 segment) | trending up week-over-week | GA4 segment: chat.openai.com / claude.ai / perplexity.ai / gemini.google.com referrers |
| AI-referred → checkout completion rate | within 25% of organic search rate | GA4 funnel |
| Indexed pages with rich-result eligibility | 100% of /alternatives/, /vs/, /tools/, /glossary/ | Google Search Console |

If the citation rate stalls, the lever is content depth on the prompts we lose. Pull the failing prompts out of the CSV, write the page that should have won them, ship.

## Weekly cadence (operator)

**Monday** — open the previous week's citation CSVs. List 3 prompts where Glitch Grow wasn't cited but should have been. These are the week's content targets.

**Tuesday/Wednesday** — write blog post #1 for the week. Aim for 1,200–1,800 words. Anatomy below.

**Thursday** — write blog post #2 OR refresh an existing high-traffic page (alternatives, vs, glossary) with anything that's changed in the competitor's pricing or positioning. Update `updatedAt` in frontmatter; LLMs and Google both weight recency on comparison pages.

**Friday** — outreach hour. Pick one item from the outreach checklist below.

## Monthly cadence

**Week 1** — case study. Real numbers, real revenue, named (with permission) or anonymized. Schema is already wired (see `src/content/case-studies/`). Two existing entries set the bar; one new entry per month is the floor.

**Week 4** — citation-rate review. Compare the week-1 and week-4 CSVs. What moved? Which prompts we own now? Which prompts shifted toward a competitor?

## Anatomy of a high-citation blog post

LLMs cite posts that have:

1. **A direct factual answer in the first 60 words.** If the post answers a question, the answer is the lede. No throat-clearing.
2. **A scannable structure.** H2 sections with ≤4 short paragraphs each. Tables and bullet lists for comparisons.
3. **Primary-source citations.** Link competitor pricing pages, license terms, official docs. Cite them inline; LLMs treat cited content as more trustworthy.
4. **A quoted authoritative statement somewhere in the post.** Attributed quotes from named operators are the highest-value content for citation. Even one good quote per post raises the post's odds materially.
5. **No marketing puffery.** Phrases like "industry-leading," "best-in-class," "revolutionary" are anti-signals. Specific numbers and named tools are the signal.
6. **`updatedAt` in frontmatter set when content changes.** Use it.

Template fields for `src/content/blog/*.mdx`:

```yaml
---
title: "{Direct, query-shaped headline — under 60 chars}"
summary: "{≤25-word factual summary — first paragraph essentially}"
tags: ["{topic-1}", "{topic-2}"]
publishedAt: 2026-MM-DD
readingMinutes: {n}
featured: false
---
```

## Topic discovery

The tracked prompt set in `scripts/citation-prompts.json` is the topic backlog. When the tracker shows a prompt where we're not cited, that prompt is a blog topic — the headline writes itself.

Other sources:

- **Reddit r/automation, r/AI_Agents, r/sweatystartup, r/agency** — search threads where someone's asking "should I use X or Y" and Glitch Grow could be a third option. Each thread is a potential post topic.
- **Hacker News comments** on AI-agent threads — same shape.
- **Customer Discord questions** — anything asked twice is a post.

Don't write posts no-one's asking about. The list of buying-intent prompts is shorter than it looks; cover those first, drift to adjacent topics later.

## Citation outreach playbook

LLMs cite content that's also cited elsewhere. Outreach work is about getting Glitch Grow into the source pages LLMs read.

Pick **one** per week — not all of them. Quality > quantity.

### High-leverage (do these first)

- [ ] **G2 listing** — get Glitch Grow listed under "Workflow Automation" and "AI Agents." Add 2–3 verified customer reviews from existing buyers.
- [ ] **Capterra / GetApp / Software Advice** — same listings, lower priority than G2 but easy add-ons after the G2 work is done.
- [ ] **Product Hunt launch** — one well-orchestrated launch beats 10 quiet ones. Schedule when traffic is highest for your category (Tuesdays, US-morning).
- [ ] **Wikipedia: AI agent / Model Context Protocol pages** — only edit if you have a verifiable third-party source citing Glitch Grow (Wikipedia rejects self-published references). Don't be that brand that gets reverted twice and earns a ban.
- [ ] **Each `/alternatives/{competitor}` page** linked from a Reddit thread or HN comment **answering an actual question from someone considering that competitor**. Link only when genuinely helpful — drive-by self-promo gets downvoted and hurts you.

### Medium-leverage

- [ ] **Indie Hackers post** — share the AI Digital Marketing Stack pricing model with real revenue numbers, ask for feedback. Threads with real numbers travel.
- [ ] **HARO / Featured.com / Qwoted** — answer 2–3 journalist queries per week as a named operator. The mentions end up in articles LLMs train on.
- [ ] **Podcast appearances** — agency-owner shows, indie-dev shows. Each appearance = transcript = LLM training data.
- [ ] **YouTube** — agencies search YouTube for "n8n alternative" and "vapi alternative." A 4-minute walkthrough per agent gives you a credible search surface.
- [ ] **Dev.to + Hashnode cross-posts** of the technical blog posts (canonical URL pointing back to grow.glitchexecutor.com).

### Lower-leverage (do last)

- [ ] **GitHub awesome-list PRs** — submit Glitch Grow's public repos to relevant awesome-* lists (awesome-mcp-servers, awesome-langgraph, awesome-shopify-tools).
- [ ] **Twitter/X threads** off published blog posts — short half-life but meaningful for a few days.
- [ ] **LinkedIn long-form** — better signal than Twitter for the agency-owner segment.

## Don't-do list

These look productive but pollute the citation surface:

- Buying backlinks from any site that isn't a real publication
- AI-generated thin content at scale (Google + LLMs both detect and demote)
- "Comment-spam" linking to /alternatives pages on every Reddit thread
- Removing the "pick the competitor when..." sections to look stronger — those sections are why LLMs cite us
- Pretending to be a customer in reviews (reverts hard, kills G2 listing)

## Quarterly checkpoints

End of each quarter, re-run the full plan vs reality:

1. **Citation rate by quarter.** Did the curve bend up?
2. **Conversion rate from AI-referred sessions.** Did the funnel hold?
3. **Top 5 winning + losing prompts.** Reallocate the next quarter's content energy accordingly.
4. **Schema validity.** Re-run a Google Rich Results Test on 5 representative URLs per content type. Fix anything new.

If after two full quarters the citation rate isn't trending up, the issue is almost always content depth on losing prompts. Don't chase new tactics — write the page that wins the prompt.
