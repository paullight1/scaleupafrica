# Cresciva Production Readiness Design

**Date:** 2026-08-20  
**Baseline:** `main` at `8603e5ec2db6830263c97d0d556ac31e390d51ac`  
**Product:** Cresciva  
**Repository:** `paullight1/scaleupafrica`

## 1. Purpose

Cresciva is no longer an early Lovable prototype. The current repository is a four-workspace npm monorepo (`Frontend`, `AdminPanel`, `Shared`, `Backend`) with Supabase Auth/Postgres/Storage/Edge Functions, a NestJS + Drizzle API path, Paystack payments, member-gated funding intelligence, an SME directory, content/admin tooling, transactional email, route-level code splitting, SEO infrastructure, and a substantial automated test suite.

The remaining work is therefore not another feature-build wave. It is a **launch-hardening program** whose purpose is to prove that the existing product can safely accept users, personal/business data, payments, and AI workload under real production failure conditions.

This design supersedes any production-readiness assumptions based on the July 2026 `IMPROVEMENTS.md`. That document remains useful as historical context, but many of its former P0/P1 findings have already been implemented.

## 2. Current-State Baseline

### 2.1 Rebrand

The product source is Cresciva even though the GitHub repository is still named `scaleupafrica`.

Current evidence:

- Root package name is `cresciva`.
- Frontend package is `@cresciva/frontend`.
- Backend package is `cresciva-api`.
- README is headed `# Cresciva`.
- Frontend static metadata, OpenGraph metadata, favicon sources, and shared `SITE_NAME` use Cresciva.
- `Shared/src/lib/siteMeta.ts` centrally owns `SITE_NAME`, `SITE_ORIGIN`, and OG defaults for runtime metadata.

Remaining naming work is operational rather than a missing application rebrand: repository name, deployment/project aliases, canonical production origin, external OAuth/email/payment branding, and support/legal identity must all agree before launch.

### 2.2 Product capabilities already implemented

The launch plan must preserve, verify, and harden these existing capabilities rather than rebuild them:

- Email/password auth plus forgot/reset routes.
- Auth-aware global layout and private dashboard.
- Public directory with server/database search, facets, infinite pagination, profile slugs, public profile detail pages, and contact-visibility controls.
- Paystack initialization, callback verification, webhook settlement, payment audit records, annual-access grant RPC, receipt email, and billing UI.
- Funding Radar subscription checks, seven-day per-user cache, three uncached searches/hour, 60-second model timeout, schema validation, sanitization, and persisted results.
- Public content, legal routes, contact/newsletter/resource email flows, and admin CMS.
- NestJS + Drizzle backend with shared contracts and per-domain cutover capability.
- SEO canonical/OG infrastructure, generated sitemap, route-level lazy loading, reduced-motion support, and common loading/error states.

### 2.3 Confirmed launch risks

#### P0 — payment webhook acknowledgement correctness

`supabase/functions/paystack-webhook/index.ts` currently treats `insErr || !inserted` as a duplicate and returns HTTP 200. Only PostgreSQL unique violation `23505` is a legitimate duplicate. A database outage, permission failure, schema mismatch, or other insert failure must return 5xx so Paystack retries the delivery.

Invalid-signature webhook traffic is also parsed and stored without an explicit request-body size cap. Rejected traffic should store minimal metadata only and should never become an unbounded storage path.

#### P0/P1 — release safety

`main` is unprotected. The current HEAD has no GitHub status checks and no GitHub Actions workflow. Root `build` builds the two web workspaces but not `Backend`; root `lint` also excludes `Backend`. A production deployment can therefore be green while backend code is broken.

#### P1 — production environment proof

Repository code contains the required migrations/functions/configuration, but the connected Supabase account available to this review does not expose the Cresciva project ref (`dwyglydswegyvjowzdot`). The live deployment state of migrations, function versions, OAuth configuration, Paystack secrets/webhook URL, email secrets, backups, and production redirects cannot be assumed from source control.

Production readiness requires an evidence-based environment inventory and smoke test.

#### P1 — funding provenance/freshness

The deep-search path is now bounded and validated, but the model is still asked to recall 15–25 “real, verifiable” opportunities without a retrieval/source-verification step. Production trust requires a source-backed opportunity pipeline with provenance, freshness, verification state, and admin review. AI should rank, summarize, and personalize verified source records rather than act as the source of truth.

#### P1 — canonical origin consistency

`https://cresciva.vercel.app` is currently the fallback production origin in multiple build/runtime consumers. The fallback is deliberately safer than `window.location.origin`, but the literal is repeated. Before launch there must be one canonical origin contract, and every crawler-visible URL, Paystack callback, email link, sitemap, robots file, OAuth redirect, and API CORS rule must derive from the same production identity.

#### P1/P2 — type-safety ratchet

Both the frontend and backend TypeScript configs still have `strict: false` and `noImplicitAny: false`. The latest dashboard commit narrows one `any` escape hatch correctly, but production hardening should continue as a staged ratchet so strictness rises without turning the launch program into an unrelated rewrite.

#### P2 — operational/legal closure

The README still records unresolved license and support-contact ownership items. The application has legal routes, but launch readiness requires real company/support details, tested data-rights workflows, payment support/reconciliation procedures, and incident/support ownership.

## 3. Production Architecture

### 3.1 Frontend and admin

- `Frontend` remains the public/member SPA.
- `AdminPanel` remains the staff application served under `/admin/` in the current Vercel assembly model.
- `Shared` remains the only cross-app UI/contracts layer; neither app may import from the other.
- `Frontend/dist` remains the assembled deploy artifact and contains the admin build at `/admin/`.
- Production routing must be smoke-tested for direct deep links, not just homepage navigation.

### 3.2 Data and authorization

Supabase remains the authoritative production datastore until a deliberate backend-domain cutover is completed.

- RLS and column grants are mandatory for every exposed table.
- `SECURITY DEFINER` routines must explicitly authorize the caller or be service-role-only and must revoke default PUBLIC execution.
- Payment writes, entitlement writes, role changes, and other privileged mutations remain server-controlled.
- Every production migration is tracked in source, applied in timestamp order, verified against live schema, and followed by generated client types where relevant.

### 3.3 Payments

Paystack remains the payment provider for launch.

The authoritative payment state machine is:

`initialized -> success | failed | abandoned`

Settlement invariants:

1. Client never controls amount.
2. Payment reference is generated server-side.
3. Callback verification verifies ownership plus amount/currency.
4. Webhook verifies HMAC over the raw body before parsing actionable data.
5. Only one database routine grants membership access.
6. Duplicate webhook delivery is acknowledged only when duplicate identity is proven.
7. Infrastructure failures return 5xx to preserve provider retry semantics.
8. Every successful transaction is reconcilable from Paystack reference to payment row, subscription row, webhook event, and receipt event.

### 3.4 Funding intelligence

Two lanes are supported:

**Verified Feed** — source-backed, refreshed on a schedule, reviewable in admin, deduplicated, and suitable for ranking/personalization.

**Deep Search** — member-triggered AI enrichment with existing subscription, cache, rate-limit, timeout, and schema controls. Deep Search must progressively consume verified/retrieved source material rather than rely on model memory alone.

Every opportunity that is shown as “verified” must carry:

- canonical source URL;
- source/funder identity;
- source retrieval timestamp;
- opening/deadline data with explicit confidence/state;
- verification timestamp and verification actor/process;
- status (`open`, `upcoming`, `closed`, `unknown`);
- last checked timestamp.

### 3.5 Backend cutover

The NestJS API is not automatically required for launch simply because it exists. Cresciva must choose domain-by-domain based on evidence.

For any domain enabled through the API cutover flag:

- backend build, typecheck, lint, and tests become mandatory CI gates;
- production hosting, health check, CORS, connection pooling, secrets, rate limits, logs, and rollback path must be verified;
- frontend can revert that domain to the direct Supabase path without a destructive database migration.

If no backend domain is enabled at launch, the backend still participates in CI so the repository cannot silently decay.

## 4. Quality Gates

No phase is complete because code was written. Each phase requires evidence.

### Gate A — deterministic repository verification

From a clean clone with Node.js 20+ and the committed `package-lock.json`:

```bash
npm ci
npm run lint
npm run test
npm run build
npm run lint --workspace Backend
npm run typecheck --workspace Backend
npm run build:api
```

The CI phase will consolidate these into stable root scripts so the same gate is used locally and in GitHub Actions.

### Gate B — payment certification

Required test classes:

- duplicate webhook;
- non-duplicate database insert failure;
- invalid signature;
- malformed JSON;
- oversized body;
- missing payment;
- amount mismatch;
- currency mismatch;
- duplicate callback/webhook race;
- entitlement RPC failure;
- receipt failure;
- Paystack temporary outage;
- successful callback and webhook settlement;
- reconciliation after partial failure.

### Gate C — security/data certification

- Supabase security advisors reviewed with no unresolved critical/high issue accepted silently.
- Performance advisors reviewed for launch-critical query paths.
- RLS/column-grant tests cover anonymous, authenticated-owner, authenticated-other-user, staff/admin, and service-role boundaries.
- Restore procedure is rehearsed against a non-production copy or documented recovery environment.
- Secrets are absent from git and are scoped per environment.

### Gate D — product acceptance

Critical journeys must work on mobile and desktop:

1. anonymous landing -> sign up -> confirm/login -> dashboard;
2. create/edit profile -> public profile -> contact reveal;
3. directory search/filter/pagination;
4. subscribe -> Paystack -> callback -> entitlement -> Funding Radar;
5. member funding feed/deep search -> save opportunity;
6. forgot/reset password;
7. contact/newsletter/resource delivery;
8. admin auth -> content/funding/payment-support workflows;
9. account/sign-out/data-rights flows;
10. direct deep-link refreshes for public, dashboard, callback, and `/admin/*` routes.

### Gate E — launch operations

- production dashboards and alerts exist before traffic;
- rollback owner and rollback procedure are documented;
- payment reconciliation cadence is documented;
- incident severity and escalation rules are documented;
- support channel and public support contact are real;
- launch-day smoke checklist is executable by someone other than the implementer.

## 5. Phase Model

The launch-hardening program is divided into ten independently verifiable implementation phases plus a master roadmap:

1. Payment Reliability & Ledger Integrity
2. CI, Release Governance & Branch Protection
3. Production Environment, Domains & Secret Inventory
4. Supabase Security, Data Integrity & Recovery
5. Funding Intelligence Provenance & Verification
6. Backend/API Production Cutover
7. Web Quality, Accessibility, Performance & SEO
8. Observability, Analytics, Abuse & Cost Controls
9. Legal, Privacy, Support & Operational Trust
10. Launch Certification, Disaster Recovery & Go/No-Go

These phases are intentionally different from `docs/plans/00`–`08`: those documents describe the product build. The new files describe the evidence and hardening needed to ship the already-built product.

## 6. Dependency Order

- Phase 1 and Phase 2 start immediately and are P0/P1.
- Phase 3 starts after Phase 2 establishes reproducible checks, but its inventory can be gathered in parallel.
- Phase 4 depends on Phase 3 having a verified production Supabase target.
- Phase 5 depends on Phase 4 data/security invariants.
- Phase 6 depends on Phase 2 CI and Phase 3 environment inventory.
- Phase 7 can run in parallel with Phases 4–6 after CI exists.
- Phase 8 depends on the final deployment topology from Phases 3 and 6.
- Phase 9 can run in parallel after Phase 3 establishes real domains/contact channels.
- Phase 10 starts only when Phases 1–9 have passed their release gates or have an explicitly documented non-blocking exception approved by the product owner.

## 7. Launch Severity Policy

- **P0:** can lose money, grant/revoke paid access incorrectly, expose sensitive data, or allow an unverified deployment to ship. Blocks launch.
- **P1:** materially damages trust, correctness, security, recoverability, or core funnel reliability. Blocks public paid launch.
- **P2:** materially improves scale, maintainability, accessibility, or operations but can be accepted temporarily with an explicit owner and mitigation.
- **P3:** polish or optimization that does not materially change launch risk.

No P0 may be waived. Any P1 waiver must be explicit, time-bounded, and recorded in the launch decision log.

## 8. Definition of Production Ready

Cresciva is production-ready when all of the following are true:

- Payment retry/idempotency behavior is correct under database and provider failures.
- `main` cannot bypass required verification checks.
- The deployed frontend/admin/backend topology and all Supabase Edge Functions are known, versioned, and smoke-tested.
- Production domains, callback URLs, canonical URLs, email URLs, OAuth redirects, CORS origins, and sitemap/robots identity agree.
- Supabase security/data advisors and RLS tests have no unresolved launch-blocking findings.
- Funding opportunities presented as verified have inspectable source provenance and freshness.
- Enabled backend domains have production health/rollback/monitoring evidence.
- Mobile/desktop critical journeys pass automated and manual acceptance.
- Error, payment, AI-cost, email, and availability signals are observable with actionable alerts.
- Terms/privacy/support/company identity are real and user data/payment support procedures are operational.
- Backup restore and rollback are rehearsed.
- The final launch checklist is signed off with an explicit GO decision.

## 9. Out of Scope

The launch program does not redesign Cresciva from scratch, migrate away from Supabase without a proven need, replace Paystack, create unrelated new product features, or force a full TypeScript-strict rewrite before launch. Improvements are limited to work that increases correctness, security, reliability, trust, observability, performance, or launch operability.