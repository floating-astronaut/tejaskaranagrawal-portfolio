# Handoff prompt — glitch-grow-site

Copy everything below the `---` into the next session.

---

You are taking over the `glitch-grow-site` Astro upgrade at
`/home/support/glitch-grow-site/`. The previous session replaced the old static
HTML + CDN Tailwind site with a production-grade Astro build. It compiles,
typechecks clean, and all 7 Playwright smoke tests pass.

## What's already shipped

**Stack (all free, no paid services):**
- Astro 4.16 `output: 'static'` (no SSR adapter — runtime endpoints use CF Pages Functions)
- Compiled Tailwind (no CDN) with semantic tokens in `src/styles/tokens.css`
- TypeScript strict (`~/*` alias → `src/*`)
- Motion One + Lenis smooth scroll (both respect `prefers-reduced-motion`)
- Astro `<Image>` → sharp → AVIF (mascot 173kB → 4kB)
- Satori + `@resvg/resvg-js` — 3 OG PNGs prerendered at build
- Fonts: Inter Tight Variable + Geist Mono via Fontsource (self-hosted)
- View Transitions, skip-to-content, `:focus-visible`, JSON-LD (Org + WebSite + per-page)
- MDX content collection `case-studies/` with zod schema in `src/content/config.ts`

**Pages:** `/`, `/case-studies`, `/case-studies/[slug]`, `/legal/privacy`, `/legal/terms`, `/thanks`.

**Infra files:**
- `functions/api/contact.ts` — CF Pages Function, Turnstile verify + honeypot + Slack/webhook forward
- `public/_headers` — security headers + long-cache
- `public/robots.txt`, sitemap-index (@astrojs/sitemap **pinned to 3.2.1** — 3.7+ crashes against Astro 4)
- `.github/workflows/ci.yml` — build → typecheck → playwright → Lighthouse (perf ≥0.9, a11y ≥0.95)
- `lighthouserc.json`, `playwright.config.ts`, `.env.example`, `README.md`

**Preserved brand assets:** `public/assets/brand/` (favicons, mascot, og-image) + `src/assets/mascot-512.png` for `<Image>`.

## Important constraints to keep honoring
- **Free/OSS-first.** No paid fonts, no paid SaaS. (Feedback memory: production_coding_rules.)
- **No emoji as UI.** Icons live in `src/components/Icon.astro` as hand-authored SVG on a 24×24 grid.
- **No fake terminals.** Replaced with `<ImageSlot>` placeholders annotated with exact `w/h/alt`. Stock imagery is coming from Canva Pro later — the slots are the handoff contract.
- **`output: 'static'`** — don't switch back to hybrid. The contact endpoint is handled by CF Pages Functions out of `/functions/`, not an Astro adapter.
- **Sitemap pinned to 3.2.1.** Don't let dependabot bump it; newer versions rely on Astro 5's `astro:routes:resolved` hook and crash under Astro 4.
- **BSL 1.1 → Apache 2.0 on 2030-04-18** (project memory: public_repo_licensing).

## Likely next tasks (ask the user which one they want)

1. **Land the real imagery.** Replace every `<ImageSlot ... />` with an imported Canva export via `<Image>`. Search: `rg 'ImageSlot' src/`. Each slot already has correct dimensions + alt.
2. **Wire Turnstile.** Set `PUBLIC_TURNSTILE_SITE_KEY` in `.env` / CF Pages env, and `TURNSTILE_SECRET` + `SLACK_WEBHOOK_URL` (or `CONTACT_FORWARD_URL`) in CF dashboard. Contact form silently drops honeypot submissions and returns 403 on Turnstile failure.
3. **Pick analytics.** Set `PUBLIC_ANALYTICS_PROVIDER=plausible|umami` and the matching domain/ID env. Component in `src/components/Analytics.astro` renders nothing when unset.
4. **Add more case studies.** Drop new `*.mdx` files into `src/content/case-studies/` matching the zod schema. The OG endpoint auto-generates a card per new slug.
5. **Deploy to Cloudflare Pages.** Build command `npm run build`, output dir `dist`, functions dir auto-detected from `functions/`. Domain: `grow.glitchexecutor.com`.
6. **Tighten Lighthouse.** Current budget is permissive; consider adding `largest-contentful-paint` and `cumulative-layout-shift` assertions once real images are in.

## Commands
```bash
cd /home/support/glitch-grow-site
npm install                # already done but verify
npm run dev                # http://localhost:4321
npm run build              # → dist/ (1.7 MB, 49 files)
npx astro check            # 0 errors expected
npx playwright test        # 7 passing
```

## Gotchas worth knowing
- The `matchMedia` call in `src/lib/motion.ts` runs only in the browser — the file is dynamic-imported from `Base.astro` to avoid SSR access.
- `src/pages/api/og/[slug].png.ts` fetches fonts from `fonts.bunny.net` at build time. CI needs outbound network (it has it). If you ever need to go fully offline, embed the woff bytes in the repo.
- `<Fragment slot="head">` (not `<slot>`) is how child pages inject into the named head slot in `Base.astro`.
- Icon component props have explicit casts (`'img' | undefined`, `'true' | undefined`) to satisfy Astro's strict `SVGAttributes` typing — don't drop those casts.
- Auto-memory lives at `/home/support/.claude/projects/-home-support/memory/`. Check `MEMORY.md` for user/project context before making judgment calls.

## Current state proof
- `npx astro check` → 0 errors, 0 warnings, 0 hints
- `npm run build` → 6 pages + 3 OG PNGs, 1.7 MB total
- `npx playwright test` → 7 passed
- Last session ended 2026-04-19.
