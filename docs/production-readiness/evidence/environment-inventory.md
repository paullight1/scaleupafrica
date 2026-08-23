# Cresciva Production Environment & Release Inventory

Verified/updated: 2026-08-23
Repository: `paullight1/scaleupafrica`
Implementation branch: `docs/cresciva-production-readiness`
Default branch baseline at review: `main` → `8603e5ec2db6830263c97d0d556ac31e390d51ac`

This file records identifiers and verification state only. **No secret values belong here.**

## 1. Declared application topology

| Item | Repository contract | External verification |
| --- | --- | --- |
| Product | Cresciva | Source verified |
| Public origin | `https://cresciva.vercel.app` | Single-source repository contract; actual Vercel project not visible to connected Vercel account |
| Admin | same origin, `/admin/` | Source/build routing verified; live deployment not independently verified |
| Production Git branch | `main` | Repository default branch verified |
| Supabase project ref | `fqragjhmunphhdnmvpgs` | Repository + publishable frontend config agree; read-only CLI verification succeeded |
| Payment provider | Bachs | Source integration + current public Bachs docs verified; Bachs merchant account not connected |
| Bachs membership model | recurring monthly/quarterly/annual subscription | Source verified; auto-renews until canceled |
| NestJS API | optional/domain-by-domain cutover | Source verified; deployment status unverified |
| Repository name | `paullight1/scaleupafrica` | Verified; product is Cresciva |

### Repository naming decision

**Decision: defer repository rename until after production launch certification.**

Reason: renaming is not a product blocker, while doing it before Vercel/GitHub automation is fully visible creates unnecessary integration risk. If renamed later, inventory Vercel Git linkage, local remotes, badges, webhooks and automations first; verify redirects/integrations afterwards.

## 2. Public-origin contract

`config/site-origin.js` owns the default production-origin literal.

Consumers:

- `Shared/src/lib/siteMeta.ts`
- `Frontend/vite.config.ts`
- `scripts/generate-sitemap.mjs`

The repository test `Shared/src/test/site-origin-contract.test.ts` guards against duplicating the literal in those consumers and rejects remote HTTP origins or origin strings containing paths/query/fragments.

Deployment override: `VITE_SITE_ORIGIN`.

Operational rule: `APP_URL` used by Bachs checkout creation must equal the official public origin for that environment.

## 3. Browser/public environment variables

These variables are allowed in web builds because they are intentionally publishable/client-side.

| Variable | Frontend source evidence | Admin source evidence | Live deployment |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | present | present | unverified |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | present | present | unverified |
| `VITE_SUPABASE_PROJECT_ID` | present | present | unverified |
| `VITE_SITE_ORIGIN` | optional override | n/a | unverified |
| `VITE_ADMIN_URL` | optional | n/a | unverified |
| `VITE_SITE_URL` | n/a | optional | unverified |
| `VITE_API_URL` | optional API cutover | n/a | unverified |
| `VITE_API_DOMAINS` | optional API cutover | n/a | unverified |

Tracked `Frontend/.env` and `AdminPanel/.env` contain only the Supabase publishable configuration. Server-side secrets are excluded by `.gitignore` and CI includes a history secret scan.

## 4. Supabase Edge Function secret/config contract

Required/potential variables; Supabase CLI verification reached the configured project. Bachs recurring secret/product names are present in the remote secret list; values remain secret and product prices/cycles still require merchant-side verification.

| Variable | Required by | Verification |
| --- | --- | --- |
| `SUPABASE_URL` | Edge Functions | unverified live |
| `SUPABASE_ANON_KEY` | authenticated Edge calls | unverified live |
| `SUPABASE_SERVICE_ROLE_KEY` | server ledger/admin operations | unverified live |
| `BACHS_SECRET_KEY` | Bachs API calls | unverified live |
| `BACHS_BASE_URL` | sandbox/live origin selection | unverified live |
| `BACHS_WEBHOOK_SIGNING_SECRET` | webhook HMAC | unverified live |
| `BACHS_ORGANIZATION_ID` | optional account pin | unverified live |
| `BACHS_MONTHLY_PRODUCT_USD` | recurring USD monthly membership product priced at $10 | unverified live |
| `BACHS_QUARTERLY_PRODUCT_USD` | recurring USD quarterly membership product priced at $25 | unverified live |
| `BACHS_ANNUAL_PRODUCT_USD` | recurring USD annual membership product priced at $90 | unverified live |
| `APP_URL` | Bachs return/cancel origin | unverified live |
| `LOVABLE_API_KEY` | current funding AI gateway | unverified live |
| `RESEND_API_KEY` | email | unverified live |
| `EMAIL_FROM` | email identity | unverified live |
| `EMAIL_TEAM_INBOX` | internal notifications | unverified live |
| `EMAIL_TOKEN_SECRET` | unsubscribe token signing | unverified live |

### Bachs product requirements

All configured Bachs product IDs must reference recurring products with the correct billing cycle. Their configured prices must exactly match Cresciva's canonical plan prices. Sandbox/live product IDs may differ and must be paired with the corresponding Bachs key environment.

## 5. Active Supabase function contract

Repository `supabase/config.toml` currently declares:

| Function | JWT |
| --- | --- |
| `bachs-init` | deployed 2026-08-23; JWT required |
| `bachs-verify` | deployed 2026-08-23; JWT required |
| `bachs-webhook` | deployed 2026-08-23; JWT disabled; authenticates Bachs via signed raw-body webhook |
| `bachs-portal` | deployed 2026-08-23; JWT required |
| `payment-reconciliation` | required + explicit admin-role check |
| `send-email` | disabled; function owns public-form validation/throttle |
| `email-unsubscribe` | disabled; token-authenticated |

`aggregate-funding` remains part of CI Deno checks and performs its own authenticated/member checks.

Legacy Paystack function code/config has been removed from the production-readiness branch.

## 6. Bachs contract

Repository implementation follows the current Bachs public integration contract:

- sandbox base URL: `https://sandbox-api.bachs.io` with `sk_sandbox_…` key;
- live base URL: `https://api.bachs.io` with `sk_live_…` key;
- checkout sessions are product-based (`product_cart` + `billing_currency`);
- membership products are recurring USD products: $10/month, $25/3 months, and $90/year;
- provider money values are decimal strings; Cresciva retains integer subunits internally;
- POST checkout creation uses a stable `Idempotency-Key`;
- return URL contains Cresciva's internal `reference`;
- Bachs checkout metadata also carries `cresciva_reference` as a server-side correlation backstop;
- webhook verification uses timestamp + exact raw body with HMAC-SHA256;
- fulfillment authority is `invoice.paid`, not browser redirect and not `checkout.completed`;
- internal ledger revalidates exact amount/currency before extending access.

### Required Bachs dashboard configuration (not connected here)

Webhook endpoint:

```text
https://fqragjhmunphhdnmvpgs.supabase.co/functions/v1/bachs-webhook
```

Required settlement/audit events:

```text
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.created
invoice.paid
invoice.payment_failed
checkout.completed   # audit only; never fulfillment
```

Bachs checkout return URL is generated by `bachs-init` as:

```text
<APP_URL>/payment/callback?reference=<crv_...>
```

The callback posts that reference to `bachs-verify`. Verification recovers the linked provider `checkout_id` from Cresciva's ledger and re-fetches Bachs server-side; the redirect itself is never fulfillment authority.

Status: **merchant/dashboard/product configuration unverified**.

## 7. Supabase connector evidence

The configured Cresciva project `fqragjhmunphhdnmvpgs` was reachable through the Supabase CLI on 2026-08-23.

Read-only findings:

- the duration-aware `grant_membership_access` RPC is present and service-role executable;
- the payment/subscription/webhook tables have the required plan fields;
- Bachs functions were deployed on 2026-08-23;
- Bachs recurring secret/product names are present in the remote secret list; values remain secret and product prices/cycles still require merchant-side verification;
- remote migration history contains versions missing from this checkout, so normal migration push is blocked pending reconciliation.

## 8. Vercel connector evidence

Connected Vercel account/team:

```text
team_0m722looHPylaECSCKh2f6oa
```

Current project listing from that team: **0 projects**.

Consequences:

- Cresciva Vercel project ID/domain mapping is not available through this connection;
- preview/prod environment values cannot be independently inspected here;
- production deployment/rollback cannot be exercised here.

This does not prove Cresciva is undeployed; it proves only that the connected Vercel scope does not expose it.

## 9. GitHub CI and branch governance

Repository implementation contains `.github/workflows/ci.yml` with:

- `npm ci`;
- root `npm run verify` (lint → typecheck → tests → Frontend/Admin build → Backend build);
- Deno checks for active Edge Function entry points;
- artifact existence assertions;
- visible non-blocking production dependency audit;
- blocking Gitleaks history scan.

A fresh real Actions run is required for pass evidence; the local ChatGPT container cannot clone from GitHub because external DNS is unavailable.

`main` was re-read on 2026-08-20 and reports:

```text
protected: false
required status checks: off
```

The connected GitHub action surface available here does not expose a branch-protection/ruleset write action.

### Required `main` rules once the first CI check is visible

- require pull request before merge;
- require exact CI verification status exposed by GitHub Actions;
- block force push;
- block deletion;
- routine bypass disabled;
- require up-to-date branch where practical.

## 10. OAuth and email identity

Source code contains Google OAuth/reset support and transactional email flows, but production provider configuration is **unverified** because the intended Supabase/Vercel projects are not connected here.

Before launch, externally verify:

- Supabase Auth Site URL == official Cresciva production origin;
- Google authorized origins/redirects include official Cresciva host and reset callback;
- no obsolete ScaleUp Africa host remains in auth configuration;
- Resend sending identity is Cresciva;
- contact acknowledgement, newsletter welcome/unsubscribe and payment receipt links use official origin;
- SPF/DKIM/DMARC are valid for chosen sending domain.

## 11. Gate status

### Phase 1 — Bachs payment reliability

Repository implementation: **implemented; final repository proof depends on Phase 2 CI**.

External proof required: sandbox/live Bachs products/secrets plus deployment access to Cresciva Supabase.

`PHASE 1 RELEASE GATE: BLOCKED_EXTERNAL`

### Phase 2 — CI / release governance

Repository implementation: **implemented**.

External proof required:

- observe one successful GitHub Actions `verify` run;
- enable/prove `main` branch protection/ruleset;
- independently verify preview → production promotion and rollback on the actual Vercel project.

`PHASE 2 RELEASE GATE: BLOCKED_EXTERNAL`

### Phase 3 — production environment / domains / secrets

Repository implementation: **implemented**.

External proof required:

- authorized access to Supabase project `fqragjhmunphhdnmvpgs`;
- migration and Edge Function deployment comparison;
- Bachs sandbox/live dashboard, products, webhook and secret alignment;
- actual Vercel project/domain/env inventory;
- live OAuth/email identity smoke tests.

`PHASE 3 RELEASE GATE: BLOCKED_EXTERNAL`
