# Backend/API Production Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cresciva's NestJS + Drizzle backend production-safe and enable it only for domains where it is measurably better than the current direct-Supabase path, with a fast rollback for every cutover.

**Architecture:** Preserve the existing per-domain frontend API cutover pattern. First certify Backend independently, then deploy it with health/logging/security controls, then move one domain at a time behind existing shared contracts. Direct Supabase remains the rollback path until a domain has passed sustained production verification.

**Tech Stack:** NestJS 11, Drizzle ORM, Postgres/Supabase, `jose`, `@nestjs/throttler`, Helmet, Zod shared contracts, Vite/React client, Vercel frontend, selected Backend host.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Global Constraints

- Backend participates in CI whether or not any domain is enabled.
- Database DDL remains owned by Supabase migrations; Drizzle mirrors schema and must not become a second uncontrolled migration source.
- Browser authorization semantics must not weaken during API cutover.
- Service-role credentials stay server-only.
- Every enabled domain has an independent rollback switch.
- No big-bang cutover.
- Production connection pooling must use the Supabase-supported pooler mode appropriate for the deployed runtime.

---

### Task 1: Certify Backend as a standalone artifact

**Files:**
- Existing: `Backend/package.json`
- Existing: `Backend/tsconfig.json`
- Modify: Backend tests/config only when failures are found
- Update: `docs/production-readiness/evidence/backend-cutover.md`

**Interfaces:**
- Mandatory commands: `lint`, `typecheck`, `test`, `build`.

- [ ] **Step 1: Run clean Backend gate**

```bash
npm ci
npm run lint --workspace Backend
npm run typecheck --workspace Backend
npm run test --workspace Backend
npm run build:api
```

- [ ] **Step 2: Verify production entry point**

Run the built application with non-production environment values and confirm the documented `start:prod` path actually resolves the built main file.

- [ ] **Step 3: Verify health endpoint contract**

Health must distinguish process-alive from dependency-ready. At minimum expose a readiness path that can detect database connectivity without dumping connection details.

Expected response shape:

```json
{
  "status": "ok",
  "service": "cresciva-api"
}
```

Dependency failures return non-2xx or an explicit non-ready state suitable for the hosting platform.

### Task 2: Harden runtime configuration validation

**Files:**
- Create/Modify: `Backend/src/config/` configuration module
- Create tests beside configuration module

**Interfaces:**
- `loadConfig(env: NodeJS.ProcessEnv): AppConfig` validates required variables at startup.

- [ ] **Step 1: Add failing config tests**

Cover missing DB URL, invalid port, empty CORS origin set in production, missing Supabase auth configuration and production use of obviously localhost-only origins.

- [ ] **Step 2: Fail fast at process start**

Do not let the server accept traffic with partially missing production security configuration.

- [ ] **Step 3: Redact secrets from logs**

Configuration diagnostics may print names/presence and safe origins, never values for DB/service-role/Paystack/AI secrets.

### Task 3: Verify auth and authorization parity

**Files:**
- Modify as needed: Backend auth guards/decorators/tests under `Backend/src/`
- Update shared API contracts under `Shared/contracts/` only when required

- [ ] **Step 1: Build a route authorization inventory**

For every `/api/v1` route classify:

```text
public
authenticated
active-member
staff/admin
provider-webhook
```

- [ ] **Step 2: Add negative integration tests**

At minimum prove:

- non-member cannot access member funding endpoints;
- user A cannot mutate/read user B private profile/payment/subscription state;
- non-admin cannot perform admin mutations;
- unsigned Paystack webhook cannot settle payment;
- inactive/hidden profile is not exposed through slug API;
- unknown/malformed JWT is rejected.

- [ ] **Step 3: Verify JWT strategy**

Prefer current Supabase JWKS verification where available. If HS256 fallback remains, document why and protect the secret as server-only. Never authorize from user-editable metadata.

### Task 4: Certify database connection behavior

**Files:**
- Modify: Backend database/bootstrap configuration
- Add focused integration/load tests

- [ ] **Step 1: Use the correct Supabase pooler endpoint for serverless/long-running hosting model**

Record pooler mode/region in environment evidence, not credentials.

- [ ] **Step 2: Bound connection usage**

Configure sensible maximum connections, connect timeout and idle behavior for the hosting plan. Do not rely on library defaults without observing them under load.

- [ ] **Step 3: Test database outage behavior**

API returns controlled 5xx, logs one actionable error per request/incident context, and recovers when DB becomes available. It must not crash-loop endlessly on transient query failure.

### Task 5: Deploy Backend without enabling user traffic

**Files:**
- Hosting configuration files if the selected provider requires them
- Update: `docs/production-readiness/evidence/backend-cutover.md`

- [ ] **Step 1: Deploy production-like Backend**

Use the selected production host in/near the Supabase region. Record deploy/project identifier and base URL; never record secrets.

- [ ] **Step 2: Configure CORS allowlist**

Only official Cresciva production/approved preview origins may call credentialed endpoints. Avoid `*` for authenticated production APIs.

- [ ] **Step 3: Verify HTTPS, health and runtime logs**

Run repeated health requests and a safe authenticated smoke request before enabling any frontend domain.

### Task 6: Create domain-by-domain cutover matrix

**Files:**
- Update: frontend API routing module that consumes `VITE_API_DOMAINS`
- Add tests for routing decisions
- Update: `docs/production-readiness/evidence/backend-cutover.md`

**Interfaces:**
- Candidate domains: directory, profiles, subscriptions, funding, and any currently implemented domain exposed by the shared API client.

- [ ] **Step 1: Record current source and target for each domain**

Example:

| Domain | Current | Target | Cutover ready |
| --- | --- | --- | --- |
| directory | Supabase | NestJS | after parity/load tests |
| profiles | Supabase | NestJS | after auth/write parity tests |
| subscriptions | Supabase/RPC | NestJS facade | after entitlement parity |
| funding | Supabase Edge/DB | NestJS | after Phase 5 provenance ownership decision |

- [ ] **Step 2: Write routing tests**

Given a domain flag disabled, request uses existing direct path. Given enabled + API URL, request uses Backend. Missing API URL with enabled domain must fail configuration loudly, not silently point somewhere unintended.

### Task 7: Cut over one low-risk read domain first

**Files:**
- Production environment configuration
- Update evidence only after live test

- [ ] **Step 1: Start with directory read traffic after parity tests**

Compare Supabase vs Backend results for representative search, facets, slug lookup, pagination and hidden-profile cases.

- [ ] **Step 2: Enable domain for production build**

Deploy through protected `main`/CI.

- [ ] **Step 3: Observe for a defined verification window**

Compare error rate, p95 latency, DB connection usage and result correctness against baseline. The evidence records observed metrics; do not invent success thresholds before data exists, except zero authorization/data-leak regressions.

- [ ] **Step 4: Roll back immediately on correctness/security regression**

Remove the domain from `VITE_API_DOMAINS` and redeploy last-known-good frontend configuration. Database schema remains compatible.

### Task 8: Decide launch topology

**Files:**
- Finalize: `docs/production-readiness/evidence/backend-cutover.md`

- [ ] **Step 1: For each domain select `Supabase` or `Backend` for launch**

The answer may legitimately be mixed.

- [ ] **Step 2: Record rollback switch and owner for every Backend-enabled domain**

- [ ] **Step 3: Ensure Phase 8 observability covers the selected topology**

## Phase 6 Definition of Done

- Backend lint/typecheck/test/build passes in CI.
- Runtime config is validated and secrets are redacted.
- Auth/authorization negative tests pass.
- DB pool/timeout/outage behavior is verified.
- Backend deployment health/CORS/logging is proven.
- Cutover routing has tests and a reversible switch.
- Every launch domain explicitly selects Supabase or Backend.
- Enabled Backend domains have live parity/health evidence and rollback instructions.
- Evidence ends with `PHASE 6 RELEASE GATE: PASS`.