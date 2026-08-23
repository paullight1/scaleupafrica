# Funding Intelligence P0 Master Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate the approved Cresciva funding-intelligence plans into one evidence-gated sequence that delivers the paid promise: business-name understanding plus accurate, current, eligible funding recommendations.

**Architecture:** Execute identity understanding first, source/current-cycle truth second, subscriber surfaces third, and independent accuracy certification last. Each subsystem has its own repository PASS gate; no later layer may paper over an earlier layer's unknown or failed evidence.

**Tech Stack:** Existing Cresciva monorepo: React/TypeScript, Shared contracts, NestJS, Supabase/PostgreSQL/Edge Functions, TanStack Query, Vitest, GitHub Actions, Node 22+.

**Spec:** `docs/superpowers/specs/2026-08-22-business-to-funding-intelligence-design.md`

## Current execution status — 23 August 2026

| Phase | Repository behavior | Fresh repository verification | Live/production |
| --- | --- | --- | --- |
| P0-A Business Enrichment | **Implemented** | **BLOCKED_EXTERNAL** — GitHub Actions jobs currently fail before checkout (`steps: null`) | **BLOCKED_EXTERNAL** — real Supabase/provider deployment unavailable |
| P0-B Opportunity Status | **Implemented** | **BLOCKED_EXTERNAL** — same Actions runner/setup failure | **BLOCKED_EXTERNAL** — source registry/scheduler/live checks not deployed |
| P0-C Core Funding Subscription | **Implemented for the approved core paid flow** | **BLOCKED_EXTERNAL** — same Actions runner/setup failure | **BLOCKED_EXTERNAL** — migrations/functions/notification schedule/real email smoke not deployed |
| P0-D Accuracy Certification | **Engineering + human/live certification machinery implemented** | **BLOCKED_EXTERNAL** — workflow cannot execute current head | **BLOCKED_EXTERNAL** — required human corpus and live authoritative-source run do not exist |

**Important:** `Implemented` is not `PASS`. The checkboxes below remain evidence-gated until fresh commands/workflows actually execute. Repository implementation has continued under an external CI-runner blocker, but no final PASS claim is made from code inspection alone.

### P0-C notification scope decision

The safe P0 notification foundation now covers source-truth transitions that can be derived without inventing recommendation history:

```text
upcoming/unknown/closed/paused -> open      => watchlist_opened
open -> closing_soon                       => closing_soon
source-confirmed deadline changes          => deadline_changed
```

The earlier plan also listed `member_became_eligible` and `new_high_fit_open_opportunity`. Those require persisted recommendation snapshots/change detection across profile and opportunity updates. They are explicitly **post-P0 extensions**, not approximated with SQL heuristics, because doing so would weaken the deterministic eligibility/recommendation boundary.

## Mandatory plan set

Execute these in order:

1. `docs/superpowers/plans/2026-08-22-business-enrichment-engine.md`
2. `docs/superpowers/plans/2026-08-22-open-opportunity-verification-engine.md`
3. `docs/superpowers/plans/2026-08-22-core-funding-subscription-experience.md`
4. `docs/superpowers/plans/2026-08-22-funding-intelligence-accuracy-certification.md`

**Mandatory execution companion:**

- `docs/superpowers/plans/2026-08-22-funding-intelligence-plan-clarifications.md`

The clarification file overrides any shorter/vague RED/GREEN wording in the original subsystem plans. It is part of this master plan, not optional reading.

Engine manuals:

- `docs/product/BUSINESS-ENRICHMENT-ENGINE.md`
- `docs/product/OPPORTUNITY-STATUS-ENGINE.md`
- `docs/product/RECOMMENDATION-ENGINE.md`
- `docs/product/OPPORTUNITY-SEARCH-ENGINE.md`
- `docs/product/CORE-SUBSCRIPTION-FUNDING-INTELLIGENCE-FLOW.md`
- `docs/product/FUNDING-INTELLIGENCE-ENGINE-INDEX.md`

---

## Global constraints

- `Open for you` is the core paid promise and is fail-closed.
- No AI-only fact can become verified/open/eligible merely through model output.
- Business ambiguity requires member confirmation.
- Verification, application status, eligibility, match score, source confidence and readiness remain separate values.
- Zero primary recommendations is valid.
- Do not merge or deploy a subsystem whose own gate is red or unexecuted.
- External provider/live deployment gaps are `BLOCKED_EXTERNAL`, not silently waived.
- Every behavior change follows test-first RED -> GREEN -> relevant type/Deno checks -> review -> commit where the execution environment is available.

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
        | UX cannot bypass A/B truth gates
        v
P0-D Funding Intelligence Accuracy Certification
        |
        | measured release thresholds
        v
PAID CLAIM ELIGIBLE FOR PRODUCTION RELEASE
```

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

Repository implementation now includes deterministic identity scoring, evidence caps, bounded public discovery/fetch, member confirmation, owner/staff RLS, private funding-profile persistence and manual fallback. Provider credentials/live deployment remain external.

- [ ] Execute every task in `2026-08-22-business-enrichment-engine.md` plus its exact-command overrides in the clarification file.
- [ ] Confirm `npm ci && npm run verify` exits 0.
- [ ] Confirm every active Edge Function, including `business-enrichment`, passes `deno check`.
- [ ] Confirm acceptance fixtures include same-name ambiguity, no-public-footprint and malicious/private-URL cases.
- [ ] Confirm false automatic identity selections = 0 in the acceptance fixture set.
- [ ] Record repository `PASS`, `FAIL`, or exact `BLOCKED_EXTERNAL` reason before production release.

**Exit artifact:** confirmed structured organisation profile suitable for deterministic eligibility/recommendation.

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

Repository implementation now includes source registry/provenance, reusable SSRF-safe fetch, evidence-only extraction, shared deterministic conflict/status logic, append-only checks, freshness downgrades, admin source-health/recheck operations and authoritative transition queuing.

- [ ] Execute every task in `2026-08-22-open-opportunity-verification-engine.md` plus clarification overrides.
- [ ] Confirm the current-cycle status truth table is green.
- [ ] Confirm source refresh uses bounded SSRF-safe retrieval.
- [ ] Confirm AI extraction cannot persist trusted `application_status` directly.
- [ ] Confirm Admin has no evidence-free `Force open` path.
- [ ] Confirm `npm ci && npm run verify` exits 0 and every active Edge Function passes `deno check`.
- [ ] Record repository `PASS`, `FAIL`, or exact `BLOCKED_EXTERNAL` reason before production release.

**Exit artifact:** canonical opportunity records with source-backed verification and effective application status/freshness.

---

## Phase P0-C — Core Paid Subscriber Experience

**Purpose:** Expose only the right funding in the right surface and collect useful member outcomes.

**Primary gate:**

```text
verification = verified
+ source status is fresh
+ application_status = open | closing_soon | rolling
+ eligibility = eligible
```

Repository implementation now includes:

- Open for you / Closing soon / Watchlist / Explore;
- `Apply on official site` hard gate;
- trust-separated Opportunity Search (`Verified current matches / Other verified records / AI discoveries`);
- truthful zero primary state;
- member saved/preparing/applied/won/rejected/dismissed workflow;
- preserved original `applied_at`;
- profile-completion reranking prompts;
- funding notification preferences;
- deduplicated transition queue;
- retry-safe delivery worker through existing email/Resend infrastructure;
- analytics privacy and lifecycle events.

- [ ] Execute every task in `2026-08-22-core-funding-subscription-experience.md` subject to the notification-scope decision above.
- [ ] Verify Open for you / Closing soon / Watchlist / Explore truth-table tests.
- [ ] Verify an AI discovery never receives application CTA treatment.
- [ ] Verify zero-result state never pads with uncertain results.
- [ ] Verify member workflow state does not mutate hard eligibility/current source truth.
- [ ] Verify Business Enrichment is the first-class funding-profile entry point with manual fallback.
- [ ] Verify source refresh -> notification queue -> delivery worker boundary.
- [ ] Confirm full repository verification and all Edge checks green.
- [ ] Record repository `PASS`, `FAIL`, or exact `BLOCKED_EXTERNAL` reason before production release.

**Exit artifact:** subscription UX implementing engine truth boundaries instead of reinterpreting them client-side.

---

## Phase P0-D — Accuracy Certification

**Purpose:** Measure whether the paid claim is good enough to launch.

Repository machinery now includes engineering fixtures, anti-gaming tests, corpus-size/human-review validation, deterministic metrics, targeted certification workflow and explicit live-link mode using the same `safeExternalFetch` boundary with Node DNS injection.

- [ ] Execute every task in `2026-08-22-funding-intelligence-accuracy-certification.md`.
- [ ] Reach >=100 organisation identity fixtures.
- [ ] Reach >=200 opportunity-cycle fixtures.
- [ ] Reach >=150 labelled eligibility pairs and >=50 ranking candidate pools.
- [ ] Record two-human-reviewer labels for every P0 identity/status/eligibility fixture.
- [ ] Run `npm ci`, `npm run verify`, and `npm run eval:funding` on the exact release head.
- [ ] Run live/staging source/link checks when the deployed provider/environment is available.
- [ ] Publish exact metric-by-metric PASS/FAIL in `docs/production-readiness/evidence/funding-intelligence-certification.md`.

**Production release thresholds:**

```text
Business auto-identity false selections: 0 in acceptance corpus
Primary authoritative source coverage: >=95%
Open/Closing Soon/Rolling precision: >=98%
Confirmed deadline source coverage: 100%
Hard eligibility false positives: <2%
Precision@5: >=80%
Broken primary source links: <1%
AI discoveries promoted to verified/open: 0
Stale OPEN records in primary output: 0
```

Any P0 failure or unexecuted production gate keeps the paid claim gated.

---

## Approval policy for execution

The user explicitly authorised approvals wherever necessary for this phase. The implementation agent may proceed through routine internal design/reviewer gates without asking for repeated confirmation when all are true:

- the change is inside these approved plans;
- it preserves the trust boundaries in the spec;
- tests are written first for behavior changes;
- P0/P1 review findings are fixed before moving to the next task;
- it does not merge the PR, deploy to production, rotate credentials, purchase an external service, lower a release threshold, or weaken a security control.

Explicit user approval is still required before:

- merging to `main` if treated as a release action;
- production deployment/cutover;
- enabling paid marketing claims before certification;
- entering a paid third-party provider contract/material spend;
- lowering a P0 metric threshold;
- bypassing a security/trust control.

---

## Loop policy

For every behavior task:

```text
write focused test first
-> run it and observe the expected RED when runner access exists
-> implement minimum behavior
-> rerun focused test GREEN
-> run relevant typecheck / Deno check
-> run reviewer/critic pass
-> resolve all P0/P1 findings
-> commit
-> move to next task
```

At the end of every subsystem:

```text
npm ci
npm run verify
all active Edge deno checks
plan-specific acceptance fixtures
engine-manual/evidence update
```

Do not turn an implementation-complete state into PASS without fresh execution evidence.
