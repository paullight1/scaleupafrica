# Cresciva Recommendation Engine

## Purpose

The Recommendation Engine answers:

> **Given Cresciva's confirmed understanding of this organisation and a canonical funding record, is the member eligible, how strong is the fit, how trustworthy is the record, and why?**

It does **not** decide whether the current funding cycle is open. That belongs to the Opportunity Status Engine. It does **not** discover arbitrary opportunities from model memory. That belongs to Opportunity Search/ingestion.

## Current architecture

```text
Confirmed member / organisation profile
        ↓
Hard eligibility checks
        ├─ explicit geography mismatch -> INELIGIBLE
        ├─ explicit stage mismatch -> INELIGIBLE
        └─ missing facts -> possibly eligible / insufficient information
        ↓
Deterministic match score (0–100)
        ↓
Separate source-confidence score (0–100)
        ↓
Separate application-readiness score (0–100)
        ↓
Evidence-backed reasons / blockers / missing information
        ↓
Current-cycle status attached from Status Engine
        ↓
Primary application eligibility
verified + fresh + open/closing-soon/rolling + eligible
        ↓
Funding Radar surface classifier
```

Core implementation:

`Frontend/src/lib/funding/recommendationEngine.ts`

Dashboard/Funding Radar adapters consume the same engine rather than maintaining competing scoring formulas.

## Why deterministic

Cresciva does not ask an LLM to assign the eligibility verdict or numeric match score.

Deterministic rules provide:

- repeatability;
- explainability;
- hard exclusion that cannot be overridden by persuasive AI text;
- testable ranking behavior;
- measurable false-positive rates against human labels;
- clean separation between relevance and source/current-cycle trust.

AI may explain verified structured evidence in the future, but it does not own the underlying verdict.

## Member profile inputs

The current recommendation profile can use:

```text
country
sector
keywords[]
short description
long description
business stage
preferred funding types[]
funding target USD
application readiness
confirmed Business Enrichment evidence fallback
```

Funding Radar prefers manual/member-entered values when present and uses confirmed enrichment only to fill missing context.

Unconfirmed enrichment candidates never enter recommendation scoring.

## Opportunity inputs

The recommendation engine consumes canonical fields including:

```text
country_focus[]
tags[]
title
funder
type
summary
eligibility
structured details
last_verified_at
source_url
verification_status
application_status
status_checked_at
application_url
deadline_at
deadline_status
```

Useful structured `details` fields include:

```text
business_stages[]
min_award_usd
max_award_usd
sectors[]
subsectors[]
keywords[]
sdg_focus[]
```

Free-form details cannot promote verification/current status; controlled canonical fields own trust.

## Step 1 — hard eligibility

Eligibility states:

```text
eligible
possibly_eligible
insufficient_information
ineligible
```

### Geography

- direct member-country match -> eligible evidence;
- Pan-African/continent-wide focus -> eligible evidence;
- explicit country list excluding the known member country -> hard `ineligible`;
- member country missing while opportunity geography is explicit -> `insufficient_information`;
- opportunity geography missing -> `possibly_eligible`, not free positive evidence.

Country aliases normalise common demonyms such as `Nigerian -> Nigeria`.

### Business stage

When the opportunity contains explicit structured `business_stages[]`:

- known member stage in allowed stages -> positive eligibility evidence;
- known member stage outside allowed stages -> hard `ineligible`;
- member stage missing -> missing-information/abstention rather than optimistic eligibility.

Funding type and funding target are **fit dimensions**, not hard eligibility exclusions unless future source structure explicitly makes them eligibility requirements.

## Step 2 — match score

Only evaluable dimensions enter the denominator. Missing data does not automatically lower the member with an arbitrary zero, and it does not create free positive evidence.

Current maximum dimension weights:

| Dimension | Weight |
| --- | ---: |
| Geography | 25 |
| Sector/subsector | 20 |
| Keywords/themes | 20 |
| Business description similarity | 15 |
| Business stage | 10 |
| Preferred funding type | 5 |
| Funding target vs structured award range | 5 |
| **Total when all are evaluable** | **100** |

### Vocabulary normalization

Basic domain aliases improve deterministic matching, for example:

```text
agritech -> agriculture / agricultural
fintech -> finance / financial
healthtech -> health
edtech -> education
climatetech -> climate
```

This is taxonomy normalization, not model inference.

### Funding target

When a source-backed award range is present, a member target inside the range earns the amount-fit dimension. An out-of-range target does not create hard ineligibility; the engine surfaces a review warning/missing-information message.

## Step 3 — source confidence

Match score and confidence are intentionally separate.

Current confidence inputs include:

- base confidence;
- controlled authoritative `source_url`;
- explicit geography;
- eligibility/structured detail availability;
- explicit `verification_status`;
- age of `last_verified_at`.

Recent verified source evidence can produce a high confidence score; a relevant but stale/unverified record can still have a high match score with low confidence.

Current-cycle freshness is **not** hidden inside this score. The Status Engine separately computes effective application status/freshness.

## Step 4 — readiness score

Application readiness is separate from fit:

```text
ready       -> high readiness score
preparing   -> medium readiness score
exploring   -> low readiness score
unknown     -> 0 / prompt for profile completion
```

A founder who is early in preparation can still be an excellent program fit. Cresciva therefore does not punish relevance simply because application materials are incomplete.

## Step 5 — explanations

The engine produces deterministic:

- `reasons[]`;
- `blockers[]`;
- `missingInformation[]`.

Examples:

```text
Nigeria is in the eligible geography.
Growth stage matches the program's stated eligibility.
Agritech aligns with this program's focus.
Matches your climate, agriculture interests.
Grant matches your preferred funding type.
Your funding target is inside the program's stated award range.
```

Known hard failures produce explicit blockers instead of a vague low score.

## Step 6 — current-cycle attachment

The engine attaches the **effective** application status from the Status Engine:

```text
open
closing_soon
rolling
upcoming
closed
paused
unknown
```

A stored OPEN that is outside its freshness window becomes effective `unknown` at read time.

Availability does not alter the conceptual match score. A closed grant can remain a 95% fit and appear in Explore; it simply cannot enter the paid primary application surface.

## Primary application eligibility

`primaryApplyEligible` requires all of:

```text
verification_status = verified
AND effective status is fresh
AND application_status IN (open, closing_soon, rolling)
AND eligibility_status = eligible
```

The card additionally requires a valid authoritative `application_url` before rendering **Apply on official site**.

## Funding Radar ranking/surfaces

The recommendation engine scores canonical records; the Primary Funding Gate assigns surfaces:

### Open for you

Verified + fresh + current + eligible.

### Closing soon

Subset of Open for you with current-cycle `closing_soon`.

### Watchlist

Verified records that are upcoming/stale/unknown/paused or require missing eligibility information.

### Explore

Closed/hard-ineligible/non-primary records plus AI discovery.

Within a surface, strong match/confidence ranks ahead; `featured` is only a late tie-break, never a relevance source.

## Member feedback

Member workflow states are independent of engine truth:

```text
saved
preparing
applied
won
rejected
dismissed
```

These signals support future measurement/learning but do not directly change hard eligibility rules or source status.

The first `applied` transition records application time; later won/rejected transitions preserve it.

## Analytics

Lifecycle events include:

```text
recommendation_impression
recommendation_open
recommendation_save
recommendation_not_relevant
recommendation_apply_click
application_started
application_submitted
application_won
application_rejected
opportunity_source_click
```

Metadata is bounded/sanitized and can carry score/status identifiers, not raw third-party source bodies or unrestricted search text.

## Accuracy invariants

1. Explicit hard mismatch never receives a positive primary eligibility verdict.
2. Missing information is not free positive evidence.
3. AI text cannot alter hard eligibility, score, verification or current-cycle status.
4. Match, confidence, readiness and current availability remain separate.
5. Stale stored OPEN cannot remain primary.
6. Free-form JSON cannot promote trust.
7. A high match score cannot bypass source/current/eligibility gates.
8. Search relevance cannot independently grant the primary application CTA.

## Evaluation

Targeted tests cover:

- direct/Pan-African geography;
- explicit geography exclusion;
- missing geography uncertainty;
- business-stage match/exclusion;
- sector/domain aliases;
- preferred funding type;
- award-range fit;
- separate readiness score;
- confidence/source evidence;
- closed high-fit records retaining fit but losing primary eligibility;
- stale stored OPEN -> effective unknown;
- unverified records never promoted to primary;
- ranking and hard-ineligible exclusion.

P0-D adds human-labelled eligibility/relevance metrics including hard false-positive rate and Precision@5.

## Current release status

**Repository behavior:** implemented.

**Fresh final-head verification:** currently `BLOCKED_EXTERNAL` because GitHub Actions jobs are failing before checkout/setup (`steps: null`), not because a current compiler/test failure has been observed.

**Production certification:** `BLOCKED_EXTERNAL` until the real Supabase/source-refresh environment and required human/live P0-D corpus/results exist.
