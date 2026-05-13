/**
 * Server-authoritative catalog of every fulfillable SKU.
 *
 * Cloudflare Pages Functions can't import from src/ at runtime, so this
 * file mirrors the products/bundles tables in src/lib/. When you add or
 * rename a SKU in src/lib/products.ts or src/lib/bundles.ts, update this
 * file too.
 *
 * Each entry maps a SKU to:
 *   - human name  — shown in the welcome email subject + body
 *   - private repo — full org/repo path the buyer is invited to (this is
 *                    a buyer-distribution `-pkg` repo, not the engine
 *                    `-private` repo)
 *   - role        — Discord role to grant after they join the community
 *   - playbookUrl — placeholder; per-SKU PDF link surfaced in the email
 *   - manualOnly  — if true, no automated Codeberg invite is attempted
 *
 * ─── Three-tier repo model ─────────────────────────────────────────────
 *   public (Glitch_Exec_Lab/*)         skeleton showcase only
 *   private (glitch-executor/*-private) full engine + real client state
 *                                       NEVER given to buyers
 *   pkg (glitch-executor/*-pkg)        engine code only, sanitised by
 *                                      scripts/sync-to-pkg.sh in each
 *                                      -private repo. THIS is what
 *                                      buyers get invited to.
 */

export interface SkuEntry {
  name: string;
  /** owner/repo string passed to Codeberg /repos/{owner}/{repo}/collaborators. */
  repo?: string;
  /** For BSK-ALL — list of all repos to invite buyer to. */
  repos?: string[];
  /** Discord role granted in the community guild. */
  role: 'Agent Buyer' | 'Founder Stack Buyer';
  /** Optional URL of the playbook PDF surfaced in the welcome email. */
  playbookUrl?: string;
  /** If true: skip the automated Codeberg invite call. */
  manualOnly?: boolean;
  /** Free-form note shown to ops in the Discord ping when manualOnly. */
  manualReason?: string;
}

export const SKU_CATALOG: Record<string, SkuEntry> = {
  // BSK-001 (MCP Builder Pack) — discontinued 2026-05-08. Existing buyers
  // keep their Codeberg invite to glitch-grow-mcp-builder-pack indefinitely.

  'BSK-002': {
    name: 'AI Ads Agent',
    repo: 'glitch-executor/glitch-grow-ai-ads-agent-pkg',
    role: 'Agent Buyer',
  },
  'BSK-003': {
    name: 'AI Sales Agent',
    repo: 'glitch-executor/glitch-grow-sales-agent-pkg',
    role: 'Agent Buyer',
  },
  'BSK-004': {
    name: 'AI Social Media Agent',
    repo: 'glitch-executor/glitch-grow-ai-social-media-agent-pkg',
    role: 'Agent Buyer',
  },
  'BSK-005': {
    name: 'Voice AI Agent',
    repo: 'glitch-executor/glitch-grow-cod-confirm-pkg',
    role: 'Agent Buyer',
  },
  'BSK-006': {
    name: 'AI SEO Agent',
    repo: 'glitch-executor/glitch-grow-ai-seo-agent-pkg',
    role: 'Agent Buyer',
  },
  'BSK-007': {
    name: 'AI UGC Agent',
    repo: 'glitch-executor/glitch-grow-ai-ugc-agent-pkg',
    role: 'Agent Buyer',
  },
  'BSK-ALL': {
    name: 'AI Digital Marketing Stack',
    repos: [
      'glitch-executor/glitch-grow-ai-ads-agent-pkg',
      'glitch-executor/glitch-grow-sales-agent-pkg',
      'glitch-executor/glitch-grow-ai-social-media-agent-pkg',
      'glitch-executor/glitch-grow-cod-confirm-pkg',
      'glitch-executor/glitch-grow-ai-seo-agent-pkg',
      'glitch-executor/glitch-grow-ai-ugc-agent-pkg',
    ],
    role: 'Founder Stack Buyer',
  },
};

/** Resolve the list of repos a SKU's buyer should be added to. */
export function reposFor(sku: string): string[] {
  const entry = SKU_CATALOG[sku.toUpperCase()];
  if (!entry) return [];
  if (entry.repos) return entry.repos;
  if (entry.repo) return [entry.repo];
  return [];
}
