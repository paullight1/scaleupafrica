# Cresciva Production Readiness Design

**Date:** 2026-08-20  
**Baseline:** `main` at `8603e5ec2db6830263c97d0d556ac31e390d51ac`  
**Product:** Cresciva  
**Repository:** `paullight1/scaleupafrica`

## 1. Purpose

Cresciva is no longer an early generated prototype. The repository is a four-workspace npm monorepo (`Frontend`, `AdminPanel`, `Shared`, `Backend`) with Supabase Auth/Postgres/Storage/Edge Functions, a NestJS + Drizzle API path, Bachs payments, member-gated funding intelligence, an SME directory, content/admin tooling, transactional email, route-level code splitting, SEO infrastructure, and a substantial automated-test surface.

The remaining work is a **launch-hardening program** whose purpose is to prove that the existing product can safely accept users, business data, payments, and AI workload under real production failure conditions.

This design supersedes July-era production-readiness assumptions. Historical `IMPROVEMENTS.md` material may remain as archive but must not be treated as the current P0/P1 list.

## 2. Current-state baseline

### 2.1 Rebrand

The application source is Cresciva even though the GitHub repository remains named `scaleupafrica`.

Current evidence includes Cresciva package names, README, metadata, brand assets, admin identity and shared SEO identity. Remaining naming work is operational: repository/project aliases, external OAuth/email/payment branding, public support identity and any future owned custom domain.

### 2.2 Existing product capabilities

The launch program preserves and hardens these capabilities rather than rebuilding them:

- Email/password auth plus forgot/reset routes.
- Auth-aware global layout and private dashboard.
- Public directory with database search, facets, pagination, profile slugs/detail pages and contact visibility controls.
- Bachs annual-entitlement checkout, callback verification, signed webhook settlement, internal payment ledger, atomic annual-access grant RPC, receipt email and billing UI.
- Funding Radar subscription checks, seven-day cache, uncached-search rate limit, timeout, schema validation, sanitization and persisted results.
- Public content/legal routes, contact/newsletter/resource email flows and admin CMS.
- NestJS + Drizzle backend with shared contracts and per-domain cutover capability.
- SEO/canonical/OG infrastructure, generated sitemap, route-level lazy loading, reduced-motion support and common loading/error states.

### 2.3 Confirmed launch risks

#### P0 — external payment certification is still required

The repository-side Bachs path is hardened, but production cannot be called payment-certified until the real Bachs sandbox/live products, signing secret and Cresciva Supabase deployment are exercised end to end.

The important invariants are now:

- Bachs Checkout Sessions are product-based.
- Cresciva uses one-time annual products only, never recurring Bachs products.
- Browser cannot choose product price directly.
- Callback uses Cresciva's internal payment reference only as a lookup key.
- Signed `collection.succeeded` is fulfillment authority.
- Provider amount/currency are revalidated against Cresciva's canonical ledger before access is granted.
- Duplicate event rows with `processed=false` resume settlement; they are not blindly acknowledged.

#### P0/P1 — release safety

The production-readiness branch adds a root `npm run verify` contract and GitHub Actions workflow, but `main` remains externally reported as unprotected and a successful required CI status has not yet been observed. A real PR run plus branch protection are mandatory before production release.

#### P1 — production environment proof

Repository code identifies the intended Supabase project ref (`dwyglydswegyvjowzdot`), but the connected Supabase account available to this session does not expose it. The connected Vercel team also exposes zero projects. Therefore migration state, deployed Edge Function versions, OAuth configuration, Bachs secrets/products/webhook endpoint, email identity and production rollback cannot be inferred from source control.

#### P1 — funding provenance/freshness

Deep Search is bounded and validated, but verified funding still needs source-backed provenance, freshness and review rather than treating model memory as authoritative current data.

#### P1 — production identity consistency

The repeated origin literal has been replaced by a single `config/site-origin.js` contract consumed by runtime metadata, Vite static metadata and sitemap/robots generation. The remaining risk is external deployment alignment: `APP_URL`, OAuth redirects, email links, CORS and actual Vercel domains must match the chosen production identity.

#### P1/P2 — type-safety ratchet

Strict TypeScript is not globally enabled yet. Production hardening should continue as a staged ratchet rather than forcing a launch-delaying rewrite. The Phase 2 gate nonetheless typechecks every workspace.

#### P2 — operational/legal closure

License, public support/contact ownership, data-rights procedures, payment support cadence and incident ownership still require operational closure before launch.

## 3. Production architecture

### 3.1 Frontend and admin

- `Frontend` is the public/member SPA.
- `AdminPanel` is served under `/admin/` in the assembled deployment artifact.
- `Shared` remains the cross-app UI/contracts layer; neither app imports from the other.
- `Frontend/dist` is the assembled web deployment artifact and contains the admin build at `/admin/`.
- Production routing must be smoke-tested for direct deep links, not only homepage navigation.

### 3.2 Data and authorization

Supabase remains the authoritative datastore until a deliberate backend-domain cutover is completed.

- RLS and explicit grants remain mandatory for exposed tables.
- `SECURITY DEFINER` routines explicitly authorize callers or remain service-role-only and revoke unsafe PUBLIC execution.
- Payment writes, entitlement writes, role changes and other privileged mutations remain server-controlled.
- Production migrations must match repository history and generated client types where applicable.

### 3.3 Payments — Bachs

Cresciva uses Bachs for hosted payment collection while Cresciva remains the entitlement system of record.

Authoritative internal payment states remain:

`initialized -> success | failed | abandoned`

Settlement invariants:

1. Client never controls charge amount or arbitrary Bachs product ID.
2. Canonical annual prices live in Cresciva server code/ledger.
3. `BACHS_ANNUAL_PRODUCT_NGN` and `BACHS_ANNUAL_PRODUCT_USD` identify preconfigured **one-time** Bachs products whose prices must equal those canonical amounts.
4. Payment reference is generated server-side as `crv_<uuid>`.
5. Bachs return URL contains the internal reference; it is never payment proof.
6. Callback verification requires caller ownership, resolves the stored `checkout_id`, retrieves Bachs server-side, and revalidates settlement/amount/currency.
7. Webhook verifies HMAC-SHA256 over `${timestamp}.${raw_body}` before actionable parsing and rejects stale delivery.
8. `collection.succeeded` is the settlement/fulfillment event; `checkout.completed` is audit-only.
9. Duplicate event identity is based on Bachs event ID; unprocessed duplicate events resume work.
10. Infrastructure failures return 5xx so Bachs can retry.
11. Only `grant_annual_access(_payment_id)` grants paid membership access.
12. Every successful transaction is reconcilable from Bachs checkout/event to payment row, subscription row and receipt state.

Bachs environment rules:

- sandbox: `https://sandbox-api.bachs.io` + `sk_sandbox_…`;
- live: `https://api.bachs.io` + `sk_live_…`;
- key/base URL environment mismatch is rejected;
- annual membership products have no billing cycle, preserving Cresciva's no-auto-renew model.

### 3.4 Funding intelligence

Two lanes are supported:

**Verified Feed** — source-backed, refreshed, reviewable in admin, deduplicated and suitable for ranking/personalization.

**Deep Search** — member-triggered AI enrichment with existing subscription, cache, rate-limit, timeout and schema controls. Deep Search should progressively consume retrieved/verified sources rather than model memory alone.

Every opportunity shown as verified must eventually carry canonical source URL, funder identity, retrieval timestamp, opening/deadline state, verification timestamp/process, status and last-checked timestamp.

### 3.5 Backend cutover

The NestJS API is not automatically required for launch simply because it exists. Any domain enabled through API cutover must have build/typecheck/lint/test, production hosting, health, CORS, pooling, secrets, rate limits, logs and rollback evidence. Payment fulfillment remains single-homed in Supabase Edge Functions during the current hardening program to avoid competing authoritative processors.

## 4. Quality gates

### Gate A — deterministic repository verification

Authoritative command:

```bash
npm ci
npm run verify
```

`npm run verify` expands to lint, workspace typechecks, workspace tests, assembled Frontend/Admin build and Backend production build. GitHub Actions additionally Deno-checks active Supabase Edge Function entry points and asserts expected artifacts.

### Gate B — Bachs payment certification

Required classes:

- valid product-based checkout creation;
- wrong/missing product configuration;
- duplicate webhook event;
- event inserted but processing incomplete;
- non-duplicate DB failure;
- invalid/stale signature;
- malformed/oversized body;
- amount/currency mismatch;
- `collection.underpaid`;
- callback/webhook race;
- entitlement RPC failure;
- receipt failure;
- Bachs temporary outage/retry;
- successful settlement;
- reconciliation after partial failure;
- deliberately recurring product configuration rejected as launch setup.

### Gate C — security/data certification

- Supabase security/performance advisors reviewed with no silently accepted critical/high issue.
- RLS/grant tests cover anonymous, owner, other authenticated user, staff/admin and service-role boundaries.
- Restore procedure rehearsed against safe non-production data/environment.
- Secrets absent from git and scoped per environment.

### Gate D — product acceptance

Critical journeys on mobile and desktop include:

1. landing -> signup/login -> dashboard;
2. create/edit profile -> public profile -> contact reveal;
3. directory search/filter/pagination;
4. annual membership -> Bachs hosted checkout -> reference callback/webhook -> entitlement -> Funding Radar;
5. member funding feed/deep search -> save opportunity;
6. forgot/reset password;
7. contact/newsletter/resource delivery;
8. admin auth -> content/funding/payment reconciliation;
9. account/sign-out/data-rights flows;
10. direct deep-link refreshes for public, dashboard, callback and `/admin/*` routes.

### Gate E — launch operations

- production dashboards/alerts before traffic;
- rollback owner/procedure;
- payment reconciliation cadence;
- incident severity/escalation;
- real public support channel;
- launch-day smoke checklist executable by someone other than the implementer.

## 5. Phase model

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

These phases differ from historical `docs/plans/00`–`08`: those describe product build; these describe hardening/evidence required to ship it.

## 6. Dependency order

- Phases 1 and 2 are immediate P0/P1 work.
- Phase 3 inventory can proceed beside Phase 2, but live certification depends on correct cloud access.
- Phase 4 requires the real Supabase target.
- Phase 5 depends on data/security invariants.
- Phase 6 depends on CI plus environment inventory.
- Phase 7 can run in parallel after CI exists.
- Phase 8 follows the final deployment topology.
- Phase 9 can proceed once real production identity/contact channels are selected.
- Phase 10 starts only after prior release gates are PASS or an explicitly approved non-P0 exception exists.

## 7. Launch severity policy

- **P0:** can lose money, grant/revoke paid access incorrectly, expose sensitive data, or allow an unverified deployment to ship. Blocks launch.
- **P1:** materially damages trust, correctness, security, recoverability, or core funnel reliability. Blocks public paid launch.
- **P2:** material scale/maintainability/accessibility/operations work that may be accepted temporarily with explicit owner/mitigation.
- **P3:** polish/optimization without material launch risk.

No P0 may be waived. P1 waivers must be explicit, time-bounded and recorded.

## 8. Definition of production ready

Cresciva is production-ready only when:

- Bachs retry/idempotency/entitlement behavior is proven against the real sandbox/live configuration.
- `main` cannot bypass required verification checks.
- Frontend/admin/backend topology and Supabase Edge Functions are known, versioned and smoke-tested.
- Production domains, callback/return URLs, canonical URLs, email URLs, OAuth redirects, CORS and sitemap/robots agree.
- Supabase security/data advisors and RLS tests have no unresolved launch blockers.
- Verified funding records have inspectable provenance/freshness.
- Enabled backend domains have health/rollback/monitoring evidence.
- Mobile/desktop critical journeys pass.
- Error, payment, AI-cost, email and availability signals are observable with alerts.
- Terms/privacy/support/company identity and payment/data-support procedures are operational.
- Backup restore and deployment rollback are rehearsed.
- Final launch checklist records an explicit GO.

## 9. Out of scope

The launch program does not redesign Cresciva from scratch, force migration away from Supabase, introduce automatic recurring membership, create unrelated product features, or require a full strict-TypeScript rewrite before launch. Improvements are limited to correctness, security, reliability, trust, observability, performance and launch operability.
