# Launch Certification, Disaster Recovery & Go/No-Go Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce objective evidence that Cresciva can launch, survive expected failure modes, recover from bad releases/data incidents, and make a defensible final GO/NO-GO decision.

**Architecture:** Treat launch as a certification exercise, not a deploy command. Re-run the complete repository gate from a clean checkout, execute browser/payment/security/failure/recovery suites against a production-like environment, verify live production configuration, rehearse rollback and restore, then perform a controlled production smoke test and sign a launch decision log.

**Tech Stack:** GitHub Actions, Vercel, Supabase, Paystack, NestJS when enabled, React/Vite/AdminPanel, browser E2E tooling, observability stack, production runbooks.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Global Constraints

- Phase 10 cannot begin final certification until Phases 1–9 have PASS or an explicit non-P0 exception.
- No P0 may be waived.
- Production smoke tests use dedicated safe test identities/transactions and never destructive experiments against real customer data.
- Failure injection that risks production availability is performed in an isolated production-like environment.
- The launch candidate is identified by exact Git commit SHA and deployment IDs.
- A successful deploy without successful certification is NO-GO.

---

### Task 1: Freeze and identify the launch candidate

**Files:**
- Create: `docs/production-readiness/evidence/launch-decision.md`
- Create: `docs/production-readiness/evidence/README.md`

- [ ] **Step 1: Record launch-candidate identifiers**

Record:

```text
git commit SHA
GitHub CI run
Vercel deployment ID/URL
Supabase project ref
Edge Function versions/deploy times
Backend deployment ID/version when enabled
Paystack mode
official production origin
```

No secret values.

- [ ] **Step 2: Freeze unrelated feature work**

Only launch-blocker fixes enter the candidate after certification begins. Any change requires affected gates to be rerun.

- [ ] **Step 3: Confirm Phase 1–9 evidence**

`launch-decision.md` links each phase evidence and records PASS/approved exception.

### Task 2: Re-run deterministic clean-clone verification

**Files:**
- No implementation file unless a failure is found
- Update: `launch-decision.md`

- [ ] **Step 1: Clean checkout**

```bash
npm ci
npm run verify
```

Expected: PASS.

- [ ] **Step 2: Run browser/accessibility quality gate**

Run the Phase 7 browser/E2E/a11y command against the launch candidate.

- [ ] **Step 3: Confirm no uncommitted generated output is required to pass**

Build must be reproducible from git + environment configuration.

### Task 3: Run full critical-journey acceptance

**Files:**
- Update: `launch-decision.md`

- [ ] **Step 1: Anonymous acquisition journey**

```text
landing -> directory search -> public profile -> signup -> confirmation/login -> dashboard
```

- [ ] **Step 2: Founder journey**

```text
create/edit profile -> privacy/contact toggles -> publish -> public slug -> share/OG check
```

- [ ] **Step 3: Membership journey**

```text
checkout start -> Paystack -> callback -> active entitlement -> Funding Radar -> payment history/receipt
```

- [ ] **Step 4: Funding journey**

```text
verified feed -> source link -> filters -> save -> Deep Search -> cached repeat -> rate-limit behavior
```

- [ ] **Step 5: Recovery/auth journey**

```text
sign out -> forgot password -> reset -> sign in -> existing profile/dashboard intact
```

- [ ] **Step 6: Content/lead journey**

```text
contact -> acknowledgement/team notification
newsletter -> welcome -> unsubscribe
resource -> lead -> delivery/download
```

- [ ] **Step 7: Admin journey**

```text
admin auth -> dashboard -> content -> funding verification -> payment reconciliation -> role controls
```

### Task 4: Run payment failure certification again on the final candidate

**Files:**
- Update: `docs/production-readiness/evidence/payment-certification.md`
- Update: `launch-decision.md`

- [ ] **Step 1: Re-run Phase 1 matrix**

Especially:

```text
23505 duplicate -> 200
non-23505 event insert error -> 5xx
invalid signature -> 401
oversized webhook -> 413
amount/currency mismatch -> no access
grant failure -> no false success
callback/webhook race -> one grant
```

- [ ] **Step 2: Confirm reconciliation has zero unexplained discrepancy**

Any `paid_no_access` at launch certification is P0/NO-GO.

### Task 5: Security and abuse rehearsal

**Files:**
- Update: `launch-decision.md`

- [ ] **Step 1: Re-run RLS/authorization negative suite**

- [ ] **Step 2: Exercise public endpoint limits**

Confirm funding, email, webhook and public API size/rate controls return controlled status codes and do not create unbounded DB/log growth.

- [ ] **Step 3: Verify secret scan**

Review CI scanner results and repository history for newly introduced production secrets. A publishable key is not treated as a service secret, but secret-role/Paystack/DB/email credentials must not exist in source history.

- [ ] **Step 4: Review Supabase security advisors again**

No unresolved critical/high issue.

### Task 6: Performance and load rehearsal

**Files:**
- Create/update: `docs/production-readiness/evidence/load-rehearsal.md`

- [ ] **Step 1: Define realistic launch traffic scenarios from product expectations**

Test separate workloads:

```text
public landing/static
concurrent directory search
profile detail/contact reveal
authenticated dashboard reads
Funding feed reads
bounded Deep Search generation
Backend API domains when enabled
```

- [ ] **Step 2: Keep Paystack live payment endpoints out of synthetic high-volume load**

Use mocks/sandbox/test paths for load; do not generate abusive provider transactions.

- [ ] **Step 3: Observe p50/p95/p99, error rate, DB connections, Edge Function duration, AI concurrency and client Web Vitals**

Use results to set final alert thresholds and identify capacity bottlenecks.

- [ ] **Step 4: Verify graceful overload**

Rate-limited/overloaded expensive operations return controlled 429/5xx and preserve core browsing/account data integrity.

### Task 7: Rehearse bad-deploy rollback

**Files:**
- Create: `docs/operations/ROLLBACK.md`
- Update: `launch-decision.md`

- [ ] **Step 1: Deploy a harmless identifiable preview candidate**

- [ ] **Step 2: Practice Vercel rollback/promotion to known-good deployment**

Record exact steps and observed recovery time.

- [ ] **Step 3: Practice Backend domain rollback when enabled**

Disable the affected `VITE_API_DOMAINS` entry/redeploy or use the documented topology switch. Verify frontend returns to direct Supabase path without data migration rollback.

- [ ] **Step 4: Define migration rollback policy**

Prefer forward-fix migrations for data changes. For destructive migrations, require explicit backup/restore plan before production application.

### Task 8: Rehearse database recovery

**Files:**
- Existing: `docs/production-readiness/evidence/restore-runbook.md`
- Update: `launch-decision.md`

- [ ] **Step 1: Review Phase 4 restore rehearsal against current launch schema**

If schema materially changed after Phase 4, repeat the isolated restore rehearsal.

- [ ] **Step 2: Verify restored critical invariants**

Authentication linkage, profiles, subscriptions, payments, funding records, admin roles/RLS and required functions remain consistent.

- [ ] **Step 3: Record backup/PITR capability actually available at launch**

No assumed SLA.

### Task 9: Incident-response tabletop

**Files:**
- Create: `docs/operations/INCIDENT_RESPONSE.md`

- [ ] **Step 1: Run through four incidents**

1. Paystack successful charges but Cresciva access is not granted.
2. Public profile/contact data appears broader than intended.
3. Funding Radar serves a materially wrong “verified” deadline.
4. Bad deploy causes login/dashboard failures.

- [ ] **Step 2: For each incident document**

```text
detection
severity
first containment
customer impact query
rollback/mitigation
communications owner
recovery verification
post-incident follow-up
```

- [ ] **Step 3: Confirm on-call/support knows where dashboards and runbooks live**

### Task 10: Production launch smoke test

**Files:**
- Update: `launch-decision.md`

- [ ] **Step 1: Promote/deploy only the certified commit**

Confirm production deployment SHA equals the launch candidate.

- [ ] **Step 2: Execute non-destructive production checks**

```text
homepage 200 and correct Cresciva metadata
directory query works
known public profile works
auth sign-in works
dashboard loads
legal/contact routes work
admin loads for authorized staff
Edge Functions return expected auth/status behavior
monitoring receives release telemetry
```

- [ ] **Step 3: Execute one controlled real payment only when operationally appropriate**

Use an authorized low-risk production transaction, reconcile it end-to-end, and confirm receipt/access. If business policy prohibits production test charges, use Paystack's approved live verification procedure and record the alternative evidence.

- [ ] **Step 4: Check dashboards immediately after smoke**

No unexplained P0/P1 errors.

### Task 11: Sign GO/NO-GO decision

**Files:**
- Finalize: `docs/production-readiness/evidence/launch-decision.md`

- [ ] **Step 1: Complete scorecard**

Each area is `PASS`, `EXCEPTION`, or `FAIL`:

```text
Payment correctness
Authentication/account lifecycle
Supabase/RLS/data privacy
Directory/profile privacy and scale
Funding provenance
Backend/API topology
Frontend/Admin build and route health
Accessibility
Performance/mobile
SEO/social/canonical
Email
Observability/alerts
Security/abuse
Backup/restore
Legal/privacy/support
CI/release governance
Production smoke
```

- [ ] **Step 2: Apply decision rule**

- any P0 `FAIL` -> NO-GO;
- any unmitigated P1 `FAIL` -> NO-GO;
- P1 `EXCEPTION` requires named owner, mitigation and expiry date;
- P2 exceptions may launch when documented.

- [ ] **Step 3: Record final decision**

Use exactly one:

```text
CRESCIVA LAUNCH DECISION: GO
```

or

```text
CRESCIVA LAUNCH DECISION: NO-GO
```

Include decision date, candidate SHA and approver role/name according to the team's process.

### Task 12: First-72-hours operating watch

**Files:**
- Create: `docs/operations/LAUNCH_WATCH.md`

- [ ] **Step 1: Define watch cadence**

Review payment reconciliation, auth errors, 5xx, funding source health, AI usage/cost, email failures and web performance multiple times during the first day and daily through 72 hours.

- [ ] **Step 2: Define rollback triggers**

Immediate rollback/containment for paid-no-access, data exposure, systemic login failure, payment integrity mismatch or severe release regression.

- [ ] **Step 3: Create post-launch backlog from observed data**

Do not keep stale launch issues in `IMPROVEMENTS.md`; create/update a current backlog with production evidence.

## Phase 10 Definition of Done

- Launch candidate is immutable and identified across Git/deploy targets.
- All deterministic, browser, payment, auth, data/security and critical-journey gates pass.
- Load behavior is measured.
- Bad-deploy rollback and database recovery are rehearsed.
- Incident tabletop is complete.
- Production smoke is complete.
- Final scorecard contains no unmitigated P0/P1 fail.
- Explicit `CRESCIVA LAUNCH DECISION: GO` is recorded before public paid launch.
- First-72-hours watch runbook exists.
- Evidence ends with `PHASE 10 RELEASE GATE: PASS`.