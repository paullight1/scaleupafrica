# Funding Intelligence P0 Master Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate the four approved Cresciva funding-intelligence plans into one evidence-gated execution sequence that delivers the paid promise: business-name understanding plus accurate, current, eligible funding recommendations.

**Architecture:** Execute identity understanding first, source/current-cycle truth second, subscriber surfaces third, and independent accuracy certification last. Each subsystem has its own repository PASS gate; no later layer may paper over an earlier layer's unknown or failed evidence.

**Tech Stack:** Existing Cresciva monorepo: React/TypeScript, Shared contracts, NestJS, Supabase/PostgreSQL/Edge Functions, TanStack Query, Vitest, GitHub Actions, Node 22+.

**Spec:** `docs/superpowers/specs/2026-08-22-business-to-funding-intelligence-design.md`

## Global Constraints

- `Open for you` is the core paid promise and is fail-closed.
- No AI-only fact can become verified/open/eligible merely through model output.
- Business ambiguity requires confirmation.
- Verification, application status, eligibility, match score, source confidence and readiness remain separate values.
- Zero primary recommendations is valid.
- Do not merge or deploy a phase whose own gate is red.
- External provider/live deployment gaps are `BLOCKED_EXTERNAL`, not silently waived.

---

## Execution order

```text
P0-A Business Enrichment Engine
        |
        | confirmed organisation profile
        v
P0-B Open Opportunity Verification Engine
        |
        | verified current-cycle status
        v
P0-C Core Funding Subscription Experience
        |
        | product UX cannot bypass A/B gates
        v
P0-D Funding Intelligence Accuracy Certification
        |
        | measured thresholds
        v
PAID CLAIM ELIGIBLE FOR PRODUCTION RELEASE
```

Plans:

1. `docs/superpowers/plans/2026-08-22-business-enrichment-engine.md`
2. `docs/superpowers/plans/2026-08-22-open-opportunity-verification-engine.md`
3. `docs/superpowers/plans/2026-08-22-core-funding-subscription-experience.md`
4. `docs/superpowers/plans/2026-08-22-funding-intelligence-accuracy-certification.md`

Engine manuals:

- `docs/product/BUSINESS-ENRICHMENT-ENGINE.md`
- `docs/product/OPPORTUNITY-STATUS-ENGINE.md`
- `docs/product/RECOMMENDATION-ENGINE.md`
- `docs/product/OPPORTUNITY-SEARCH-ENGINE.md`
- `docs/product/CORE-SUBSCRIPTION-FUNDING-INTELLIGENCE-FLOW.md`

---

## Phase P0-A — Business Enrichment

**Purpose:** Turn business name + optional hints into a source-backed, member-confirmed funding profile.

**Hard gate:**

```text
unique identity -> may propose
ambiguous identity -> must ask
not found -> manual fallback
member corrections -> preserved
sensitive traits -> never inferred
```

- [ ] Execute every task in `2026-08-22-business-enrichment-engine.md`.
- [ ] Confirm the full repository gate is green.
- [ ] Confirm all active Edge Functions including `business-enrichment` pass Deno check.
- [ ] Confirm the acceptance fixture contains same-name ambiguity and malicious URL cases.
- [ ] Record repository PASS or exact blocker before P0-B begins.

**P0-A exit artifact:** confirmed structured organisation profile suitable for deterministic eligibility/recommendation.

---

## Phase P0-B — Open Opportunity Verification

**Purpose:** Prove whether the current funding cycle is actually accepting applications.

**Hard gate:**

```text
verified != open
future deadline != open
missing deadline != rolling
conflict -> unknown
stale open -> effective unknown
```

- [ ] Execute every task in `2026-08-22-open-opportunity-verification-engine.md`.
- [ ] Confirm current-cycle status truth table is green.
- [ ] Confirm source refresh is bounded and SSRF-safe.
- [ ] Confirm AI extraction cannot persist trusted `application_status` directly.
- [ ] Confirm Admin has no evidence-free Force Open path.
- [ ] Record repository PASS or exact blocker before P0-C begins.

**P0-B exit artifact:** canonical opportunity records with source-backed verification and effective application status/freshness.

---

## Phase P0-C — Core Paid Subscriber Experience

**Purpose:** Expose only the right funding in the right surface and collect useful member outcomes.

**Hard gate:**

`Open for you` requires:

```text
verified
+ fresh
+ open | closing_soon | rolling
+ eligible
```

- [ ] Execute every task in `2026-08-22-core-funding-subscription-experience.md`.
- [ ] Verify `Open for you`, `Closing soon`, `Watchlist`, `Explore` truth table.
- [ ] Verify AI discovery never receives Apply Now treatment.
- [ ] Verify zero-result state does not pad uncertainty.
- [ ] Verify member workflow states persist and do not mutate hard eligibility.
- [ ] Verify business-name enrichment is the first-class funding profile entry point with manual fallback.
- [ ] Record repository PASS or exact blocker before P0-D begins.

**P0-C exit artifact:** subscription UX implementing the engine truth boundaries rather than reinterpreting them client-side.

---

## Phase P0-D — Accuracy Certification

**Purpose:** Measure whether the paid claim is good enough to launch.

- [ ] Execute every task in `2026-08-22-funding-intelligence-accuracy-certification.md`.
- [ ] Reach >=100 organisation identity fixtures.
- [ ] Reach >=200 opportunity-cycle fixtures.
- [ ] Record two-human-reviewer labels for P0 cases.
- [ ] Run `npm ci`, `npm run verify`, and `npm run eval:funding`.
- [ ] Run live/staging source/link checks when provider/environment access exists.
- [ ] Compare every P0 metric with the fixed release threshold.
- [ ] Publish exact PASS/FAIL in `docs/production-readiness/evidence/funding-intelligence-certification.md`.

**Production release thresholds:**

```text
Business auto-identity false selections: 0 in acceptance corpus
Primary source coverage: >=95%
Open/Closing Soon/Rolling precision: >=98%
Confirmed deadline source coverage: 100%
Hard eligibility false positives: <2%
Precision@5: >=80%
Broken primary source links: <1%
AI discoveries promoted to verified/open: 0
Stale OPEN records in primary output: 0
```

Any P0 failure keeps the paid claim gated.

---

## Approval policy for execution

The user has explicitly authorised approvals wherever necessary for this phase. Therefore the implementation agent may proceed through routine internal design/reviewer gates without asking for repeated confirmation when all of the following are true:

- the change is inside these approved plans;
- it preserves the trust boundaries in the spec;
- tests are written first for behavior changes;
- P0/P1 review findings are fixed before moving to the next task;
- it does not merge the PR, deploy to production, rotate credentials, purchase an external service, or weaken a release threshold.

Explicit user approval is still required before:

- merging to `main` if that is treated as a release action;
- production deployment/cutover;
- enabling paid marketing claims before certification;
- adding a paid third-party provider contract or material spend;
- lowering a P0 metric threshold;
- bypassing a security/trust control.

---

## Loop policy

For each task:

```text
RED test
 -> verify correct failure
 -> minimal implementation
 -> GREEN focused test
 -> relevant type/lint checks
 -> reviewer/critic pass
 -> resolve P0/P1 findings
 -> commit
 -> next task
```

At the end of each subsystem:

```text
full repository verify
+ all active Edge Deno checks
+ plan-specific acceptance fixtures
+ evidence document update
```

Do not move forward because a task "looks done". Move forward only on fresh evidence.
