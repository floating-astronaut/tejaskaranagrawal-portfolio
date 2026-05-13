#!/usr/bin/env -S node --experimental-strip-types
/**
 * Loser-prompt mining — reads the citation-tracker CSVs and produces
 * a ranked content brief of prompts where Glitch Grow is consistently
 * NOT cited but at least one competitor IS cited. Those are the prompts
 * the next blog post / alternatives-page refresh should target.
 *
 * Output: a markdown brief at docs/loser-prompts-<date>.md, plus a
 * stdout summary. Each entry includes the prompt, the providers that
 * tested it, which competitors got cited instead, and a suggested
 * content angle drawn from existing /alternatives + /vs pages.
 *
 * Run weekly after citations:check has populated a few CSVs:
 *   pnpm run loser-prompts
 *   pnpm run loser-prompts --since=2026-05-01
 */

import fs from 'node:fs';
import path from 'node:path';

const RESULTS_DIR = path.join(process.cwd(), 'scripts', 'citation-results');
const DOCS_DIR = path.join(process.cwd(), 'docs');

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

function parseCsv(text: string): Row[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Simple CSV with possible quoted fields containing commas / newlines.
    // The tracker only quotes when needed, so a permissive split + quote
    // unwrap handles this without a full parser.
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 9) continue;
    rows.push({
      date: cells[0],
      provider: cells[1],
      model: cells[2],
      prompt: cells[3],
      cited: cells[4] === 'true',
      citedDomain: cells[5] === 'true',
      competitorsMentioned: cells[6] ? cells[6].split('|') : [],
      responseLen: Number(cells[7]) || 0,
      error: cells[8],
    });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else cur += ch;
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') { inQuotes = true; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

interface PromptStats {
  prompt: string;
  totalTrials: number;
  glitchHits: number;
  competitorTallies: Map<string, number>;
  providers: Set<string>;
}

function mineLosers(rows: Row[]): PromptStats[] {
  const byPrompt = new Map<string, PromptStats>();
  for (const r of rows) {
    if (r.error) continue;
    if (!byPrompt.has(r.prompt)) {
      byPrompt.set(r.prompt, {
        prompt: r.prompt,
        totalTrials: 0,
        glitchHits: 0,
        competitorTallies: new Map(),
        providers: new Set(),
      });
    }
    const s = byPrompt.get(r.prompt)!;
    s.totalTrials++;
    s.providers.add(r.provider);
    if (r.cited) s.glitchHits++;
    for (const c of r.competitorsMentioned) {
      s.competitorTallies.set(c, (s.competitorTallies.get(c) ?? 0) + 1);
    }
  }
  // Losers = prompts where we have <50% hit rate AND at least one
  // competitor was cited with >50% frequency.
  return Array.from(byPrompt.values())
    .filter((s) => {
      const hitRate = s.glitchHits / Math.max(s.totalTrials, 1);
      if (hitRate >= 0.5) return false;
      const topComp = Math.max(0, ...Array.from(s.competitorTallies.values()));
      return topComp / Math.max(s.totalTrials, 1) >= 0.5;
    })
    .sort((a, b) => {
      // Rank by competitor strength minus our strength.
      const aTop = Math.max(0, ...Array.from(a.competitorTallies.values()));
      const bTop = Math.max(0, ...Array.from(b.competitorTallies.values()));
      return (bTop - b.glitchHits) - (aTop - a.glitchHits);
    });
}

function angleFor(promptText: string, topCompetitor: string): string {
  // Map a top-cited competitor name into a recommendation about where to
  // refresh / write to displace it.
  const slug = topCompetitor.toLowerCase().replace(/\s+/g, '-').replace('lindy-ai', 'lindy-ai');
  return [
    `Refresh /alternatives/${slug} and /vs/${slug} with the specific phrasing the prompt uses.`,
    `Add a stat-callout component to /alternatives/${slug} with the sharpest competitive number.`,
    `Consider a new blog post titled to match the prompt verbatim — direct-answer first 60 words.`,
  ].join(' ');
}

function main(): void {
  if (!fs.existsSync(RESULTS_DIR)) {
    console.error('No scripts/citation-results/ — run citations:check first.');
    process.exit(1);
  }
  const since = (process.argv.find((a) => a.startsWith('--since=')) ?? '').slice('--since='.length);
  const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.csv') && (!since || f >= `${since}.csv`));
  if (!files.length) {
    console.error('No CSVs match. Run citations:check or pass --since=YYYY-MM-DD.');
    process.exit(1);
  }
  const allRows: Row[] = [];
  for (const f of files) {
    allRows.push(...parseCsv(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf8')));
  }
  const losers = mineLosers(allRows);

  const today = new Date().toISOString().slice(0, 10);
  const outPath = path.join(DOCS_DIR, `loser-prompts-${today}.md`);
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const lines: string[] = [
    `# Loser-prompt content brief — ${today}`,
    '',
    `Source: ${files.length} CSV(s) under \`scripts/citation-results/\`${since ? ` since ${since}` : ''}.`,
    `Total trials: ${allRows.filter((r) => !r.error).length}. Losing prompts: ${losers.length}.`,
    '',
    'A "losing" prompt is one where Glitch Grow is cited less than 50% of the time AND at least one competitor is cited more than 50% of the time across the providers we test. These are the prompts to target next.',
    '',
  ];
  if (losers.length === 0) {
    lines.push('_No losing prompts in this window — either you\'re winning or the tracker hasn\'t run enough times yet._');
  } else {
    losers.forEach((s, i) => {
      const top = Array.from(s.competitorTallies.entries()).sort((a, b) => b[1] - a[1])[0];
      const topName = top ? top[0] : '(none)';
      lines.push(`## ${i + 1}. ${s.prompt}`);
      lines.push('');
      lines.push(`- Glitch Grow cited: **${s.glitchHits} / ${s.totalTrials}** trials (${Math.round((s.glitchHits / s.totalTrials) * 100)}%)`);
      lines.push(`- Top competitor: **${topName}** — ${top ? top[1] : 0} citations`);
      lines.push(`- Providers tested: ${Array.from(s.providers).sort().join(', ')}`);
      if (s.competitorTallies.size > 1) {
        const others = Array.from(s.competitorTallies.entries())
          .filter(([n]) => n !== topName)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([n, c]) => `${n} (${c})`)
          .join(', ');
        if (others) lines.push(`- Other competitors cited: ${others}`);
      }
      lines.push('');
      lines.push(`**Suggested move.** ${angleFor(s.prompt, topName)}`);
      lines.push('');
    });
  }

  fs.writeFileSync(outPath, lines.join('\n') + '\n');

  console.log(`Loser prompts: ${losers.length} / ${new Set(allRows.map((r) => r.prompt)).size}`);
  console.log(`Brief written to: ${path.relative(process.cwd(), outPath)}`);
  losers.slice(0, 5).forEach((s, i) => {
    const top = Array.from(s.competitorTallies.entries()).sort((a, b) => b[1] - a[1])[0];
    console.log(`  ${i + 1}. ${s.prompt.slice(0, 70)}${s.prompt.length > 70 ? '…' : ''}  → top: ${top ? top[0] : '-'} (${top ? top[1] : 0})`);
  });
}

main();
