# Cresciva Production Environment & Release Inventory

Verified/updated: 2026-08-20
Repository: `paullight1/scaleupafrica`
Implementation branch: `docs/cresciva-production-readiness`
Default branch baseline at review: `main` → `8603e5ec2db6830263c97d0d556ac31e390d51ac`

This file records identifiers and verification state only. **No secret values belong here.**

## 1. Declared application topology

| Item | Repository contract | External verification |
| --- | --- | --- |
| Product | Cresciva | Source verified |
| Public origin | `https://cresciva.vercel.app` | Declared in `config/site-origin.js`; live Vercel project not visible to connected Vercel account |
| Admin | same origin, `/admin/` | Source/build routing verified; live deployment not independently verified |
| Production Git branch | `main` | Repository default branch verified |
| Supabase project ref | `dwyglydswegyvjowzdot` | Repository + publishable frontend config agree; connected Supabase account cannot see this project |
| Payment provider | Bachs | Source integration + current public Bachs docs verified; Bachs merchant account not connected |
| Bachs membership model | one-time annual entitlement | Source verified; no auto-renew |
| NestJS API | optional/domain-by-domain cutover | Source verified; deployment status unverified |
| Repository name | `paullight1/scaleupafrica` | Verified; product is Cresciva |

### Repository naming decision

**Decision: defer repository rename until after production launch certification.**

Reason: renaming is not a product blocker, while doing it before Vercel/GitHub automation is fully visible creates unnecessary integration risk. If renamed later, inventory Vercel Git linkage, local remotes, badges, webhooks and automations first; GitHub redirects should then be verified after the rename.

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

## 4. Supabase Edge Function secret contract

Required/potential variables; **presence cannot be verified with the currently connected Supabase account** because it does not expose project `dwyglydswegyvjowzdot`.

| Variable | Required by | Verification |
| --- | --- | --- |
| `SUPABASE_URL` | Edge Functions | unverified live |
| `SUPABASE_ANON_KEY` | authenticated Edge calls | unverified live |
| `SUPABASE_SERVICE_ROLE_KEY` | server ledger/admin operations | unverified live |
| `BACHS_SECRET_KEY` | Bachs API calls | unverified live |
| `BACHS_BASE_URL` | sandbox/live origin selection | unverified live |
| `BACHS_WEBHOOK_SIGNING_SECRET` | webhook HMAC | unverified live |
| `BACHS_ORGANIZATION_ID` | optional account pin | unverified live |
| `APP_URL` | Bachs callback origin | unverified live |
| `LOVABLE_API_KEY` | current funding AI gateway | unverified live |
| `RESEND_API_KEY` | email | unverified live |
| `EMAIL_FROM` | email identity | unverified live |
| `EMAIL_TEAM_INBOX` | internal notifications | unverified live |
| `EMAIL_TOKEN_SECRET` | unsubscribe token signing | unverified live |

## 5. Active Supabase function contract

Repository `supabase/config.toml` currently declares:

| Function | JWT |
| --- | --- |
| `bachs-init` | required |
| `bachs-verify` | required |
| `bachs-webhook` | disabled; function authenticates Bachs via signed raw-body webhook |
| `payment-reconciliation` | required + explicit admin-role check |
| `send-email` | disabled; function owns public-form validation/throttle |
| `email-unsubscribe` | disabled; token-authenticated |

`aggregate-funding` uses normal authenticated-user validation in its function body and remains part of CI Deno checks.

Legacy Paystack function code/config has been removed from the production-readiness branch.

## 6. Bachs contract

Repository implementation follows the current Bachs public integration contract:

- sandbox base URL: `https://sandbox-api.bachs.io` with `sk_sandbox_…` key;
- live base URL: `https://api.bachs.io` with `sk_live_…` key;
- amounts cross the provider boundary as decimal strings;
- POST checkout creation uses `Idempotency-Key`;
- webhook verification uses timestamp + exact raw body with HMAC-SHA256;
- fulfillment authority is `collection.succeeded`, not a browser redirect and not `checkout.completed`;
- the internal Cresciva ledger revalidates amount/currency before `grant_annual_access`.

### Required Bachs dashboard configuration (not connected here)

Webhook endpoint:

```text
https://dwyglydswegyvjowzdot.supabase.co/functions/v1/bachs-webhook
```

Required settlement/audit events:

```text
collection.succeeded
collection.failed
collection.underpaid
checkout.expired
checkout.completed   # audit only; never fulfillment
```

Callback is produced by `bachs-init` from `APP_URL` and includes Bachs' `{CHECKOUT_ID}` placeholder.

Status: **merchant/dashboard configuration unverified**.

## 7. Supabase connector evidence

Connected Supabase account visible in this conversation currently exposes only:

- `turnpay` (`gkpueopmdlqlfbvrzuqh`)
- `edutu.ai` (`sioxocmrjmdevsdlzjns`)

It does **not** expose Cresciva project `dwyglydswegyvjowzdot`.

Consequences:

- migration history cannot be compared to production from this connector;
- Edge Function deployment/version cannot be verified or changed safely;
- production advisors cannot be run against Cresciva;
- Bachs/Resend/Auth secrets cannot be checked.

Do not substitute either visible project for Cresciva.

## 8. Vercel connector evidence

Connected Vercel account/team:

```text
team_0m722looHPylaECSCKh2f6oa
```

Current project listing from that team: **0 projects**.

Consequences:

- the Cresciva Vercel project ID/domain mapping is not available through this connection;
- preview/prod environment values cannot be independently inspected here;
- production deployment/rollback cannot be exercised here.

This does not prove Cresciva is undeployed; it proves only that the connected Vercel scope does not expose it.

## 9. GitHub CI and branch governance

Repository implementation now contains `.github/workflows/ci.yml` with:

- `npm ci`;
- root `npm run verify` (lint → typecheck → tests → Frontend/Admin build → Backend build);
- Deno checks for active Edge Function entry points;
- artifact existence assertions;
- visible non-blocking production dependency audit;
- blocking Gitleaks history scan.

The GitHub connector's combined-status endpoint currently exposes no status records for the branch commits, so a real successful Actions run has **not been independently observed from this session**.

`main` was re-read on 2026-08-20 and currently reports:

```text
protected: false
required status checks: off
```

The connected GitHub action surface available here has no branch-protection/ruleset write action. Enabling required checks therefore remains an external repository-settings action.

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
- Google authorized origins/redirects include the official Cresciva host and reset callback;
- no obsolete ScaleUp Africa host remains in auth configuration;
- Resend sending identity is Cresciva;
- contact acknowledgement, newsletter welcome/unsubscribe and payment receipt links use the official origin;
- SPF/DKIM/DMARC are valid for the chosen sending domain.

## 11. Gate status

### Phase 2 — CI / release governance

Repository implementation: **PASS**

External proof still required:

- observe one successful GitHub Actions `verify` run;
- enable and prove `main` branch protection/ruleset;
- independently verify preview → production promotion and rollback on the actual Vercel project.

`PHASE 2 RELEASE GATE: BLOCKED_EXTERNAL`

### Phase 3 — production environment / domains / secrets

Repository implementation: **PASS**

External proof still required:

- authorized access to Supabase project `dwyglydswegyvjowzdot`;
- migration and Edge Function deployment comparison;
- Bachs sandbox/live dashboard + webhook/secret alignment;
- actual Vercel project/domain/env inventory;
- live OAuth/email identity smoke tests.

`PHASE 3 RELEASE GATE: BLOCKED_EXTERNAL`
