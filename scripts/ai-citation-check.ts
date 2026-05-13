#!/usr/bin/env -S node --experimental-strip-types
/**
 * AI-citation tracker for grow.glitchexecutor.com.
 *
 * For each tracked prompt in scripts/citation-prompts.json, this script
 * queries enabled providers (Anthropic Claude, OpenAI, Perplexity), checks
 * whether the response cites Glitch Grow (by brand name or domain), and
 * records which competitors were mentioned. Output is a CSV in
 * scripts/citation-results/<YYYY-MM-DD>.csv plus a brief summary printed
 * to stdout.
 *
 * Designed to run as a nightly GitHub Actions cron. Each provider is
 * gated by its API key — set ANTHROPIC_API_KEY / OPENAI_API_KEY /
 * PERPLEXITY_API_KEY in env and only those providers will be queried.
 *
 * No external dependencies — pure Node 20+ fetch.
 *
 * Usage:
 *   pnpm run citations:check          # run with whatever keys are set
 *   pnpm run citations:check --quick  # only first 5 prompts (smoke test)
 *
 * Output schema (CSV columns):
 *   date,provider,model,prompt,cited,citedDomain,competitorsMentioned,responseLen,error
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_PATH = path.join(__dirname, 'citation-prompts.json');
const RESULTS_DIR = path.join(__dirname, 'citation-results');

interface Config {
  trackedBrand: string;
  trackedDomain: string;
  trackedAliases: string[];
  competitors: string[];
  prompts: string[];
}

interface Row {
  date: string;
  provider: string;
  model: string;
  prompt: string;
  cited: boolean;
  citedDomain: boolean;
  competitorsMentioned: string[];
  responseLen: number;
  error: string;
}

const QUICK = process.argv.includes('--quick');

function readConfig(): Config {
  const raw = fs.readFileSync(PROMPTS_PATH, 'utf8');
  return JSON.parse(raw);
}

function brandRegex(brand: string, aliases: string[]): RegExp {
  const all = [brand, ...aliases].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${all.join('|')})\\b`, 'i');
}

function competitorsIn(text: string, competitors: string[]): string[] {
  const found = new Set<string>();
  for (const c of competitors) {
    const re = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(text)) found.add(c);
  }
  return Array.from(found).sort();
}

// --- Provider adapters --------------------------------------------------

async function callAnthropic(prompt: string): Promise<{ model: string; text: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json() as { content: Array<{ type: string; text?: string }> };
  const text = data.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
  return { model, text };
}

async function callOpenAI(prompt: string): Promise<{ model: string; text: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content ?? '';
  return { model, text };
}

async function callPerplexity(prompt: string): Promise<{ model: string; text: string }> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY not set');
  // Perplexity's models include search-augmented variants — those are the
  // interesting ones for citation tracking since they reflect what the web
  // says right now, not just trained-in knowledge.
  const model = process.env.PERPLEXITY_MODEL ?? 'sonar';
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`perplexity ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content ?? '';
  return { model, text };
}

// OpenRouter — single key gives access to dozens of models including
// free-tier ones (suffix `:free`). We fan out across a curated list of
// free models per run so a single API key produces multi-model coverage.
//
// Override the model list with OPENROUTER_MODELS=comma,separated,list.
// Free-tier rate limits: 20 req/min, 50/day (or 1000/day with $10+ in
// credits). 25 prompts × 4 models = 100 req per full run.
// Curated free-tier models on OpenRouter as of 2026-05. List drifts —
// query https://openrouter.ai/api/v1/models and filter `:free` for fresh
// candidates if you start seeing 404s. Diversity here matters: mixing
// Qwen, GLM, Gemma, and an OpenAI open-weight gives us 4 distinct
// training distributions to track citations across.
const DEFAULT_OPENROUTER_FREE_MODELS = [
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-120b:free',
];

function openRouterModels(): string[] {
  const raw = process.env.OPENROUTER_MODELS;
  if (raw) return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return DEFAULT_OPENROUTER_FREE_MODELS;
}

async function callOpenRouter(prompt: string, model: string): Promise<{ model: string; text: string }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${key}`,
      'content-type': 'application/json',
      // Optional but recommended by OpenRouter — surface the source app.
      'HTTP-Referer': 'https://grow.glitchexecutor.com',
      'X-Title': 'Glitch Grow Citation Tracker',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? '';
  return { model, text };
}

// A "query" is a single (provider, model) pair the runner will execute
// for each prompt. Direct providers contribute one query; OpenRouter
// contributes one query per configured free model.
interface Query {
  name: string;
  call: (prompt: string) => Promise<{ model: string; text: string }>;
}

function buildQueries(): Query[] {
  const queries: Query[] = [];
  if (process.env.ANTHROPIC_API_KEY)  queries.push({ name: 'anthropic',  call: callAnthropic });
  if (process.env.OPENAI_API_KEY)     queries.push({ name: 'openai',     call: callOpenAI });
  if (process.env.PERPLEXITY_API_KEY) queries.push({ name: 'perplexity', call: callPerplexity });
  if (process.env.OPENROUTER_API_KEY) {
    for (const model of openRouterModels()) {
      // Slug like "meta-llama/llama-3.3-70b-instruct:free" — keep the part
      // after the last `/` and strip `:free` so the CSV stays readable.
      const short = model.split('/').pop()!.replace(/:free$/, '');
      queries.push({
        name: `openrouter:${short}`,
        call: (p) => callOpenRouter(p, model),
      });
    }
  }
  return queries;
}

// --- Main ---------------------------------------------------------------

function csvEscape(s: string | number | boolean): string {
  const v = String(s);
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

async function main(): Promise<void> {
  const config = readConfig();
  const prompts = QUICK ? config.prompts.slice(0, 5) : config.prompts;
  const date = new Date().toISOString().slice(0, 10);
  const brandRe = brandRegex(config.trackedBrand, config.trackedAliases);
  const domainRe = new RegExp(config.trackedDomain.replace(/\./g, '\\.'), 'i');

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = path.join(RESULTS_DIR, `${date}.csv`);
  const header = 'date,provider,model,prompt,cited,citedDomain,competitorsMentioned,responseLen,error\n';
  fs.writeFileSync(outPath, header);

  const queries = buildQueries();
  if (queries.length === 0) {
    console.error('No provider API keys set. Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, PERPLEXITY_API_KEY, OPENROUTER_API_KEY.');
    process.exit(1);
  }
  console.log(`Running ${prompts.length} prompts × ${queries.length} (provider, model) pairs = ${prompts.length * queries.length} requests.`);
  console.log(`Queries: ${queries.map((q) => q.name).join(', ')}`);
  console.log(`Output: ${outPath}\n`);

  const rows: Row[] = [];
  for (const q of queries) {
    for (const prompt of prompts) {
      let result: Row;
      try {
        const { model, text } = await q.call(prompt);
        result = {
          date,
          provider: q.name,
          model,
          prompt,
          cited: brandRe.test(text),
          citedDomain: domainRe.test(text),
          competitorsMentioned: competitorsIn(text, config.competitors),
          responseLen: text.length,
          error: '',
        };
      } catch (e) {
        result = {
          date,
          provider: q.name,
          model: '',
          prompt,
          cited: false,
          citedDomain: false,
          competitorsMentioned: [],
          responseLen: 0,
          error: e instanceof Error ? e.message : String(e),
        };
      }
      rows.push(result);
      const line = [
        result.date, result.provider, result.model, result.prompt,
        result.cited, result.citedDomain,
        result.competitorsMentioned.join('|'),
        result.responseLen, result.error,
      ].map(csvEscape).join(',') + '\n';
      fs.appendFileSync(outPath, line);
      const flag = result.error
        ? '✗'
        : result.cited ? '✓' : '·';
      console.log(`  ${flag} ${result.provider.padEnd(38)} ${result.prompt.slice(0, 60)}${result.prompt.length > 60 ? '…' : ''}`);
    }
  }

  // Summary
  const total = rows.length;
  const errors = rows.filter((r) => r.error).length;
  const completed = total - errors;
  const cited = rows.filter((r) => r.cited).length;
  const citedDomain = rows.filter((r) => r.citedDomain).length;
  const citationRate = completed > 0 ? Math.round((cited / completed) * 100) : 0;

  const compFreq = new Map<string, number>();
  for (const r of rows) for (const c of r.competitorsMentioned) {
    compFreq.set(c, (compFreq.get(c) ?? 0) + 1);
  }
  const topCompetitors = Array.from(compFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  console.log('\n— Summary —');
  console.log(`Date:               ${date}`);
  console.log(`Total requests:     ${total}`);
  console.log(`Completed:          ${completed} (${errors} errors)`);
  console.log(`Glitch Grow cited:  ${cited} / ${completed} (${citationRate}%)`);
  console.log(`Domain referenced:  ${citedDomain}`);
  if (topCompetitors.length) {
    console.log(`Top competitors mentioned:`);
    for (const [c, n] of topCompetitors) console.log(`  ${String(n).padStart(3)} × ${c}`);
  }
  console.log(`\nFull results: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
