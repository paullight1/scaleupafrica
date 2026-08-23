# Cresciva Production Launch Roadmap

> **Baseline:** `main` at `8603e5ec2db6830263c97d0d556ac31e390d51ac` on 2026-08-20.  
> **Working branch:** `docs/cresciva-production-readiness`  
> **Purpose:** harden the existing Cresciva platform for a public paid launch while keeping deployment/merge as explicit operator gates.

## 1. Current verdict

Cresciva is a substantial production candidate. Repository-side implementation now covers the payment ledger/Bachs flow, funding recommendation and source-intelligence engines, account lifecycle/data rights, security contracts, release checks, Backend cutover controls, web-quality budgets, observability primitives, support workflows and launch/incident runbooks.

The remaining blockers are **live/operator evidence**, not missing core repository features: production Supabase/Vercel/provider configuration, real Bachs checks, browser/device/performance validation, Funding Intelligence live-source certification, monitoring activation, legal/entity sign-off and final production smoke/rollback evidence.

## 2. Phase status

| Phase | Repository status | Live/operator status |
| ---: | --- | --- |
| 1 Payment Reliability | **COMPLETE** | Bachs/Supabase real sandbox/live certification deferred |
| 2 CI & Release Governance | **COMPLETE** | required-status/main protection/rate-limited hosted CI proof deferred |
| 3 Production Environment | **COMPLETE** | real Supabase/Vercel/Bachs/OAuth/email topology verification deferred |
| 4 Supabase Security & Data Integrity | **COMPLETE** | live advisors/query-plan/restore rehearsal deferred |
| 5 Funding Provenance & Verification | **COMPLETE** | live source population/schedules/certification corpus execution deferred |
| 6 Backend/API Cutover | **COMPLETE** | Backend deployment/domain parity observation deferred; launch remains Supabase-first by default |
| 7 Web Quality/A11y/Performance/SEO | **COMPLETE** | real browser/device/Lighthouse/Web Vitals/crawler matrix deferred |
| 8 Observability/Analytics/Abuse/Cost | **COMPLETE** | monitoring projects, alert destinations and fire drills deferred |
| 9 Legal/Privacy/Support | **COMPLETE** | qualified counsel/entity/provider-support identity sign-off deferred |
| 10 Launch Certification/DR | **COMPLETE (repository package)** | final production GO/NO-GO remains deferred until operator live checklist is evidenced |

## 3. Repository capabilities now implemented

Do not reopen these as missing unless regression evidence appears:

- Cresciva branding and one canonical public-origin contract.
- Full auth/account recovery/dashboard lifecycle and contact visibility controls.
- Bachs recurring monthly/quarterly/annual checkout, signed lifecycle webhooks, replay/idempotency controls, verified callback, atomic invoice settlement and reconciliation.
- Verified-first Funding Radar, Business Enrichment, current-cycle status engine, deterministic eligibility/ranking, AI discoveries kept unverified, member workflow/alerts and certification/evaluation harnesses.
- Funding source registry/refresh and in-product funding correction reports with staff triage.
- Database-backed scalable directory and public profile pages.
- Supabase authorization matrix, privileged-function contract, retention model and restore runbook.
- Backend fail-fast production CORS and dependency-aware readiness; Supabase-first API-domain rollback strategy.
- Route lazy-loading, reduced-motion/SEO/sitemap/OG infrastructure and built-output gzip/metadata quality budgets.
- Redacting structured log primitives plus payment/funding/email operational alert contract.
- Account data export and recent-auth destructive deletion with profile-media cleanup, operational-data sanitization and detached minimal payment ledger retention.
- Current Terms/Privacy copy aligned to Bachs, funding trust semantics and data rights.
- Payment/funding-correction/support/release/incident-response runbooks.
- `npm run verify:release` static launch-invariant check.

## 4. Phase files

| Phase | Plan |
| ---: | --- |
| 1 | `01-PAYMENT-RELIABILITY-LEDGER.md` |
| 2 | `02-CI-RELEASE-GOVERNANCE.md` |
| 3 | `03-PRODUCTION-ENV-DOMAINS-SECRETS.md` |
| 4 | `04-SUPABASE-SECURITY-DATA-INTEGRITY.md` |
| 5 | `05-FUNDING-PROVENANCE-VERIFICATION.md` |
| 6 | `06-BACKEND-API-PRODUCTION-CUTOVER.md` |
| 7 | `07-WEB-QUALITY-A11Y-PERFORMANCE-SEO.md` |
| 8 | `08-OBSERVABILITY-ANALYTICS-ABUSE-COST.md` |
| 9 | `09-LEGAL-PRIVACY-SUPPORT-OPERATIONS.md` |
| 10 | `10-LAUNCH-CERTIFICATION-DR-GO-NO-GO.md` |

Funding Intelligence P0 and engine documentation live under `docs/product/`, `docs/superpowers/specs/` and `docs/superpowers/plans/` and are part of Phase 5's completed repository scope.

## 5. Repository verification contract

Primary command:

```bash
npm run verify
```

It covers workspace lint/typecheck/tests, production web/admin assembly, built-output web-quality budgets, Backend build and repository release invariants.

Funding Intelligence changes also have dedicated certification/evaluation workflows and benchmark scripts in the repository.

The operator chose to skip hosted CI/Vercel rate-limit delays during implementation. A hosted check that is missing/rate-limited is therefore **not** treated as repository implementation work, but it must be run/replaced with equivalent clean-checkout evidence before a real production GO.

## 6. Non-negotiable trust rules

1. Browser redirects/screenshots never grant paid access; verified provider settlement + Cresciva ledger do.
2. AI discoveries never self-promote to verified/current funding.
3. `Apply now` requires verified/fresh source evidence, current open/closing-soon/rolling state, eligible member state and official application URL.
4. Unknown/stale funding state cannot masquerade as Open.
5. Member funding corrections trigger staff/source review, not direct truth mutation.
6. Public directory paths cannot expose private contact/payment/member data.
7. Production Backend domains are opt-in and reversible; disabled domains remain on the Supabase path.
8. Privileged account deletion/payment/security actions remain server-side.

## 7. Evidence directory

Key records now include:

- `environment-inventory.md`
- `payment-certification.md`
- `supabase-security-review.md`
- `funding-provenance-review.md`
- `funding-intelligence-certification.md`
- `backend-cutover.md`
- `web-quality-report.md`
- `observability-alerts.md`
- `legal-support-readiness.md`
- `restore-runbook.md`
- `launch-decision.md`

Evidence contains outcomes/identifiers, never secret values, private keys, raw credentials or unnecessary PII.

## 8. Operator live checklist

The authoritative remaining work is in `docs/production-readiness/evidence/launch-decision.md` and `docs/operations/RELEASE.md`. It includes:

- clean-checkout verification;
- live migrations/advisors/backups;
- Bachs/payment checks;
- domain/OAuth/email configuration;
- funding source/scheduler population and accuracy thresholds;
- browser/performance/accessibility checks;
- monitoring/on-call activation;
- legal/entity/support identity review;
- production smoke and rollback evidence.

## 9. Final launch state

Repository implementation/hardening for Phases 1–10: **COMPLETE**.

Production deployment/certification: **NO-GO / DEFERRED TO OPERATOR** until the live checklist has evidence.

Do not change the final decision to GO because code exists or because a deployment reports green. Change it only after the live checks in `launch-decision.md` pass for the release being shipped.
