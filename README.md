# Cresciva

Cresciva is a Pan-African SME platform: a public, searchable directory where founders publish one credible business profile, plus membership-gated funding intelligence for African SMEs. Browsing the directory is free and open; the Funding Radar is available to members with an active annual entitlement.

## Stack

- **Frontend:** Vite + React 18 + TypeScript, shadcn/ui (Radix + Tailwind CSS), React Router, TanStack Query, Framer Motion.
- **Admin:** a separate Vite/React app assembled under `/admin/` in the production artifact.
- **Backend today:** Supabase Auth, Postgres/RLS, Storage and Deno Edge Functions.
- **Payments:** Bachs hosted checkout, Bachs signed webhooks, and a Cresciva-owned payment/entitlement ledger. Membership is a one-time annual purchase and does not auto-renew.
- **API server:** NestJS + Drizzle under `Backend/`, introduced behind domain-by-domain cutover flags.
- **Testing:** Vitest + Testing Library; GitHub Actions also typechecks Supabase Edge Functions with Deno.

## Getting started

**Prerequisite:** Node.js 20+.

This is an npm workspaces monorepo. Run commands from the repository root.

```sh
npm ci

cp Frontend/.env.example Frontend/.env
cp AdminPanel/.env.example AdminPanel/.env

npm run dev          # public site: http://localhost:8080
npm run dev:admin    # admin panel: http://localhost:8081/admin/
npm run dev:api      # NestJS API: http://localhost:3001
```

## Verification

The repository-wide release contract is:

```sh
npm run verify
```

It runs linting, TypeScript checks, all workspace tests, the assembled Frontend/Admin production build, and the Backend production build. CI runs the same contract and additionally Deno-checks the deployed Edge Function entry points.

Useful commands:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Public-site dev server |
| `npm run dev:admin` | Admin-panel dev server |
| `npm run dev:api` | NestJS API dev server |
| `npm run build` | Frontend + AdminPanel + assembled deployment artifact |
| `npm run build:web` | Public site only |
| `npm run build:admin` | Admin panel only |
| `npm run build:api` | NestJS API only |
| `npm run lint` | Frontend + AdminPanel + Backend lint |
| `npm run typecheck` | Every TypeScript workspace |
| `npm test` | Every workspace test suite |
| `npm run verify` | Full repository release gate |
| `npm run sitemap` | Regenerate sitemap and robots |
| `npm run og` | Re-capture the 1200×630 homepage social image |
| `npm run assets` | Regenerate brand assets from SVG sources |

## Public origin

`config/site-origin.js` is the single source of truth for the default public production origin. The current repository default is `https://cresciva.vercel.app`.

Deployments may override it with `VITE_SITE_ORIGIN`. Runtime SEO metadata, static HTML metadata, sitemap and robots generation all consume the same contract. Do not duplicate the production-origin literal elsewhere.

The two web apps share one production host by default:

- public site: `/`
- admin panel: `/admin/`

`VITE_SITE_URL` and `VITE_ADMIN_URL` are only needed when those apps are served from different origins (for example, separate Vite dev ports).

## Environment

Browser-exposed variables must contain only publishable values:

### Frontend / AdminPanel

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_SITE_ORIGIN            # Frontend; optional override of shared default
VITE_ADMIN_URL              # Frontend; only when admin is a separate origin
VITE_SITE_URL               # AdminPanel; only when public site is a separate origin
VITE_API_URL                # when NestJS domains are enabled
VITE_API_DOMAINS            # comma-separated cutover domains
```

### Supabase Edge Function secrets

Never commit these values:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BACHS_SECRET_KEY
BACHS_BASE_URL
BACHS_WEBHOOK_SIGNING_SECRET
BACHS_ORGANIZATION_ID       # recommended provider/account pin
APP_URL                     # official Cresciva web origin used for checkout callbacks
LOVABLE_API_KEY             # current funding AI gateway key
RESEND_API_KEY
EMAIL_FROM
EMAIL_TEAM_INBOX
EMAIL_TOKEN_SECRET
```

Bachs environments must not be mixed:

- sandbox API: `https://sandbox-api.bachs.io` with an `sk_sandbox_…` key
- live API: `https://api.bachs.io` with an `sk_live_…` key

The code rejects a Bachs key/base-URL environment mismatch.

### NestJS Backend (when deployed)

```text
NODE_ENV
PORT
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET         # only if the configured auth path requires it
CORS_ORIGINS
BACHS_SECRET_KEY
BACHS_BASE_URL
BACHS_WEBHOOK_SIGNING_SECRET
BACHS_ORGANIZATION_ID
AI_GATEWAY_URL
AI_GATEWAY_KEY
AI_MODEL
```

Payment fulfillment is intentionally single-homed in Supabase Edge Functions during the current production-readiness phase; the NestJS API does not mount a competing Bachs webhook handler.

## Project structure

```text
Frontend/                 public site and member dashboard
AdminPanel/               staff operations UI, assembled at /admin/
Shared/                   design system, auth, Supabase client and contracts
Backend/                  NestJS + Drizzle API
config/                   cross-runtime configuration contracts
supabase/migrations/      database schema/RLS history
supabase/functions/       Deno Edge Functions
scripts/                  sitemap, assets, OG-image tooling
docs/production-readiness launch-hardening plans and evidence
```

## Payment flow

1. A signed-in user selects the annual plan/currency.
2. `bachs-init` resolves the amount from the server-owned price list, creates the internal `payments` row, then creates a Bachs hosted checkout using a stable idempotency key.
3. The browser redirects to Bachs.
4. Bachs redirects back with a `checkout_id`; `bachs-verify` re-fetches provider state and never trusts the redirect itself as payment proof.
5. `bachs-webhook` is the authoritative asynchronous settlement path. `collection.succeeded` may grant access only after server-side checkout retrieval and exact ledger validation.
6. `grant_annual_access(_payment_id)` is the only path that changes paid membership access.
7. `/admin/payments` exposes read-only reconciliation of provider settlement, ledger status, entitlement state, webhook processing and receipt delivery.

## Deployment

The static Vercel artifact is produced with:

```sh
npm run build
```

Expected outputs include:

```text
Frontend/dist/index.html
Frontend/dist/admin/index.html
```

The optional API build is independent:

```sh
npm run build:api
```

Supabase database migrations and Edge Function deployment must target the Cresciva project declared in `supabase/config.toml`. Do not substitute another project when the intended project is unavailable to the current credentials.

Current active payment functions are `bachs-init`, `bachs-verify`, `bachs-webhook`, plus the admin-only `payment-reconciliation` function.

## Operations

Production-readiness status and non-secret environment evidence live under `docs/production-readiness/evidence/`.

The repository is still named `paullight1/scaleupafrica` even though the product is Cresciva. Repository renaming is an explicit operational decision and should only happen after Git/Vercel/automation integrations are inventoried.

## License & contact

The repository currently has no finalized public license or support/contact address recorded here. Those owner decisions remain launch-operations items; do not invent them in code or documentation.
