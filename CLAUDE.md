# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cresciva — a directory and funding-intelligence platform for African SMEs. Users create public business profiles, browse a searchable directory, and (with an active subscription) get AI-curated funding opportunities.

## Repository layout

npm workspaces monorepo. Run every command from the repo root.

| Workspace | What it is |
|---|---|
| `Frontend/` | Public site — landing, directory, funding, resources, blog, member dashboard. Vite, port 8080. |
| `AdminPanel/` | Staff admin panel — separate Vite app built under `/admin/`. Port 8081. |
| `Backend/` | NestJS + Drizzle API over the Supabase Postgres. Port 3001. |
| `Shared/` | Design system, shadcn/ui kit, auth, Supabase client, and the zod API contracts. Consumed as source, not built. |
| `supabase/` | Migrations + edge functions. |
| `docs/`, `scripts/` | Plans/guides and brand-asset generation. |

## Commands

```sh
npm install          # installs every workspace (run at the root)

npm run dev          # public site on :8080
npm run dev:admin    # admin panel on :8081
npm run dev:api      # NestJS API on :3001

npm run build        # build both web apps
npm run build:api    # build the API
npm run lint         # ESLint across both web apps
npm test             # every workspace's tests

npm run test --workspace Shared                  # one workspace
npm test --workspace Frontend -- src/test/example.test.ts     # one file
```

Tests use Vitest + Testing Library with jsdom; each workspace has its own `vitest.config.ts`. Test files match `src/**/*.{test,spec}.{ts,tsx}`.

Environment: each web app's `.env` provides `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` — required to run. `AdminPanel/.env` also accepts `VITE_SITE_URL` for when the panel is hosted on its own domain.

## Architecture

Two Vite + React 18 + TypeScript SPAs over a Supabase backend (auth, Postgres with RLS, storage, edge functions), with an optional NestJS API in front of the same database.

Path aliases, identical in both apps:

- `@/` → that app's own `src/`
- `@shared/` → `Shared/src/` — UI kit, auth, Supabase client, design tokens
- `@contracts/` → `Shared/contracts/` — zod API contracts (the Backend imports these too)

The dependency direction is one-way: apps import from `Shared`, never the reverse. Where shared code needs app-specific behaviour it exposes a registry instead — see `Shared/src/hooks/signOutCleanup.ts`, which lets each app register its own teardown without `useAuth` knowing about any app's features.

Cross-app links (admin → public site, and the sign-in redirect) are real document navigations via `Shared/src/lib/crossApp.tsx`, not react-router links — the two apps have separate routers.

### Routes (Frontend/src/App.tsx)

- `/` — landing page composed from `Frontend/src/components/landing/*` (Hero, Problem, Solution, Pricing, FAQ, etc.)
- `/auth` — email/password + OAuth sign-in, plus the TOTP step-up
- `/auth/signup` — three-step account creation wizard (email → password+confirm → name/business). `/auth?mode=signup` forwards here. See **docs/AUTH.md**.
- `/directory` — public searchable SME directory (reads `profiles`, no auth required)
- `/directory/create` — create/update own profile (auth required; one profile per user, upsert keyed by `user_id`)
- `/funding` — subscription-gated AI funding opportunities
- `/resources`, `/resources/:slug` — public resource library (templates, playbooks, guides, ebooks) with gated downloads
- `/blog`, `/blog/:slug` — public blog
- `/about`, `/contact`, `/privacy`, `/terms` — marketing + legal pages
- `/admin/*` — the separate AdminPanel app (see `AdminPanel/src/App.tsx`), not a Frontend route. Deploy its `dist/` under `/admin/`. See **docs/ADMIN_PANEL.md**.

### Admin panel & content platform

RBAC lives in `user_roles` (never on `profiles`), checked via `has_role`/`is_admin`/`is_staff`
`SECURITY DEFINER` functions. `/admin/*` is gated by `AdminPanel/src/components/AdminGuard.tsx`
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
- **Frontend / all display logic** — `Frontend/src/lib/subscription.ts` (`isSubscriptionActive` + the `useSubscription` hook, the only place the client reads `subscriptions`). Every UI surface (Funding, dashboard, billing) imports from here rather than reimplementing the check. Trust-critical: the read THROWS on error and surfaces as `status: "error"`, so a failed fetch never falls back to the paywall — a subscriber on a flaky connection is never told "members only".

### Funding flow

`Frontend/src/pages/Funding.tsx` shows sample data (`SAMPLE_OPPS`) to non-subscribers. For subscribers it invokes the `aggregate-funding` Supabase edge function (`supabase/functions/aggregate-funding/index.ts`), which re-verifies the JWT and subscription server-side, then calls the Lovable AI gateway (Gemini via `LOVABLE_API_KEY` env var on the function) to return 15–25 curated funding opportunities as JSON.

### Transactional email

Resend, via edge functions. The shared module `supabase/functions/_shared/email/`
is deliberately pure TypeScript (no `Deno.*`, no `npm:` imports) so the templates,
the transport retry logic and the unsubscribe tokens are unit-tested under Vitest
from `Frontend/src/lib/__tests__/email-*.test.ts` — adding an `npm:` import to any
of those files breaks the suite.

Contact, newsletter and gated-resource capture no longer insert from the browser:
all three POST to the `send-email` function (`verify_jwt = false` — the callers
are signed out), which owns the row write AND the notification, resolves gated
file URLs from the DB rather than the request, and defends itself with a
honeypot plus a per-IP throttle over `public.email_events`. The browser's only
entry point is `Frontend/src/lib/email.ts`. Payment receipts go out from both
`paystack-webhook` and `paystack-verify` under a shared idempotency key.

Every send funnels through `dispatch()` — calling `sendEmail()` directly skips
the audit row and the unsubscribe headers. Full guide: **docs/EMAIL.md**.

### Auth

Full guide: **docs/AUTH.md** — screen map, the signup wizard's rules, the password
policy (`Shared/src/lib/passwordStrength.ts`, min 8, advisory meter), and the Google
provider runbook.

`AuthProvider` in `Shared/src/hooks/useAuth.tsx` wraps the router in both apps and exposes
`{ user, session, loading, signIn, signUp, signInWithGoogle, signInWithOtp, verifyEmailOtp,
resetPassword, updatePassword, resendConfirmation, signOut }` via `useAuth()`. Sign-in methods:

- **Password** — `signInWithPassword`.
- **Google OAuth** — `signInWithOAuth` (provider configured in the Supabase dashboard).
- **Passwordless** — `signInWithOtp` with `shouldCreateUser: false`, so a typo'd address can never
  create an account; signup stays explicit. The email carries a magic link and, if the "Magic Link"
  template includes `{{ .Token }}`, a 6-digit code — `/auth` accepts either.

Every redirect target passes through `sanitizeNext` (`Shared/src/lib/routes.ts`), the single source
of truth for the `?next=` contract. Never build a redirect from a raw query param.

**Two-factor (TOTP).** `Shared/src/hooks/useMfa.tsx` wraps `supabase.auth.mfa.*`. It reports only
**verified** factors — Supabase writes a factor row at `enroll()` time, before the user has proved
they stored the secret, and those `status: 'unverified'` rows must never count as "MFA is on".
Enrolment UI is `Frontend/src/components/dashboard/MfaCard.tsx` (on `/dashboard/billing`); the
sign-in step-up is `Shared/src/components/auth/MfaChallenge.tsx`, rendered by `/auth`.

`challengeRequired` (session at `aal1` while a verified factor exists) is the load-bearing flag:
`RequireAuth` and `AdminGuard` both send such a session back to `/auth` to finish the challenge.
Without that the second factor would be decorative, because a first-factor session already holds a
usable JWT. Guards remain UX-only — **the database is the real boundary.**

### Role assignment

Role writes go through the `admin_set_role(_user_id, _role, _add)` RPC
(`supabase/migrations/20260727120000_admin_set_role_rpc.sql`), never a direct table write. The
browser client holds only `SELECT` on `user_roles`, and Postgres checks table GRANTs *before* RLS,
so a direct insert fails with `42501` regardless of policy. The RPC is `SECURITY DEFINER` and
therefore re-checks `is_admin(auth.uid())` itself, requires `aal2` from admins who have enrolled
MFA, and refuses to let an admin drop their own admin role.

### Generated files — do not hand-edit

- `Shared/src/integrations/supabase/client.ts` was originally generated — treat as vendored; avoid hand-edits.
- `Shared/src/integrations/supabase/types.ts` is generated from the database schema; regenerate rather than edit when the schema changes.
- `Shared/src/components/ui/*` are stock shadcn/ui components; prefer composing them over modifying them.
