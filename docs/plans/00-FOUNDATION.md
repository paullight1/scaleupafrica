# 00 — FOUNDATION (shared source of truth)

**This file is the single source of truth for the Cresciva overhaul.** Every other plan
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
| `--primary-foreground` | `217 47% 20%` | #1B2A4A | **navy** text on orange (AA — see amendment) |
| `--primary-hover` | `12 100% 60%` | #FF5C35 | orange hover/press |
| `--primary-dark` | `11 78% 52%` | #E44E2E | orange pressed / icons-on-light |
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
| `--ring` | `11 78% 52%` | #E44E2E | focus ring (needs 3:1 on white — see amendment) |
| `--destructive` | `356 75% 54%` | #F2545B | error borders/icons/tints only |
| `--destructive-strong` | `356 65% 42%` | ~#B1252F | destructive FILLS + error TEXT on white (6.6:1) |
| `--destructive-foreground` | `0 0% 100%` | | |
| `--success` | `170 100% 37%` | #00BDA5 | success fills-with-ink / icons / borders only |
| `--success-strong` | `170 100% 25%` | ~#008070 | success TEXT on white (4.9:1) |
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
  Cresciva wordmark, tagline). Store `public/og-banner.png` (or `.jpg`). See `08`.

---

## 4. Engineering conventions

- **Stack:** Vite + React 18 + TS, shadcn/ui (Radix + Tailwind), React Router v6, TanStack Query,
  Supabase client. Path alias `@/` → `src/`. Dev server port 8080. Package manager: bun (bun.lockb
  present) but `npm` scripts work.
- **Do not hand-edit** generated files: `src/integrations/supabase/client.ts`,
  `src/integrations/supabase/types.ts` (regenerate),
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

---

## 8. CROSS-PLAN RECONCILIATION (authoritative — overrides any conflicting statement in 01–08)

The 8 plans were written in parallel and overlap. These rulings win. Every implementation agent
MUST obey this section over its own plan file where they disagree.

### 8.1 WCAG contrast amendment (from plan 01 — applies everywhere)
`--primary-foreground` is **navy `217 47% 20%`**, NOT white. **Solid orange fills get navy labels**
(white-on-#FF7A59 = 2.45:1, fails AA; navy-on-orange = 5.78:1). `--ring` (light) = `11 78% 52%`
(#E44E2E). Add `--destructive-strong 356 65% 42%` and `--success-strong 170 100% 25%` for fills/text
on white. Orange as *text* is allowed **only on navy/dark** (5.78:1), never on white. Dark-mode
`--ring` = `11 100% 68%`. Any plan that drew a "white text on orange button" is corrected to navy.

**Micro-amendment (Wave 1, implemented):** `--primary-hover` is set to `12 100% 61%` (not `60%`).
`hsl(12 100% 60%)` renders to ~#FF5C33, giving navy-on-hover **4.46:1** (fails AA for normal text);
`61%` yields **4.56:1** ✓. The +1% lightness bump is visually imperceptible and keeps the button
hover label AA-compliant. Applied in both light and dark `:root`.

### 8.2 Single-owner file & artifact map (NO two agents write the same file in a wave)
- **`src/components/common/*` primitives** — EmptyState, ErrorState, LoadingState/skeletons,
  PageHeader, StatCard, Illustration, **and `SEO.tsx`** → **owned by Plan 01** (created in Wave 1).
  Plan 08 *uses* `<SEO>` for per-route meta but does NOT create it. All other plans import these.
- **`src/index.css`, `tailwind.config.ts`, fonts, NotFound restyle, MotionConfig, color sweep** →
  Plan 01 only. Plan 01 does **NOT** restyle `src/components/landing/Header.tsx` or `Footer.tsx`
  (Plan 02 deletes them). Skip those two files in the sweep.
- **`App.tsx` routing** → restructured by **Plan 02** (SiteLayout wrapper, auth routes). Wave-3 route
  additions (`/dashboard/*`, `/directory/:slug`, `/billing`, `/payment/callback`) are added by the
  ORCHESTRATOR between Wave 2 and Wave 3. Wave-3 agents create page files but do **NOT** edit App.tsx.
- **Auth surface** — `useAuth.tsx`, `src/pages/Auth.tsx`, `/auth/forgot`, `/auth/reset`,
  `SiteLayout`/`AppHeader`/`AppFooter`, `RequireAuth`, `ScrollToTop`, `authErrors.ts`, `routes.ts`,
  **and the native `supabase.auth.signInWithOAuth('google')` swap** → Plan 02.
- **Lovable removal** — `index.html`, `README.md`, `package.json` (rename + drop `lovable-tagger`),
  `vite.config.ts` tagger usage, favicon/manifest/og-banner, robots/sitemap → Plan 08. Deleting
  `src/integrations/lovable/` + dropping `@lovable.dev/cloud-auth-js` happens in Wave 4 **after**
  Plan 02's OAuth swap removes the last import (orchestrator verifies no imports remain first).
- **`src/lib/subscription.ts`** (frontend active-subscription rule) → Plan 05 owns. Plans 03/06 import.
- **Funding** — `src/pages/Funding.tsx`, `src/components/funding/*`, `fundingSchema.ts`,
  `supabase/functions/aggregate-funding/*` → Plan 05. The paywall CTA calls a Paystack hook from
  Plan 06; Plan 05 wires it. Plan 06 does **NOT** edit Funding.tsx.
- **Payments** — `supabase/functions/paystack-*`, `src/components/billing/*` (incl. `BillingPanel`),
  `src/lib/paystack.ts`/checkout hook, `Pricing.tsx` + `FAQ.tsx` copy/pricing → Plan 06. Plan 03's
  Account-&-billing sub-route **imports** `BillingPanel`; it does not build billing itself.
- **Dashboard** — `src/pages/dashboard/*`, `src/components/dashboard/*` → Plan 03.
- **Directory/Profiles** — `src/pages/Directory.tsx`, `src/pages/ProfileDetail.tsx` (new),
  `src/pages/CreateProfile.tsx`, `src/components/directory/*`, `ImageUploadCrop.tsx` → Plan 04.
- **Data hooks** — each domain writes `src/hooks/queries/<domain>.ts` (disjoint per domain) calling
  the **Supabase client directly** for now. Do NOT create `src/lib/api/*` in Wave 3 — Plan 07 (Wave 4)
  introduces the API client and rewires these hooks behind `VITE_API_DOMAINS`. Structure hooks so the
  data-source can be swapped without changing components.
- **NestJS server** — everything under `server/` (new dir) + `src/lib/api/*` + `shared/contracts/*`
  → Plan 07. It edits Wave-3 query hooks (Wave 4, serial) to route through the API.

### 8.3 Database migration ownership + reserved timestamps (one file each, no collisions)
`supabase/migrations/` stays the SOLE DDL pipeline. Plan 07 mirrors these in Drizzle (read-only,
`drizzle-kit pull` as drift-check) and authors NO DDL. Use exactly these filenames:
| Owner | File | Contents |
|---|---|---|
| Plan 04 | `20260720130000_directory_search_slug.sql` | `profiles.slug` (+ trigger/backfill), pg_trgm indexes, `directory_facets()`, `show_email/phone/whatsapp` flags, `get_profile_contact()`, `increment_profile_views()` |
| Plan 05 | `20260720140000_funding_feed_cache.sql` | `funding_results` cache table, `funding_opportunities` new cols (`last_verified_at`,`source`,`details`), member-gated RLS |
| Plan 06 | `20260720150000_paystack_payments.sql` | `payments`, `payment_webhook_events` (idempotency), `grant_annual_access()` service-role routine |
| Plan 03 | `20260720160000_dashboard_tables.sql` | `saved_opportunities`, `user_preferences` |
`increment_profile_views()` is owned by Plan 04 (Plan 03 calls it). The active-subscription rule lives
in exactly: the SQL `has_active_subscription()` fn (DB), `src/lib/subscription.ts` (FE, Plan 05),
`server/`'s `isActive()` (Plan 07). Remove the third ad-hoc copy in `Funding.tsx`.

### 8.4 Implementation WAVES (dependency-ordered; build + commit between waves)
- **Wave 1 — Plan 01 (solo):** tokens, tailwind, ALL `common/*` primitives incl `SEO`, color sweep,
  fonts, MotionConfig, NotFound. Gate: `npm run build` green.
- **Wave 2 — Plan 02 (solo):** auth pages, `useAuth`, SiteLayout/AppHeader/AppFooter, guards,
  ScrollToTop, native OAuth, App.tsx restructure, delete landing Header/Footer. Gate: build green.
- **Wave 3 — Plans 03 + 04 + 05 + 06 (parallel, disjoint write-sets + owned migrations).**
  Agents do NOT edit App.tsx. Since new pages are unrouted during the wave, each agent VALIDATES with
  `npx tsc --noEmit` (type-checks new files even when unreferenced) + `npm test`, fixing only errors
  in files IT created/modified (sibling agents' in-progress files may show transient errors — ignore).
- **Orchestrator (after all 4 land):** wire Wave-3 routes/imports into App.tsx, then run the
  authoritative full `npm run build` + `tsc` + `npm test`; dispatch a fixer for any real breakage.
- **Wave 4 — Plan 07 (solo):** NestJS `server/`, Drizzle mirror, `src/lib/api/*`, rewire query hooks
  behind flag; then Lovable-dep cleanup (delete `src/integrations/lovable/`, drop deps). Gate: build.
- **Wave 5 — Orchestrator:** full `npm run build` + `lint` + `test`, fixer agent for failures,
  code-review skill, document manual steps (env, run migrations, Paystack keys, OAuth config, deploy).

### 8.5 Honest autonomy boundary (must be surfaced, not silently skipped)
Agents write all CODE. These require the human and MUST be listed in a final `docs/plans/HANDOFF.md`,
never faked as done: running the new SQL migrations against Supabase; setting env/secrets
(`PAYSTACK_SECRET_KEY`, `DATABASE_URL` pooler string, JWT secret/JWKS, `LOVABLE_API_KEY`); enabling
Google OAuth in the Supabase dashboard; deploying `server/`; and any Paystack dashboard/webhook-URL
config. Tests must run and their real results reported (per verification-before-completion).
