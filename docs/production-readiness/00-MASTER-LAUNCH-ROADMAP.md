# Cresciva Production Launch Roadmap

> **Baseline:** `main` at `8603e5ec2db6830263c97d0d556ac31e390d51ac` on 2026-08-20.  
> **Design:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`  
> **Purpose:** harden and certify the existing Cresciva platform for a public paid launch.

## 1. Current verdict

Cresciva is a substantial production candidate, not an early prototype. The repository already includes four npm workspaces, Supabase/Auth/Postgres/Storage/Edge Functions, a NestJS + Drizzle API, Bachs hosted payments, a member dashboard, a scalable SME directory, funding intelligence, an admin panel, email infrastructure, legal/content pages, route-level lazy loading, SEO infrastructure, and broad automated test coverage.

The remaining risk is concentrated in **operational correctness and release proof**, not missing product screens.

### Launch-blocking findings

| Severity | Finding | Why it blocks launch |
| --- | --- | --- |
| P0 | Bachs payment path is implemented but has not been certified against the real Cresciva sandbox/live products, signing secret and Supabase deployment | Payment code cannot be called production-certified without real provider/deployment evidence |
| P0/P1 | GitHub Actions workflow exists but `main` is still externally reported unprotected and no required CI status is enforced | Broken code can still reach production without a mandatory repository gate |
| P1 | Connected Supabase scope cannot see Cresciva project `dwyglydswegyvjowzdot` | Source cannot prove migrations/functions/secrets/OAuth/backups are actually live |
| P1 | Connected Vercel team currently exposes zero projects | Production domain/env/preview/rollback configuration cannot be independently inspected |
| P1 | Funding Deep Search still needs source provenance/freshness before “verified/current” can be a high-trust claim | Model memory is not authoritative current funding data |
| P1/P2 | TypeScript strictness remains globally relaxed | Type safety is improving but still permits broader regression classes |
| P2 | License/support-contact ownership remains unresolved in operations | Paid public product needs a real support/legal identity |

## 2. What is already solved or implemented on the production-readiness branch

Do not reopen these as missing unless regression evidence appears:

- Cresciva branding in package metadata, README, runtime/static metadata, OG assets and admin identity.
- Forgot/reset password routes.
- Authenticated dashboard and global layout.
- Public profile detail pages.
- Database-backed directory search/facets/pagination.
- Anonymous contact-field restrictions and contact visibility controls.
- Bachs product-based hosted checkout with server-owned Cresciva pricing expectations.
- One-time annual Bachs product mapping for NGN/USD; no auto-renew semantics.
- Bachs signed webhook verification, timestamp replay window, bounded request body, event-ID dedupe and retry-safe unprocessed duplicate handling.
- Cresciva internal-reference callback verification backed by server-side Bachs retrieval.
- Atomic annual-access grant routine and payment audit/reconciliation surfaces.
- Legacy active Paystack payment code removed from the production-readiness branch.
- Funding subscription gate, cache, rate limit, timeout and output validation.
- Transactional email validation/throttling/audit.
- Legal/content routes.
- Route-level lazy loading and reduced-motion handling.
- Admin role RPC with explicit authorization/MFA step-up when enrolled.
- Root `npm run verify`, explicit workspace typechecks and GitHub Actions CI workflow.
- Single public-origin contract in `config/site-origin.js` shared by runtime metadata, Vite HTML and sitemap/robots.

## 3. Phase sequence

| Phase | File | Gate | Launch severity |
| ---: | --- | --- | --- |
| 1 | `01-PAYMENT-RELIABILITY-LEDGER.md` | Bachs settlement cannot be silently lost; payments/access reconcile; real sandbox configuration proven | P0 |
| 2 | `02-CI-RELEASE-GOVERNANCE.md` | Every change passes web/admin/shared/backend/edge checks and `main` requires the status | P0/P1 |
| 3 | `03-PRODUCTION-ENV-DOMAINS-SECRETS.md` | Live topology, origin, Bachs products/callbacks, functions, secrets, OAuth/email and rollback are evidenced | P1 |
| 4 | `04-SUPABASE-SECURITY-DATA-INTEGRITY.md` | RLS, grants, migrations, advisors, backup/restore and data boundaries pass | P1 |
| 5 | `05-FUNDING-PROVENANCE-VERIFICATION.md` | Verified opportunities have source provenance/freshness and review workflow | P1 |
| 6 | `06-BACKEND-API-PRODUCTION-CUTOVER.md` | Enabled API domains have deploy/health/rollback evidence; disabled domains remain safe | P1 |
| 7 | `07-WEB-QUALITY-A11Y-PERFORMANCE-SEO.md` | Critical web journeys pass mobile, accessibility, SEO and performance budgets | P1/P2 |
| 8 | `08-OBSERVABILITY-ANALYTICS-ABUSE-COST.md` | Payments, AI, email, errors and uptime are observable with actionable alerts | P1 |
| 9 | `09-LEGAL-PRIVACY-SUPPORT-OPERATIONS.md` | Company/support/legal/data-rights/payment-support operations are real | P1/P2 |
| 10 | `10-LAUNCH-CERTIFICATION-DR-GO-NO-GO.md` | End-to-end, failure, restore, rollback and launch smoke tests pass | Final gate |

## 4. Execution rules

1. **Work from the current accepted baseline.** Rebase/merge before each phase and record SHA in evidence.
2. **Evidence before completion claims.** Code present is not the same as a passing release gate.
3. **Never mark environment work complete from source alone.** Record live deploy/config/smoke evidence.
4. **No direct production entitlement mutation.** Paid access changes only through the canonical grant routine.
5. **No broad service-role exposure.** Browser bundles contain only publishable client configuration.
6. **No unverified “current funding” claim.** Verified status requires source/freshness evidence.
7. **One production origin contract.** Canonical/OG/sitemap/robots/Bachs `APP_URL`/OAuth/email/CORS must agree.
8. **Bachs webhooks are fulfillment authority.** Browser redirect and `checkout.completed` never grant access.
9. **Cresciva annual membership is one-time.** Bachs products used for membership must have no billing cycle.
10. **A green Vercel deployment is not the CI gate.** Repository checks are independent and required.
11. **Backend is never exempt from repository health.** Disabled API domains still require build/test/typecheck/lint health.
12. **No P0 waiver.** P1 exceptions require written mitigation, owner and expiry.

## 5. Repository verification contract

Authoritative repository command:

```bash
npm run verify
```

It expands to at least:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run build:api
```

GitHub Actions runs `npm ci` before this command, Deno-checks active Edge Function entry points, asserts built artifacts, scans history for secrets and surfaces the production dependency audit.

## 6. Release evidence directory

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

Evidence contains outcomes/identifiers, never secret values, tokens, private keys, full payment payloads or personal user data.

## 7. Definition of a completed phase

A phase is complete only when:

- planned repository work is implemented;
- all new/existing automated checks relevant to the phase pass in fresh evidence;
- phase-specific failure cases pass;
- required live-environment checks are executed when applicable;
- evidence is recorded without secrets/PII;
- newly discovered P0/P1 findings are fixed before progression;
- release gate is explicitly marked `PASS`.

If repository work is complete but required external access is unavailable, use `BLOCKED_EXTERNAL`, not `PASS`.

## 8. Parallelism

Safe parallel work after Phase 2 establishes CI:

- Phase 3 environment inventory and Phase 7 web quality can proceed in parallel.
- Phase 4 data security and Phase 6 backend topology can proceed in parallel after the production target is known.
- Phase 5 funding provenance starts once Phase 4 confirms database security boundaries.
- Phase 8 observability follows final topology, though frontend analytics can start earlier.
- Phase 9 legal/support can proceed once real production identity/contact channels are selected.

Phase 10 remains serial and starts only after all prior phases are PASS or have an explicitly approved non-P0 exception.

## 9. Final launch scorecard

The final decision log scores each area `PASS`, `EXCEPTION` or `FAIL`:

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

## 10. Current Phase 1–3 state

- **Phase 1 repository work:** implemented; external Bachs/Supabase sandbox certification still required.
- **Phase 2 repository work:** implemented; real PR CI + `main` protection + Vercel promotion/rollback proof still required.
- **Phase 3 repository work:** implemented; actual Cresciva Supabase/Vercel/Bachs/OAuth/email environment verification still required.

The corresponding evidence files deliberately remain `BLOCKED_EXTERNAL` until those live checks can be performed.
