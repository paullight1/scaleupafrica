# Cresciva Opportunity Status Engine

## Implementation status — 22 August 2026

**Repository implementation:** substantially complete for P0-B.

**Live production certification:** **BLOCKED_EXTERNAL** until the actual Cresciva Supabase project, Edge deployments, scheduler secrets/provider credentials and production monitoring are accessible and evidenced.

Implemented in the current production-readiness branch:

- canonical application status model: `open | closing_soon | rolling | upcoming | closed | paused | unknown`;
- deadline provenance: `confirmed | rolling | unknown`;
- append-only `funding_source_checks` with idempotent `check_key`;
- source/provenance edits automatically invalidate previous current-cycle trust;
- service-role-only atomic check/status RPC;
- bounded SSRF-safe authoritative source retrieval;
- evidence-only AI signal extraction — the model cannot directly set trusted application status;
- deterministic status classifier and exact per-status freshness windows;
- scheduler mode with `FUNDING_REFRESH_SECRET` and hard batch cap of 25;
- staff JWT mode for individual rechecks;
- source-registry health tracking and safe source editing with trust invalidation;
- read-time status freshness downgrade in Edge, NestJS and Frontend paths;
- AI/cached discovery forced to `unverified + unknown` unless authoritative trust evidence exists;
- paid `Apply now` gate separated from fit score;
- member labels for Open / Closing soon / Rolling / Upcoming / Closed / Paused / Unknown;
- exact current deadline shown only when current-cycle deadline provenance is confirmed;
- staff Funding Source Health console with due/failure/conflict queues and no `Force open` control;
- deterministic certification truth table with 30 classification cases plus exact freshness-boundary cases;
- operational events and alert thresholds documented in `docs/production-readiness/evidence/funding-source-monitoring.md`.

Current external blockers:

- Cresciva Supabase project `dwyglydswegyvjowzdot` is not exposed by the connected Supabase account in this session;
- no live migration/function deployment evidence is available;
- no scheduler execution evidence for `funding-source-refresh` is available;
- GitHub Actions is currently failing at runner/setup before checkout (`steps: null`), so the latest full P0-B branch head does not yet have a real compile/test/Deno run even though earlier P0-A checkpoints were green;
- real source-network accuracy and monitoring thresholds still require staging/production evidence.

Until those items are resolved, repository source work may advance, but P0-B must not be described as live-certified.

---

## What it does

The Opportunity Status Engine answers:

> **Does this funding programme exist, and can an eligible organisation actually apply to the current cycle right now?**

This engine exists because `verified` and `open` are different facts. A real funding programme can be verified and still be closed. An upcoming programme can be verified but not yet accepting applications. A historical programme page can exist even though there is no current round.

Cresciva therefore models source verification, current application status and member eligibility separately.

## Core process

```text
Funding source registry
        |
        v
Due-source scheduler / staff recheck
        |
        v
Bounded SSRF-safe source fetch
        |
        v
Content fingerprint
        |
        v
Evidence-only status-signal extraction
        |
        +-- explicit current cycle?
        +-- application CTA/form?
        +-- open/close/paused language?
        +-- opening date?
        +-- deadline?
        +-- rolling language?
        |
        v
Deterministic status classifier
        |
        v
Conflict + freshness rules
        |
        v
 OPEN / CLOSING_SOON / ROLLING /
 UPCOMING / CLOSED / PAUSED / UNKNOWN
        |
        v
Eligibility + Recommendation Engine
        |
        v
Primary Apply-now gate
```

## Independent truth dimensions

### Verification status

```ts
"verified" | "stale" | "unverified"
```

Question: do we have recent authoritative evidence for the opportunity record?

### Application status

```ts
"open" | "closing_soon" | "rolling" | "upcoming" | "closed" | "paused" | "unknown"
```

Question: can applications be submitted in the current cycle?

### Eligibility status

```ts
"eligible" | "possibly_eligible" | "insufficient_information" | "ineligible"
```

Question: can this member apply based on known criteria?

These states must never be collapsed into one generic `verified` badge.

## Deterministic status rules

### OPEN

Requires authoritative verified source evidence, identifiable current-cycle evidence, explicit open intake, an active application CTA/form, no conflict, and a non-expired current-cycle deadline when one is confirmed. A future deadline alone is never enough.

### CLOSING_SOON

All OPEN requirements plus a confirmed deadline no more than 14 calendar days away. The 14-day value is a Cresciva product threshold, not source truth.

### ROLLING

Requires explicit official rolling/continuous intake language plus an active intake. Missing deadline does not imply rolling.

### UPCOMING

Requires a future opening date/current-cycle statement and no explicit current OPEN signal.

### CLOSED

Requires explicit current-cycle closed evidence. Historical/typical deadlines are never substituted.

### PAUSED

Requires explicit source evidence that intake/programme operation is temporarily paused.

### UNKNOWN

Used when current-cycle evidence is insufficient, contradictory, stale, unreachable, or cannot be mapped safely. Unknown is a correct fail-closed result and never gets `Apply now`.

Conflicts currently include:

- open + closed;
- open + paused;
- rolling + closed;
- rolling + paused;
- closed + paused.

## Deadline policy

Deadline status is independent:

```ts
"confirmed" | "rolling" | "unknown"
```

Exact deadline UI requires `deadline_status = confirmed` and a source-backed `deadline_at`. Historical or model-generated dates are never confirmed. Rolling requires explicit rolling evidence. Conflicting dates keep status unknown and enter review.

## Freshness SLA

| State | Maximum normal age |
| --- | ---: |
| Closing soon | 6h |
| Open | 24h |
| Rolling | 48h |
| Upcoming | 24h |
| Paused | 24h |
| Closed | 7d |
| Unknown/conflict | 12h |

When the window expires, Edge/NestJS/Frontend read boundaries convert the stored state to effective `unknown`. The last evidence remains append-only for audit, but the paid UI does not keep an optimistic stale label.

## Source checks and retry safety

Each refresh attempt writes an append-only check containing bounded HTTP metadata, fingerprint, extracted signal structure, deterministic classified status and bounded error class.

Successful checks may update canonical current-cycle fields through `record_funding_status_check(...)` in the same transaction. Failed fetch/extraction checks use `apply_canonical = false`; critically, they do **not** advance `status_checked_at`.

`check_key` is unique so retried attempts cannot create duplicate contradictory transitions.

## AI's role

AI may extract candidate signals from bounded fetched source text. The extraction prompt explicitly requires supplied-source-only facts, rejects historical/typical deadline substitution, and forbids returning trusted `application_status`.

The deterministic classifier owns the final status. AI-assisted opportunity discovery is separately forced to `unverified + unknown` and cannot be promoted to OPEN by model output.

## Source registry and edits

`funding_sources` stores authorised source domains and retrieval health. Staff can add/edit sources from `/admin/funding/sources`.

Changing a source base URL calls `update_funding_source_and_invalidate(...)`. Dependent opportunity verification/current-cycle trust is reset until authoritative evidence is recollected. Editing an opportunity program/source URL also clears its previous application status through a database trigger.

There is no manual `Force open` control.

## Apply Now gate

Application availability does not change the underlying fit score. A strong CLOSED match remains a strong match, but it is not a primary action.

Primary paid application action requires:

```text
verification = verified
AND effective application status in (open, closing_soon, rolling)
AND eligibility = eligible
AND a valid application action URL exists
```

Therefore:

- verified + closed -> no Apply now;
- stale stored open -> effective unknown -> no Apply now;
- open + unverified -> no Apply now;
- open + verified + ineligible -> no Apply now;
- AI discovery claiming open -> rewritten unknown -> no Apply now;
- verified + fresh open + eligible -> candidate for Apply now.

## Operations

The staff console shows:

- due for refresh;
- failures and consecutive failure streaks;
- conflicts / unknown;
- source registry and retrieval health;
- recent successful status transitions;
- individual recheck;
- bounded staff-side due refresh;
- safe source add/edit.

The production scheduler uses `mode: "due"` with `X-Cresciva-Refresh-Secret`, never exposing `FUNDING_REFRESH_SECRET` to the browser.

See `docs/production-readiness/evidence/funding-source-monitoring.md` for exact alert thresholds and live evidence still required.

## Accuracy targets carried into P0-D

- >=98% current-open status precision;
- 100% confirmed deadlines backed by current-cycle source evidence;
- 0 AI-only records promoted to verified/open;
- <=1% broken authoritative source links in primary paid output;
- zero stale OPEN records in primary output;
- OPEN source age <=24h;
- CLOSING_SOON source age <=6h.

P0-D owns benchmark/staging certification against these targets.