# Cresciva

Cresciva is a Pan-African SME platform: a public, searchable directory where founders publish one credible business profile, plus membership-gated funding intelligence for African SMEs. Browsing the directory is free and open; the Funding Radar is available to members with an active recurring membership.

## Stack

- **Frontend:** Vite + React 18 + TypeScript, shadcn/ui (Radix + Tailwind CSS), React Router, TanStack Query, Framer Motion.
- **Admin:** a separate Vite/React app assembled under `/admin/` in the production artifact.
- **Backend today:** Supabase Auth, Postgres/RLS, Storage and Deno Edge Functions.
- **Payments:** Bachs recurring product checkout, signed lifecycle webhooks, customer billing portal, and a Cresciva-owned payment/entitlement ledger. Plans are $10/month, $25/3 months, or $90/year and renew automatically until canceled.
- **Funding intelligence:** deterministic profile recommendations over the curated feed, verified-first opportunity search, and AI-assisted long-tail discovery that is always labelled unverified until source verification upgrades it.
- **API server:** NestJS + Drizzle under `Backend/`, introduced behind domain-by-domain cutover flags.
- **Testing:** Vitest + Testing Library; GitHub Actions also typechecks Supabase Edge Functions with Deno.

## Getting started

**Prerequisite:** Node.js 22+.

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

It runs linting, TypeScript checks, all workspace tests, the assembled Frontend/Admin production build, and the Backend production build. CI runs the same contract and additionally Deno-checks the active Edge Function entry points.

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

## Funding intelligence

The Funding Radar now separates two engines:

- **Recommendation Engine:** member profile → conservative hard eligibility → deterministic 0–100 match score → separate confidence score → explanations → ranked curated feed.
- **Opportunity Search Engine:** explicit query → deterministic search of published Cresciva opportunities → optional AI-assisted long-tail fallback → verified-first dedupe and trust-labelled results.

The AI fallback is not allowed to create a verified state. Verified and stale states come from Cresciva's curated opportunity records; AI output is forced to `ai_assisted` + `unverified` after schema validation.

Operational documentation:

- `docs/product/RECOMMENDATION-ENGINE.md`
- `docs/product/OPPORTUNITY-SEARCH-ENGINE.md`

The full provenance/source-ingestion roadmap remains in `docs/production-readiness/05-FUNDING-PROVENANCE-VERIFICATION.md`.

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

### Supabase Edge Function secrets/config

Never commit these values:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BACHS_SECRET_KEY
BACHS_BASE_URL
BACHS_WEBHOOK_SIGNING_SECRET
BACHS_ORGANIZATION_ID       # recommended provider/account pin
BACHS_MONTHLY_PRODUCT_USD   # recurring product, exact $10/month price
BACHS_QUARTERLY_PRODUCT_USD # recurring product, exact $25/3 months price
BACHS_ANNUAL_PRODUCT_USD    # recurring product, exact $90/year price
APP_URL                     # official Cresciva web origin used for checkout return/cancel URLs
LOVABLE_API_KEY             # current funding AI gateway key; verified-only search still works without it
RESEND_API_KEY
EMAIL_FROM
EMAIL_TEAM_INBOX
EMAIL_TOKEN_SECRET
```

Bachs environments must not be mixed:

- sandbox API: `https://sandbox-api.bachs.io` with an `sk_sandbox_…` key
- live API: `https://api.bachs.io` with an `sk_live_…` key

The code rejects a Bachs key/base-URL environment mismatch.

Each `BACHS_*_PRODUCT_USD` variable must point to a **recurring Bachs product** with the matching billing cycle and exact Cresciva price. Sandbox/live product IDs may differ and must be deployed with the matching Bachs key environment. Bachs recurring billing currently settles these memberships in USD.

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
docs/product/             product-engine operating documentation
docs/production-readiness launch-hardening plans and evidence
```

## Payment flow

1. A signed-in user selects the monthly, quarterly, or annual USD plan.
2. `bachs-init` resolves the canonical $10/$25/$90 amount and selects the configured recurring Bachs product.
3. Cresciva creates the internal `payments` row first, then creates a Bachs hosted checkout with `product_cart`, `billing_currency`, a stable idempotency key, and metadata containing the internal reference/user/plan.
4. The browser redirects to Bachs.
5. Bachs returns to `<APP_URL>/payment/callback?reference=<crv_…>`. The reference is only a lookup key; the redirect is not payment proof.
6. The callback posts `{ reference }` to `bachs-verify`, which reports checkout state but never grants access from the browser redirect.
7. `bachs-webhook` syncs subscription lifecycle events and treats `invoice.paid` as the authoritative asynchronous settlement path. It validates exact USD amount/status before extending access.
8. `record_bachs_invoice_paid(...)` atomically records the invoice and extends access through the paid period; failed invoices never extend access.
9. `bachs-portal` creates a hosted Bachs billing-management session for authenticated members.
10. `/admin/payments` exposes read-only reconciliation of provider settlement, ledger status, entitlement state, webhook processing and receipt delivery.

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

Current active payment functions are `bachs-init`, `bachs-verify`, `bachs-webhook`, `bachs-portal`, plus the admin-only `payment-reconciliation` function.

## Operations

Production-readiness status and non-secret environment evidence live under `docs/production-readiness/evidence/`.

The repository is still named `paullight1/scaleupafrica` even though the product is Cresciva. Repository renaming is an explicit operational decision and should only happen after Git/Vercel/automation integrations are inventoried.

## License & contact

The repository currently has no finalized public license or support/contact address recorded here. Those owner decisions remain launch-operations items; do not invent them in code or documentation.
