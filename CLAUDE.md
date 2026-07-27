# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cresciva — a directory and funding-intelligence platform for African SMEs. Users create public business profiles, browse a searchable directory, and (with an active subscription) get AI-curated funding opportunities.

## Commands

```sh
npm run dev          # start Vite dev server on port 8080
npm run build        # production build
npm run lint         # ESLint
npm test             # vitest run (single pass)
npm run test:watch   # vitest watch mode
npx vitest run src/test/example.test.ts   # run a single test file
```

Tests use Vitest + Testing Library with jsdom; config in `vitest.config.ts`, setup in `src/test/setup.ts`. Test files match `src/**/*.{test,spec}.{ts,tsx}`.

Environment: `.env` provides `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` — required for the app to run.

## Architecture

Vite + React 18 + TypeScript SPA with shadcn/ui (Radix + Tailwind) components, React Router, TanStack Query, and a Supabase backend (auth, Postgres with RLS, storage, edge functions). Path alias `@/` → `src/`.

### Routes (src/App.tsx)

- `/` — landing page composed from `src/components/landing/*` (Hero, Problem, Solution, Pricing, FAQ, etc.)
- `/auth` — email/password + OAuth sign-in
- `/directory` — public searchable SME directory (reads `profiles`, no auth required)
- `/directory/create` — create/update own profile (auth required; one profile per user, upsert keyed by `user_id`)
- `/funding` — subscription-gated AI funding opportunities
- `/resources`, `/resources/:slug` — public resource library (templates, playbooks, guides, ebooks) with gated downloads
- `/blog`, `/blog/:slug` — public blog
- `/about`, `/contact`, `/privacy`, `/terms` — marketing + legal pages
- `/admin/*` — staff admin panel (dashboard, resources/blog/funding CMS, users, profile moderation, leads, newsletter, settings, audit). See **docs/ADMIN_PANEL.md**.

### Admin panel & content platform

RBAC lives in `user_roles` (never on `profiles`), checked via `has_role`/`is_admin`/`is_staff`
`SECURITY DEFINER` functions. `/admin/*` is gated by `src/components/admin/AdminGuard.tsx`
(`require="staff"` = admin+editor for the CMS, `require="admin"` for user/settings areas) and RLS
enforces the real boundary. New tables (migration `20260720120000_admin_panel_foundation.sql`):
`user_roles`, `resources`, `blog_posts`, `funding_opportunities`, `leads`,
`newsletter_subscribers`, `analytics_events`, `site_settings`, `admin_audit_log`; plus admin RPCs
(`admin_dashboard_stats`, `admin_timeseries`, `admin_list_users`) and storage buckets
`content-media` / `resource-files`. Full guide: **docs/ADMIN_PANEL.md**.

### Data model (supabase/migrations/)

- `profiles` — public SME directory entries. RLS: anyone can SELECT; users can only INSERT/UPDATE/DELETE rows where `auth.uid() = user_id`.
- `subscriptions` — one row per user, auto-created on signup by the `on_auth_user_created` trigger with `has_access = false`. Access is flipped manually for now (Stripe planned). Users can only read their own row; only `service_role` can write.
- Storage bucket `profile-media` — public read; users write only under a folder named after their own uid.

"Active subscription" means `has_access = true` and `expires_at` null or in the future. The rule has exactly **two homes** (keep them in lockstep if it changes):

- **Server / all trust boundaries** — the `has_active_subscription()` SQL function; server code (edge/NestJS) enforces access through it, never by re-deriving the rule.
- **Frontend / all display logic** — `src/lib/subscription.ts` (`isSubscriptionActive` + the `useSubscription` hook, the only place the client reads `subscriptions`). Every UI surface (Funding, dashboard, billing) imports from here rather than reimplementing the check. Trust-critical: the read THROWS on error and surfaces as `status: "error"`, so a failed fetch never falls back to the paywall — a subscriber on a flaky connection is never told "members only".

### Funding flow

`src/pages/Funding.tsx` shows sample data (`SAMPLE_OPPS`) to non-subscribers. For subscribers it invokes the `aggregate-funding` Supabase edge function (`supabase/functions/aggregate-funding/index.ts`), which re-verifies the JWT and subscription server-side, then calls the Lovable AI gateway (Gemini via `LOVABLE_API_KEY` env var on the function) to return 15–25 curated funding opportunities as JSON.

### Auth

`AuthProvider` in `src/hooks/useAuth.tsx` wraps the router and exposes `{ user, session, loading, signOut }` via `useAuth()`. OAuth uses `supabase.auth.signInWithOAuth` (Google provider configured in the Supabase dashboard).

### Generated files — do not hand-edit

- `src/integrations/supabase/client.ts` was originally generated — treat as vendored; avoid hand-edits.
- `src/integrations/supabase/types.ts` is generated from the database schema; regenerate rather than edit when the schema changes.
- `src/components/ui/*` are stock shadcn/ui components; prefer composing them over modifying them.
