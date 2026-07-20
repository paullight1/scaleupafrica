# 00 — FOUNDATION (shared source of truth)

**This file is the single source of truth for the ScaleUp Africa overhaul.** Every other plan
(`01`–`08`) and every implementation agent MUST reference these tokens, conventions, and rules.
Do not invent alternate colors, fonts, spacing, or file locations. If something is missing here,
add it here first, then use it.

Review basis: `IMPROVEMENTS.md` (design-health 21/40 audit), `PRODUCT.md`, `CLAUDE.md`.

---

## 0. Product context (do not break these truths)

- **Who:** African SME founders on mid/low-end Android over variable networks. Time-poor,
  scam-wary. Jobs: (1) get a credible pan-African directory listing, (2) find real funding.
- **Brand personality:** Trustworthy & empowering. Credible, institutional-grade. Voice: direct,
  encouraging, **never hypey**. Trust is the product.
- **Constraints:** WCAG 2.1 AA (≥4.5:1 body contrast, keyboard operable, SR labels, respect
  `prefers-reduced-motion`). Mobile-first, must be usable on 3G. Performance is a design feature.
- **Existing surfaces (do not delete):** Landing `/`, `/auth`, `/directory`, `/directory/create`,
  `/funding`, `/resources`, `/resources/:slug`, `/blog`, `/blog/:slug`, `/about`, `/contact`,
  `/privacy`, `/terms`, and a full `/admin/*` panel (guarded). Supabase backend: `profiles`,
  `subscriptions`, storage bucket `profile-media`, edge fn `aggregate-funding`, admin tables.

---

## 1. Brand direction: HubSpot-inspired (orange / white / dark navy)

Replace the forest-green + gold system entirely. New identity: **energetic-but-credible** —
HubSpot-style orange as the action color, dark navy as the authority/text color, white and cool
light-gray as canvas. Orange = do-something (CTAs, active, key stats). Navy = trust/structure
(headers, dark sections, footer, body ink). Keep it disciplined — orange is a spice, not the meal.

### 1.1 Color tokens (canonical — HSL triplets for the `hsl(var(--x))` system)

Light mode `:root`:

| Token | HSL | Hex ~ | Use |
|---|---|---|---|
| `--background` | `0 0% 100%` | #FFFFFF | page canvas |
| `--surface-subtle` | `204 44% 98%` | #F5F8FA | alt section bg |
| `--surface-muted` | `212 40% 94%` | #EAF0F6 | muted panels |
| `--foreground` | `210 29% 27%` | #33475B | body text (navy slate) |
| `--ink-strong` | `217 47% 20%` | #1B2A4A | headings (deep navy) |
| `--primary` | `11 100% 68%` | #FF7A59 | **orange** — CTAs, active |
| `--primary-foreground` | `0 0% 100%` | #FFFFFF | text on orange |
| `--primary-hover` | `12 100% 60%` | #FF5C35 | orange hover/press |
| `--primary-dark` | `11 78% 52%` | #E44E2E | orange pressed/emphasis |
| `--navy` | `217 47% 20%` | #1B2A4A | dark brand surfaces |
| `--navy-light` | `211 42% 30%` | #2C4A6B | navy hover/lighter |
| `--navy-dark` | `216 55% 12%` | #0D1B2E | darkest navy (footer/dark bg) |
| `--secondary` | `212 40% 94%` | #EAF0F6 | secondary buttons/chips |
| `--secondary-foreground` | `210 29% 27%` | #33475B | |
| `--muted` | `204 44% 98%` | #F5F8FA | |
| `--muted-foreground` | `210 27% 44%` | #516F90 | secondary text (AA on white) |
| `--accent` | `11 100% 68%` | #FF7A59 | matches primary (orange) |
| `--accent-foreground` | `0 0% 100%` | | |
| `--card` | `0 0% 100%` | #FFFFFF | |
| `--card-foreground` | `210 29% 27%` | | |
| `--popover` / `-foreground` | `0 0% 100%` / `210 29% 27%` | | |
| `--border` | `213 33% 84%` | #CBD6E2 | borders |
| `--input` | `213 33% 84%` | #CBD6E2 | |
| `--ring` | `11 100% 68%` | #FF7A59 | focus ring (orange) |
| `--destructive` | `356 75% 54%` | #F2545B | error |
| `--destructive-foreground` | `0 0% 100%` | | |
| `--success` | `170 100% 37%` | #00BDA5 | success (teal-green) |
| `--warning` | `36 89% 65%` | #F5C26B | warning |
| `--radius` | `0.625rem` | | 10px base radius |

Semantic data-viz accent (charts/admin only, sparing): teal `--data-teal: 189 100% 37%` (#00A4BD).
Not a brand color — never use for CTAs.

Dark mode `.dark` (navy canvas, orange stays the action color):

| Token | HSL | Notes |
|---|---|---|
| `--background` | `216 55% 9%` | deep navy #0A1626 |
| `--surface-subtle` | `216 45% 13%` | |
| `--foreground` | `210 30% 92%` | near-white |
| `--ink-strong` | `0 0% 100%` | |
| `--primary` | `11 100% 68%` | orange unchanged |
| `--primary-foreground` | `0 0% 100%` | |
| `--card` | `216 45% 13%` | navy card |
| `--card-foreground` | `210 30% 92%` | |
| `--muted` | `214 30% 18%` | |
| `--muted-foreground` | `210 20% 68%` | AA on navy |
| `--border` | `214 25% 24%` | |
| `--secondary` | `214 30% 18%` | |
| `--ring` | `11 100% 68%` | |

Gradients: **retire `--gradient-gold` and all `.text-gradient-*`.** Allowed: one subtle navy hero
gradient `linear-gradient(160deg, #12263A 0%, #1B2A4A 55%, #0D1B2E 100%)` for dark hero panels only.
No gradient text anywhere.

Shadows (softer, cooler — navy-tinted, not green):
- `--shadow-soft: 0 2px 8px -2px hsl(217 47% 20% / 0.08)`
- `--shadow-medium: 0 6px 20px -6px hsl(217 47% 20% / 0.12)`
- `--shadow-elevated: 0 18px 40px -14px hsl(217 47% 20% / 0.18)`
- `--shadow-focus: 0 0 0 3px hsl(11 100% 68% / 0.35)` (orange focus glow)

### 1.2 Typography

**Retire Playfair Display + Inter** (flagged as stock "premium" pairing, 10 render-blocking weights).
New pairing — self-host or `preconnect` + subset, `font-display: swap`, ≤4 weights each:

- **Headings/display:** `Sora` (geometric, modern, credible; weights 500/600/700) — the distinctive
  voice. Fallback: `"Sora", system-ui, sans-serif`.
- **Body/UI:** `Inter` is acceptable to keep (ubiquitous, screens well on Android) OR switch to
  `"Figtree"`. **Decision: keep Inter for body** (weights 400/500/600) to minimize risk/bytes; make
  the change felt through Sora headings + the new palette. Set `font-family` via `--font-sans` /
  `--font-display` tokens; update `tailwind.config` `fontFamily.sans` and add `fontFamily.display`.
- Load via `<link rel="preconnect">` + a single `<link>` with only the needed weights, or self-host
  in `public/fonts`. Remove the `@import` in `index.css`.

### 1.3 Spacing / radius / shape

- 4px base scale (Tailwind default). Section vertical rhythm: `py-16 md:py-24` for marketing,
  `py-8 md:py-10` for app/dashboard.
- Radius: cards `rounded-xl` (~12px), buttons/inputs `rounded-lg` (~10px), pills `rounded-full`.
- Container: keep `max-w` container; app/dashboard content `max-w-6xl`, marketing `max-w-7xl`.
- Borders 1px `--border`; prefer border + soft shadow over heavy shadows.

### 1.4 Anti-slop rules (enforced everywhere — from IMPROVEMENTS §5)

DO NOT ship any of these:
- Gradient text / `.text-gradient-*`.
- Uppercase tracked "eyebrow kicker" above every section (keep at most one deliberate instance).
- Sparkles-pill "AI-powered" badges (conflicts with never-hypey brand).
- Identical icon-card 3-grids repeated on every section — vary structure (numbers, quotes, real
  photos, stats, split layouts).
- Uniform `opacity:0, y:30` scroll-fade on every block. Motion must be purposeful & minimal.
- `hover:scale-105` on CTAs; pricing "corner ribbon + star" template bingo.
- Template copy ("move the needle", "Two Tools. One Growth Engine.") — rewrite in the honest,
  direct brand voice.

---

## 2. Reusable UX primitives (build once, use everywhere)

The design-system plan (`01`) owns these; every other plan consumes them. Create under
`src/components/common/`:

- **`<EmptyState>`** — icon/illustration, title, description, primary action, optional secondary.
  Variants: `default`, `search` (no results), `error`, `firstRun`. Must be used for every empty
  list (directory, funding, dashboard sections, admin tables).
- **`<LoadingState>` / skeletons** — page skeletons and per-card skeletons using shadcn `Skeleton`.
  A `<CardSkeleton>`, `<TableSkeleton>`, `<DashboardSkeleton>`. Respect reduced-motion (no shimmer
  when reduced). Replace button spinners with content skeletons for long ops (AI call, lists).
- **`<ErrorState>`** — distinct from empty; title, message, **Retry** button. Never render an empty
  or paywall state on fetch error (IMPROVEMENTS §2.1 is a P1 trust bug).
- **`<PageHeader>`** — title + subtitle + actions, consistent across app pages.
- **`<StatCard>`** — number + label + delta, for dashboard/admin.
- **`<AppHeader>`** (auth-aware) and **`<AppFooter>`** — see `02`.
- **`<SEO>`** helper — sets `document.title` + meta/OG per route (see `08`).
- **`<Illustration>`** — wrapper for SVG illustrations (see §3).

All primitives: keyboard-operable, `aria` correct, theme-aware (light/dark), mobile-first.

---

## 3. Imagery & illustration policy

- **License-safe only.** Use: (a) inline SVG illustrations authored for us (preferred — tiny,
  themeable, recolor to navy/orange via `currentColor`), (b) open-license sources (unDraw-style
  recolored to brand, Lucide icons already in deps). **Do not** hotlink or embed copyrighted /
  unknown-license images. Do not copy a named artist's style.
- Store SVGs in `src/assets/illustrations/*.svg` (or as React components in
  `src/components/illustrations/`). Recolor to brand palette; provide `alt`/`aria-hidden` correctly.
- Empty states, onboarding, error pages, and dashboard zero-states each get a purpose-built
  illustration (not stock photos).
- Optimize the hero photo: the existing `src/assets/hero-entrepreneurs.jpg` (253KB) → compress to
  ≤80KB, responsive `srcset`, or replace with an illustration + navy panel. Decorative → `alt=""`.
- **OG/meta banner:** produce a 1200×630 social banner reflecting the new homepage (navy bg, orange
  ScaleUp Africa wordmark, tagline). Store `public/og-banner.png` (or `.jpg`). See `08`.

---

## 4. Engineering conventions

- **Stack:** Vite + React 18 + TS, shadcn/ui (Radix + Tailwind), React Router v6, TanStack Query,
  Supabase client. Path alias `@/` → `src/`. Dev server port 8080. Package manager: bun (bun.lockb
  present) but `npm` scripts work.
- **Do not hand-edit** generated files: `src/integrations/supabase/client.ts`,
  `src/integrations/lovable/index.ts`, `src/integrations/supabase/types.ts` (regenerate),
  `src/components/ui/*` (stock shadcn — compose, don't fork; adding a *new* button variant is OK).
- **Data fetching:** use **TanStack Query** for every server read (it's installed but unused).
  Centralize queries in `src/lib/queries/` or `src/hooks/`. Handle `error` on EVERY fetch → render
  `<ErrorState>`, never empty/paywall.
- **Validation:** Zod for forms and for **AI/edge output** (sanitize URLs — reject non-http(s),
  block `javascript:`). Named field errors, not bare "Required".
- **Routing:** add `<ScrollToTop/>` on route change; use `<Link>` not raw `<a>` for internal nav;
  hash-anchor cross-page scroll handler for `/#pricing` etc.
- **Auth:** `useAuth()` exposes `{ user, session, loading, signOut }`. See `02` for expansions.
- **Testing:** Vitest + Testing Library (jsdom). Add tests for new logic (paywall gate, profile
  upsert, auth branches, URL sanitizer, Paystack webhook handler).
- **Accessibility gates:** every interactive element labeled; focus visible (orange ring); skip
  link; `<MotionConfig reducedMotion="user">` at app root; touch targets ≥44px.
- **Performance:** route-level `React.lazy` code-splitting; subset fonts; compress hero; avoid
  shipping crop/funding/framer-motion to landing visitors.

### 4.1 File / plan map

```
docs/plans/
  00-FOUNDATION.md              (this file)
  01-design-system-theme.md     theme tokens, primitives, imagery, anti-slop, motion
  02-auth-flow.md               auth overhaul + auth-aware AppHeader/AppFooter + guards
  03-user-dashboard.md          /dashboard shell + 4 pillars (net-new)
  04-directory-profiles.md      /directory/:slug detail + OG, filters, pagination, share loop
  05-funding-feature.md         caching/persistence, TanStack Query, skeletons, AI validation
  06-payments-paystack.md       Paystack checkout + webhook + billing UI + honest copy
  07-backend-nestjs-drizzle.md  NestJS API + Drizzle in front of Supabase Postgres + FE migration
  08-branding-meta.md           remove all Lovable branding, meta/OG, homepage banner, README
```

Each plan MUST include: goal, scope (in/out), file-by-file changes (create/modify with paths),
data/contract changes, dependencies on other plans, test plan, acceptance criteria, and a
task-checklist an implementation agent can execute top-to-bottom.

---

## 5. Backend decision (locked)

**NestJS + Drizzle in front of the existing Supabase Postgres.** Keep the Supabase DB, storage
bucket, and auth (JWT). Build a NestJS API (`server/` at repo root or `apps/api/`) using Drizzle
ORM pointed at the same Postgres (`DATABASE_URL` = Supabase connection string / pooler). NestJS
verifies the Supabase JWT (JWKS/JWT secret) for protected routes and enforces access rules in code
(mirroring RLS). Frontend migrates server reads/writes from the Supabase JS client to the NestJS
API incrementally; Supabase auth + storage client stays. RLS remains as defense-in-depth. Full
detail in `07`.

---

## 6. Branding removal (locked, see `08`)

Remove **all** Lovable branding: `index.html` title/description/author/OG/twitter, README, the
`lovable.dev/projects/REPLACE_WITH_PROJECT_ID` URLs, package `name`, and evaluate the
`@lovable.dev/cloud-auth-js` + `lovable-tagger` dependencies (keep only if OAuth still needs them;
otherwise plan removal). Replace OG image with our homepage-derived `og-banner`. Set real
`document.title` per route via `<SEO>`.

---

## 7. Definition of done (whole overhaul)

- HubSpot orange/navy/white theme applied app-wide, light + dark, WCAG AA, no gradient text, no
  anti-slop tells.
- Auth: sign-in/up/out, forgot-password, email-confirm branch, plain-language errors, auth-aware
  header on every route.
- `/dashboard` live with all 4 pillars, each with loading + empty + error states.
- Directory: `/directory/:slug` detail w/ OG, filters, pagination/server search, share loop.
- Funding: cached/persisted, TanStack Query, skeletons, validated AI output, profile pre-seed.
- Paystack checkout + webhook flips `subscriptions.has_access`; billing UI; honest copy.
- NestJS + Drizzle API running against Supabase Postgres; frontend reads/writes migrated (at least
  profiles/directory/funding/subscriptions) with the Supabase client retained for auth/storage.
- Zero Lovable branding; real meta/OG banner; branded NotFound.
- `npm run build`, `npm run lint`, `npm test` all green.
