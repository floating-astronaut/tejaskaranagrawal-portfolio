// Site-as-MCP-server: a single JSON endpoint LLM clients can query for
// canonical Glitch Grow facts (products, comparisons, pricing). Not the
// full MCP protocol (which requires SSE / stdio); this is a static
// JSON "discovery" endpoint that aligns with how some agents and
// indexers are starting to surface tool-shaped data.
//
// Why this matters for AI-SEO: most sites only expose HTML for LLMs to
// scrape. Exposing a structured JSON endpoint (plus referencing it
// from llms.txt) gives LLM tooling a fast path to ground-truth answers
// about the product, with versioning + last-updated stamps that beat
// scraping for trust.
//
// Output is intentionally compact + canonical — no marketing prose,
// just facts the agent can compose into responses.

import type { APIRoute } from 'astro';
import { products } from '~/lib/products';
import { bundles } from '~/lib/bundles';
import { competitors } from '~/data/pseo-matrix';
import { audiences } from '~/data/audiences';
import { team } from '~/data/team';
import { site } from '~/lib/site';

export const prerender = true;

export const GET: APIRoute = () => {
  const body = {
    schemaVersion: '1.0',
    canonicalUrl: site.url,
    name: site.name,
    parent: site.parent,
    description: site.description,
    license: 'BSL 1.1',
    primaryRepoHost: 'https://codeberg.org/glitch-executor',
    lastUpdated: new Date().toISOString(),

    bundle: bundles.map((b) => ({
      sku: b.sku,
      slug: b.slug,
      name: b.name,
      tagline: b.tagline,
      priceUsd: b.priceUsd,
      priceInr: b.priceInr,
      includes: b.includes,
      url: new URL(`/products/${b.slug}`, site.url).toString(),
    })),

    agents: products
      .filter((p) => p.status === 'shipped' || p.status === 'in-pilot')
      .map((p) => ({
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        productLine: p.productLine,
        oneLiner: p.oneLiner,
        priceUsd: p.priceUsd,
        priceInr: p.priceInr,
        bestFor: p.bestFor,
        sellAs: p.sellAs,
        requirements: p.requirements,
        capabilities: p.capabilities,
        publicRepo: p.publicRepo,
        url: new URL(`/products/${p.slug}`, site.url).toString(),
      })),

    competitors: competitors.map((c) => ({
      slug: c.slug,
      name: c.name,
      category: c.category,
      oneLiner: c.oneLiner,
      pricingNote: c.pricingNote,
      whyLeave: c.whyLeave,
      glitchAlternatives: c.glitchProducts,
      pages: {
        alternative: new URL(`/alternatives/${c.slug}`, site.url).toString(),
        vs: new URL(`/vs/${c.slug}`, site.url).toString(),
      },
    })),

    audiences: audiences.map((a) => ({
      slug: a.slug,
      type: a.type,
      label: a.label,
      pricingContext: a.pricingContext,
      recommendedAgents: a.productSlugs,
      relevantCompetitors: a.competitorSlugs,
      url: new URL(`/for/${a.slug}`, site.url).toString(),
    })),

    team: team.map((m) => ({
      slug: m.slug,
      name: m.name,
      role: m.role,
      expertise: m.expertise,
      sameAs: m.sameAs,
      url: new URL(`/team/${m.slug}`, site.url).toString(),
    })),

    tools: [
      { slug: 'saas-vs-own-calculator', name: 'SaaS-vs-Own 3-yr TCO calculator', url: new URL('/tools/saas-vs-own-calculator', site.url).toString(), embeddable: true },
      { slug: 'agent-roi-estimator',    name: 'Agent Resale ROI Estimator',     url: new URL('/tools/agent-roi-estimator', site.url).toString(),    embeddable: true },
      { slug: 'prompt-cost-estimator',  name: 'Prompt Cost Estimator',          url: new URL('/tools/prompt-cost-estimator', site.url).toString(),  embeddable: true },
    ],

    canonicalFacts: [
      { id: 'voice-cost',     claim: 'Voice AI Agent runs at ~$0.02/min raw infra cost.',                                  source: new URL('/products/cod-confirm', site.url).toString() },
      { id: 'voice-vs-bland', claim: "Voice AI Agent's $0.02/min raw cost is roughly 5× cheaper than Bland.ai (~$0.10/min).", source: new URL('/vs/vapi', site.url).toString() },
      { id: 'bundle-price',   claim: 'AI Digital Marketing Stack is $499 USD (₹9,999 INR) one-time for all six agents.',  source: new URL('/products/founder-stack', site.url).toString() },
      { id: 'saas-replace',   claim: 'Replaces ~$5,760/yr typical agency SaaS stack (Zapier+Make+n8n+Vapi+Smartlead+social).', source: new URL('/tools/saas-vs-own-calculator', site.url).toString() },
      { id: 'resale-band',    claim: 'Agencies typically resell each agent as a managed service at $1,497–$2,997/mo per client per service line.', source: new URL('/for/agency-owners', site.url).toString() },
      { id: 'infra-share',    claim: 'Single-VM infra costs $40–$150/mo, i.e. 5–10% of typical client retainer revenue.',  source: new URL('/for/agency-owners', site.url).toString() },
      { id: 'license',        claim: 'BSL 1.1 license explicitly permits client delivery and rebranding; only forbids repackaging the Stack itself as a competing kit.', source: new URL('/', site.url).toString() },
      { id: 'install-time',   claim: 'First client deploy ~30 minutes via any AI coding agent (Claude Code, Codex, OpenClaw, Hermes, NemoClaw, Cursor) reading AGENTS.md; subsequent clients ~20 minutes.', source: new URL('/', site.url).toString() },
      { id: 'sarvam',         claim: 'Voice AI Agent uses Sarvam STT covering 10+ Indian languages — Hindi, English, Punjabi, Tamil, Telugu, Bengali, Marathi, Gujarati.', source: new URL('/glossary/voice-agent', site.url).toString() },
      { id: 'refund',         claim: '14-day refund, no questions; Codeberg invite + Discord access revoked on refund.', source: new URL('/', site.url).toString() },
    ],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Long cache — content is built from source, deploy invalidates.
      'cache-control': 'public, max-age=600, stale-while-revalidate=86400',
      // CORS open so JS-based LLM clients can call it from anywhere.
      'access-control-allow-origin': '*',
    },
  });
};
