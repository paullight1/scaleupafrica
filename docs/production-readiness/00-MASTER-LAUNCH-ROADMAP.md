# Cresciva Production Launch Roadmap

> **Baseline:** `main` at `8603e5ec2db6830263c97d0d556ac31e390d51ac` on 2026-08-20.  
> **Design:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`  
> **Purpose:** harden and certify the existing Cresciva platform for a public paid launch.

## 1. Current verdict

Cresciva is a substantial production candidate, not an early prototype. The repository already includes four npm workspaces, Supabase/Auth/Postgres/Storage/Edge Functions, a NestJS + Drizzle API, Paystack payment flows, a member dashboard, a scalable SME directory, funding intelligence, an admin panel, email infrastructure, legal/content pages, route-level lazy loading, SEO infrastructure, and hundreds of automated tests recorded in recent implementation history.

The remaining risk is concentrated in **operational correctness and release proof**, not missing product screens.

### Launch-blocking findings

| Severity | Finding | Why it blocks launch |
| --- | --- | --- |
| P0 | Paystack webhook acknowledges all event-insert errors as duplicate | A real DB failure can be returned as 200, preventing Paystack retry and losing settlement work |
| P0/P1 | No required CI/status checks and `main` is unprotected | Broken code can reach production without a deterministic gate |
| P1 | Root build/lint omit `Backend` | A web deployment can be green while API code is broken |
| P1 | Live Cresciva Supabase deployment cannot be verified from the currently connected account | Source code cannot prove migrations, functions, secrets, OAuth, or backups are live |
| P1 | Funding deep search still relies on model memory for source truth | “Verified/current” funding needs source provenance and freshness evidence |
| P1 | Canonical origin fallback is repeated and defaults to `https://cresciva.vercel.app` | Domain, callback, SEO, email, OAuth and CORS identity can drift |
| P1/P2 | TypeScript strictness remains disabled in frontend and backend | Type safety is improving but still permits broad regression classes |
| P2 | README still has unresolved license/support-contact ownership | Public paid product needs an operational legal/support identity |

## 2. What is already solved

Do **not** reopen these as if they were missing unless regression evidence appears:

- Cresciva branding in package metadata, README, frontend metadata, OG assets and runtime SEO.
- Forgot/reset password routes.
- Authenticated dashboard and global layout.
- Public profile detail pages.
- Database-backed directory search, facets and infinite pagination.
- Anonymous contact-field column restrictions and contact visibility flags.
- Paystack server-side initialization and callback verification.
- Atomic annual-access grant RPC and payment audit tables.
- Funding subscription gate, seven-day cache, rate limit, timeout and output validation.
- Transactional email with validation, honeypot and hashed-IP throttling.
- Legal/content routes.
- Reduced-motion handling and meaningful route-level lazy loading.
- Admin role RPC with explicit authorization and MFA step-up when enrolled.

The historical `IMPROVEMENTS.md` should remain an archive until it is replaced by a current post-launch backlog; it must not be treated as the present P0/P1 list.

## 3. Phase sequence

| Phase | File | Gate | Launch severity |
| ---: | --- | --- | --- |
| 1 | `01-PAYMENT-RELIABILITY-LEDGER.md` | No settlement can be silently lost; payment/entitlement paths reconcile | P0 |
| 2 | `02-CI-RELEASE-GOVERNANCE.md` | Every change passes web/admin/shared/backend checks before merge/deploy | P0/P1 |
| 3 | `03-PRODUCTION-ENV-DOMAINS-SECRETS.md` | Live topology, domains, callbacks, functions and secrets are evidenced | P1 |
| 4 | `04-SUPABASE-SECURITY-DATA-INTEGRITY.md` | RLS, grants, migrations, advisors, backup/restore and data boundaries pass | P1 |
| 5 | `05-FUNDING-PROVENANCE-VERIFICATION.md` | Verified opportunities have source provenance/freshness and review workflow | P1 |
| 6 | `06-BACKEND-API-PRODUCTION-CUTOVER.md` | Enabled API domains have deploy/health/rollback evidence; disabled domains remain safe | P1 |
| 7 | `07-WEB-QUALITY-A11Y-PERFORMANCE-SEO.md` | Critical web journeys pass mobile, accessibility, SEO and performance budgets | P1/P2 |
| 8 | `08-OBSERVABILITY-ANALYTICS-ABUSE-COST.md` | Payments, AI, email, errors and uptime are observable with actionable alerts | P1 |
| 9 | `09-LEGAL-PRIVACY-SUPPORT-OPERATIONS.md` | Company/support/legal/data-rights/payment-support operations are real | P1/P2 |
| 10 | `10-LAUNCH-CERTIFICATION-DR-GO-NO-GO.md` | End-to-end, failure, restore, rollback and launch smoke tests pass | Final gate |

## 4. Execution rules

1. **Work from current `main`.** Before starting a phase, rebase/merge the phase branch onto the latest accepted baseline and record the SHA in the phase evidence.
2. **Test first for defects.** Reproduce a bug/failure in an automated test before changing behavior.
3. **Never mark environment work complete from source code alone.** Record live URLs, deployed function versions/status, migration evidence, configuration screenshots/export where appropriate, and smoke results.
4. **No direct production entitlement mutation.** Payment access continues through the canonical grant routine.
5. **No broad service-role exposure.** Browser bundles contain only publishable client configuration.
6. **No unverified “current funding” claim.** Source-backed records and freshness metadata are required for verified status.
7. **One production origin contract.** Canonical, OG, sitemap, robots, Paystack callback, OAuth redirects, email links and API CORS must agree.
8. **A green Vercel deploy is not the CI gate.** CI must prove lint, test, typecheck/build expectations independently.
9. **Backend is never exempt from repository health.** Even if no API domain is enabled, its build/test/typecheck/lint must remain green.
10. **No P0 waiver.** P1 waivers require a written mitigation, owner and expiry in the final decision log.

## 5. Target repository verification command

Phase 2 should make this one command authoritative:

```bash
npm run verify
```

It should expand to, at minimum:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run build:api
```

`typecheck` and lint scripts must cover `Frontend`, `AdminPanel`, `Shared` where applicable, and `Backend`. The GitHub Actions workflow must run `npm ci` before `npm run verify`.

## 6. Release evidence directory

Implementation should create and maintain:

```text
docs/production-readiness/evidence/
  README.md
  environment-inventory.md
  payment-certification.md
  supabase-security-review.md
  funding-provenance-review.md
  backend-cutover.md
  web-quality-report.md
  observability-alerts.md
  legal-support-readiness.md
  launch-decision.md
```

Evidence files contain outcomes and identifiers, not secrets. Never paste secret values, access tokens, private keys, full card/payment payloads or personal user data into git.

## 7. Definition of a completed phase

A phase is complete only when:

- all listed tasks are implemented;
- all new and existing automated tests pass;
- the phase-specific failure tests pass;
- required live-environment checks are executed where applicable;
- evidence is recorded without secrets/PII;
- P0/P1 review findings discovered during the phase are fixed before proceeding;
- the phase release gate is explicitly marked `PASS` in its evidence document.

## 8. Parallelism

Safe parallel work after Phase 2 establishes CI:

- Phase 3 environment inventory and Phase 7 web quality can proceed in parallel.
- Phase 4 data security and Phase 6 backend topology can proceed in parallel after the production target is known.
- Phase 5 funding provenance can proceed once Phase 4 confirms its database security boundary.
- Phase 8 observability follows the final topology from Phases 3/6 but frontend analytics work can start earlier.
- Phase 9 legal/support can run beside technical phases once the real production identity/contact channel is selected.

Phase 10 is intentionally serial and starts only after every other phase has a PASS or an approved non-P0 exception.

## 9. Final launch scorecard

The final decision log must score each area as `PASS`, `EXCEPTION`, or `FAIL`:

- Payment correctness
- Authentication/account lifecycle
- Supabase/RLS/data privacy
- Directory/profile privacy and scale
- Funding data provenance
- Backend/API health
- Frontend/admin build and route health
- Accessibility
- Performance/mobile readiness
- SEO/canonical/social sharing
- Email deliverability/abuse controls
- Observability/alerting
- Security controls
- Backup/restore
- Legal/privacy/support
- CI/release governance
- Production smoke tests

`FAIL` in any P0/P1 area means **NO-GO**.

## 10. Execution order

Start implementation with **Phase 1: Payment Reliability & Ledger Integrity**. Do not spend the first launch-hardening cycle on visual polish while a payment webhook can silently acknowledge an infrastructure failure.