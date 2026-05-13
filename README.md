# Glitch Grow Marketing Site

Marketing site for **Glitch Grow**, the AI digital marketing domain inside **Glitch Executor Labs**.

## What it is

- public website for the Glitch Grow brand
- positions the growth, ads, and voice-AI product stories
- contains the landing-page metadata, OG tags, and public-facing copy for the site

## Live site

- https://grow.glitchexecutor.com

## Related repos

- [glitch-grow-cod-confirm](https://github.com/glitch-exec-labs/glitch-grow-cod-confirm)
- [glitch-grow-ai-ads-agent](https://github.com/glitch-exec-labs/glitch-grow-ai-ads-agent)
- [glitch-grow-ai-social-media-agent](https://github.com/glitch-exec-labs/glitch-grow-ai-social-media-agent)
- [glitch-executor-labs-brand-assets](https://github.com/glitch-exec-labs/glitch-executor-labs-brand-assets)

## Brand note

Glitch Grow is part of the broader **Glitch Executor** brand family alongside Glitch Trade and Glitch Edge.

---

Production-grade Astro site. Dark-first, token-driven, compiled Tailwind,
self-hosted fonts, zero paid dependencies.

Deploy target: **Cloudflare Pages** — `output: 'static'` build, with runtime
endpoints served by Pages Functions out of `/functions/` (no Astro adapter).

## Stack

- **Astro** static output with MDX content collections; runtime endpoints via CF Pages Functions
- **Tailwind CSS** compiled (no CDN) with semantic tokens via CSS variables
- **TypeScript** strict
- **Motion One** entrance animations + **Lenis** smooth scroll (both respect `prefers-reduced-motion`)
- **Astro `<Image>`** (sharp → AVIF/WebP) for brand assets
- **Satori + resvg** for per-page dynamic OG cards (prerendered at build)
- **Cloudflare Turnstile** on the contact form → Cloudflare Pages Function (`functions/api/contact.ts`)
- **Plausible / Umami** analytics hook (opt-in via env, renders nothing if unset)
- **Playwright** smoke tests + **Lighthouse CI** performance budget

## Scripts

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # produces ./dist (static) + CF Pages Functions
npm run preview      # preview built site
npm run test         # Playwright smoke (builds + serves automatically)
npm run check        # astro check (type + template)
```

## Project layout

```
public/
  assets/brand/...     # preserved favicons, mascot, OG image
  robots.txt
  site.webmanifest
src/
  assets/mascot-512.png     # sharp-piped through <Image>
  components/
    Icon.astro              # SVG icon set (replaces emoji)
    ImageSlot.astro         # 1:1-sized placeholders for Canva imagery
    Nav.astro Footer.astro
    ContactForm.astro       # Turnstile-wired
    JsonLd.astro Analytics.astro Mascot.astro
    sections/               # Hero, Outcomes, Services, CaseSpotlight, Pilot, FAQ, Stack, Contact
  content/
    case-studies/           # MDX
  layouts/Base.astro        # head, JSON-LD, ViewTransitions, skip-link
  lib/
    site.ts                 # brand metadata + nav
    motion.ts               # Lenis + Motion One bootstrap
    og.ts                   # Satori template
  pages/
    index.astro
    case-studies/index.astro
    case-studies/[slug].astro
    legal/{privacy,terms}.astro
    thanks.astro
    api/og/[slug].png.ts    # prerendered Satori OG
  styles/
    tokens.css global.css
functions/
  api/contact.ts            # CF Pages Function: Turnstile verify + forward
tests/smoke.spec.ts         # Playwright
.github/workflows/ci.yml    # build · typecheck · smoke · Lighthouse
lighthouserc.json
```

## Design tokens

All colors are declared as RGB triplets in `src/styles/tokens.css` and exposed to
Tailwind via the `tailwind.config.mjs` `<alpha-value>` mechanism. To retheme,
edit one file.

Typography is fluid (`clamp()` + `text-wrap: balance`) — no manual breakpoint
juggling.

## Image slots

Anywhere imagery is not yet supplied, `<ImageSlot w={1280} h={720} label="..." />`
renders a dashed placeholder with the required dimensions + alt text. When Canva
Pro exports arrive, swap each `<ImageSlot>` for `<Image>` with a `src` import —
nothing else changes.

## Environment

Copy `.env.example` → `.env`. Public vars prefixed `PUBLIC_*` are inlined at
build; server-only secrets must be set in the Cloudflare Pages dashboard.

| Var                           | Scope       | Required       | Purpose                                                                                  |
| ----------------------------- | ----------- | -------------- | ---------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_URL`             | build       | yes            | Canonical origin. CI sets it to `https://grow.glitchexecutor.com`.                       |
| `PUBLIC_TURNSTILE_SITE_KEY`   | build       | prod           | Turnstile site key. When unset, the widget is omitted; the handler skips verification.   |
| `TURNSTILE_SECRET`            | CF Pages    | prod           | Turnstile secret. Without it, the handler accepts unverified submissions (dev-only).     |
| `SLACK_WEBHOOK_URL`           | CF Pages    | at least one sink | Incoming-webhook URL. Handler posts a formatted Block Kit message.                    |
| `CONTACT_FORWARD_URL`         | CF Pages    | at least one sink | Generic JSON sink (Resend / Zapier Catch / n8n). Handler POSTs the raw payload.       |
| `PUBLIC_ANALYTICS_PROVIDER`   | build       | optional       | `plausible` or `umami`. Unset → Analytics component renders nothing.                     |

### Provisioning Turnstile (first time)

1. Cloudflare dashboard → **Turnstile** → **Add site**.
2. Domain: `grow.glitchexecutor.com`. Widget mode: **Managed**.
3. Copy the **site key** → `PUBLIC_TURNSTILE_SITE_KEY` in CF Pages → Settings → Environment variables (Production + Preview).
4. Copy the **secret** → `TURNSTILE_SECRET` in the same panel, marked **Encrypted**.
5. For local dev, put the same two values in `.env` (gitignored). With no `TURNSTILE_SECRET` the local dev function accepts all submissions — fine for dev, never for prod.

## Deployment

Cloudflare Pages — one-time setup:

1. Pages → **Create application** → **Connect to Git** → pick this repo.
2. Framework preset: **Astro**. Overrides:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: *(leave empty)*
3. Environment variables — Production:
   - `PUBLIC_SITE_URL=https://grow.glitchexecutor.com`
   - `PUBLIC_TURNSTILE_SITE_KEY=<site key>`
   - `TURNSTILE_SECRET=<secret>` (Encrypted)
   - One of `SLACK_WEBHOOK_URL` / `CONTACT_FORWARD_URL` (Encrypted)
4. Settings → **Functions**:
   - Compatibility date: current or newer.
   - `nodejs_compat` flag is **not required** — the handler uses only web-standard `fetch` / `FormData`.
5. Settings → **Build & deployments** → Node.js version: `20`.
6. Custom domain: `grow.glitchexecutor.com` → Pages will auto-provision a cert via CF DNS.
7. Trigger the first deploy by pushing to `main` (or hit **Retry deployment**).

The `/functions/api/contact.ts` handler is auto-detected; no adapter, no
`wrangler.toml` needed.

### Verification

After first deploy:

- `curl -I https://grow.glitchexecutor.com/` → `200`, long-cache headers on `/_astro/*` + `/assets/*`.
- Visit `/#contact`, submit the form with a real email → check the Slack channel or forward URL.
- Submitting with an empty Turnstile token hits the handler and returns `403 {"ok":false,"error":"turnstile-failed"}`.

## Replacing placeholders

Search for `<ImageSlot` and swap each one for an imported asset as images land
from Canva Pro. Dimensions / alts are already annotated.

## Licensing

All code in this repository is BSL 1.1 → Apache 2.0 on Change Date 2030-04-18.
See glitchexecutor.com/legal for details.
