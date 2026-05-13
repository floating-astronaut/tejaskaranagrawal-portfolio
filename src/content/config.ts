import { defineCollection, z } from 'astro:content';

const caseStudies = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      client: z.string(),
      industry: z.string(),
      // Headline metric shown on index cards + case page hero.
      headline: z.string(),
      // Supporting metrics (2–4 recommended).
      metrics: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .min(1)
        .max(6),
      summary: z.string(),
      services: z.array(z.string()),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      // Short tag list shown on cards + detail pages. Keep to 1–3.
      tags: z.array(z.string()).default([]),
      author: z.string().default('Glitch Executor Labs'),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      // Reading-time estimate in minutes, displayed on cards.
      readingMinutes: z.number().int().positive().optional(),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

// Shared sub-schemas reused by alternatives + vs collections.
const faqItemSchema = z.object({
  q: z.string(),
  a: z.string(),
});

const comparisonRowSchema = z.object({
  feature: z.string(),
  glitch: z.string(),
  competitor: z.string(),
});

const citationSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});

// `/alternatives/{competitor}` — "Looking for a {competitor} alternative?" pages.
// Targets bottom-funnel queries like "n8n alternative", "zapier alternative for agencies".
const alternatives = defineCollection({
  type: 'content',
  schema: z.object({
    competitor: z.string(),
    competitorUrl: z.string().url(),
    /** "{Competitor} Alternative for {Audience}" — exact-match H1. */
    title: z.string(),
    /** Short summary for index cards + meta description. */
    summary: z.string(),
    /** 50–70 word answer in first viewport (LLM extraction zone). */
    tldr: z.string(),
    /** Audience the alternative is positioned for. */
    audience: z.string().default('agencies, freelancers, indie devs'),
    /** Headline competitor pain we solve. */
    competitorPain: z.string(),
    comparison: z.array(comparisonRowSchema).min(3).max(10),
    faqs: z.array(faqItemSchema).min(3).max(10),
    citations: z.array(citationSchema).default([]),
    /** Glitch Grow product slugs most relevant to this alternative. */
    relatedProducts: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

// `/vs/{competitor}` — head-to-head Glitch Grow vs {Competitor}.
// Targets "{competitor} vs glitch grow", "glitch grow vs {competitor}".
const vs = defineCollection({
  type: 'content',
  schema: z.object({
    competitor: z.string(),
    competitorUrl: z.string().url(),
    title: z.string(),
    summary: z.string(),
    tldr: z.string(),
    /** When to pick Glitch Grow. */
    pickGlitchWhen: z.array(z.string()).min(2).max(6),
    /** When to pick the competitor. (Honesty improves citation quality.) */
    pickCompetitorWhen: z.array(z.string()).min(1).max(6),
    comparison: z.array(comparisonRowSchema).min(3).max(10),
    faqs: z.array(faqItemSchema).min(3).max(10),
    citations: z.array(citationSchema).default([]),
    relatedProducts: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

// `/glossary/{term}` — definition pages for AI-search definitional queries.
const glossary = defineCollection({
  type: 'content',
  schema: z.object({
    term: z.string(),
    title: z.string(),
    /** One-sentence definition (≤25 words). LLM-friendly. */
    definition: z.string(),
    /** 60–80 word expansion of the definition. */
    summary: z.string(),
    related: z.array(z.string()).default([]),
    citations: z.array(citationSchema).default([]),
    relatedProducts: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  'case-studies': caseStudies,
  blog,
  alternatives,
  vs,
  glossary,
};
