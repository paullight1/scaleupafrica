# Cresciva Core Subscription Funding Intelligence Flow

## Purpose

This document defines the end-to-end process behind Cresciva's core paid promise:

> **Understand my organisation, continuously monitor authoritative funding sources, and show me funding I am actually likely to qualify for and can apply to now.**

Funding Intelligence is not one AI prompt. It is a chain of engines with separate truth responsibilities.

## End-to-end engine chain

```text
Business name / member profile
        ↓
Business Enrichment Engine
identity resolution → bounded public evidence → member confirmation
        ↓
Confirmed funding profile
country / sector / organisation type / stage / themes /
funding target / preferred funding types / readiness
        ↓
Opportunity Source Registry
        ↓
Bounded source refresh + provenance
        ↓
Opportunity Status Engine
verified existence ≠ current-cycle availability
        ↓
Hard Eligibility Engine
        ↓
Recommendation Engine
fit / confidence / readiness / reasons
        ↓
Primary Funding Gate
verified + fresh + current + eligible
        ↓
Funding Radar
Open for you / Closing soon / Watchlist / Explore
        ↓
Member workflow + notifications + evaluation
```

## Engine ownership

| Question | Authoritative owner |
| --- | --- |
| Which real organisation is this? | Business Enrichment Engine |
| What does the organisation do? | Evidence-backed enrichment + member confirmation |
| Does a funding programme exist? | Opportunity provenance/source registry |
| Is the current cycle accepting applications? | Opportunity Status Engine |
| Is this member eligible? | Hard Eligibility Engine |
| How relevant is it? | Recommendation Engine |
| What did the member explicitly search for? | Opportunity Search Engine |
| Which results may show an application CTA? | Primary Funding Gate |
| What is the member doing with it? | Member opportunity workflow |
| Should a transition notify the member? | Funding notification decision + delivery workers |

No engine is allowed to silently take over another engine's truth responsibility.

## 1. Business-name-first entry

A member may begin with only an organisation name:

```text
Top100 Africa Future Leaders
```

The enrichment flow:

1. normalises the supplied identity hints;
2. performs bounded public discovery;
3. retrieves evidence through the SSRF-safe fetch boundary;
4. extracts public organisation facts only from supplied evidence;
5. deterministically scores identity candidates;
6. withholds automatic selection when candidates are ambiguous;
7. asks the member to confirm the resolved organisation;
8. persists the confirmed evidence/provenance atomically;
9. fills only missing profile fields — manual member values remain authoritative.

Unconfirmed research results do **not** affect recommendations.

## 2. Funding profile

Funding matching uses known/confirmed fields such as:

- operating country;
- sector/subsector;
- business description and keywords;
- business stage;
- preferred funding types;
- funding target;
- application readiness;
- confirmed public organisation evidence.

Private funding preferences remain private and are not exposed through public-directory profile contracts.

### Profile-completion UX

Cresciva asks only for missing decision-critical facts. It may say:

```text
Add your business stage to confirm stage eligibility.
Add your funding target to compare award ranges.
Choose the funding types you prefer.
```

It must **not** claim invented improvements such as `+8% precision` unless a measured experiment supports that number.

## 3. Opportunity provenance

Every primary opportunity must have controlled source evidence independent of model output.

Key fields include:

```text
source_url
source_name
source_retrieved_at
source_fingerprint
verification_status
last_verified_at
```

Changing authoritative source evidence invalidates prior verification/current-cycle trust until fresh checks succeed.

AI output cannot promote itself to verified.

## 4. Current-cycle status

Verification and current application status are separate facts.

Application status is one of:

```text
open
closing_soon
rolling
upcoming
closed
paused
unknown
```

The source-refresh process is:

```text
registered source
   ↓
safeExternalFetch
   ↓
HTTP/content/body limits
   ↓
source fingerprint
   ↓
evidence-only AI signal extraction
   ↓
deterministic conflict detection
   ↓
deterministic status classification
   ↓
append-only source check
   ↓
canonical current-cycle update
```

A future deadline alone does not prove OPEN. Missing deadline does not mean ROLLING. Conflicting source signals fail closed to UNKNOWN.

### Freshness windows

| State | Maximum age before effective UNKNOWN |
| --- | ---: |
| Closing soon | 6h |
| Open | 24h |
| Rolling | 48h |
| Upcoming | 24h |
| Closed | 7d |
| Paused | 24h |
| Unknown | 12h |

Read paths recompute effective freshness; an old stored `open` value cannot remain Open for you because a scheduler stopped.

## 5. Eligibility

Eligibility is evaluated before the primary paid application gate.

```text
eligible
possibly_eligible
insufficient_information
ineligible
```

Known hard failures such as geography/stage mismatch exclude the record from primary recommendations. Unknown criteria cause abstention or Watchlist treatment rather than optimistic eligibility.

## 6. Recommendation scoring

Match score, source confidence and application readiness are separate concepts.

- **Match score:** relevance to the member.
- **Confidence:** quality/freshness of the underlying opportunity evidence.
- **Readiness:** how prepared the member is to apply.

A closed programme can still be a high conceptual match. Availability does not change the underlying fit score.

## 7. Primary paid gate

A record enters `Open for you` only when:

```text
discovery_source = verified_feed
AND verification_status = verified
AND current-cycle status is fresh
AND application_status IN (open, closing_soon, rolling)
AND eligibility_status = eligible
```

Only after those gates pass does match score determine ranking.

The application CTA additionally requires a valid source-derived `application_url`.

## 8. Funding Radar surfaces

### Open for you

The core paid list: verified, fresh, currently accepting applications, and deterministically eligible.

### Closing soon

A subset of Open for you whose source-confirmed current deadline is inside the 14-day urgency window.

### Watchlist

Verified records worth monitoring but unsafe for Apply now, including:

- upcoming programmes;
- paused programmes;
- stale or status-unknown programmes;
- open programmes requiring missing eligibility facts.

### Explore

Intentional discovery space for:

- verified closed/ineligible/non-primary records;
- explicit search;
- AI-assisted discoveries.

AI discovery remains Explore-only until authoritative verification upgrades the canonical record.

## 9. Opportunity Search

Search is verified-first and secondary to automatic recommendations.

The current result UI separates exactly:

```text
Verified current matches
Other verified records
AI discoveries
```

`Verified current matches` requires verified source provenance plus a fresh Open/Closing-soon/Rolling cycle.

`Other verified records` contains curated records outside that current trust class.

`AI discoveries` are forcibly unverified/current-status-unknown in the UI even if model-shaped data tries to claim OPEN.

Search cards never receive primary application eligibility automatically; the member-specific Funding Radar gate owns that decision.

## 10. Card truth hierarchy

A paid recommendation card keeps the following concepts visually separate:

1. match score;
2. deterministic eligibility;
3. current application status;
4. source verification/freshness;
5. title/funder and award information;
6. match reasons;
7. confirmed current deadline or rolling status;
8. missing eligibility facts/blockers;
9. workflow state;
10. official actions.

### Application CTA

The primary action is:

```text
Apply on official site
```

It is shown only after the full primary gate passes. `Official source` remains available for source inspection when a safe source URL exists.

## 11. Truthful zero state

Zero primary recommendations is valid.

The current Funding Radar copy is:

> **You’re not currently eligible for any verified open opportunities.**
>
> We’ll keep checking verified sources. Review Watchlist for upcoming programs or missing profile details.

Cresciva must not pad this state with closed, stale, unverified or AI-generated records.

## 12. Member workflow

`member_opportunity_state` is member-local under owner-only RLS:

```text
saved
preparing
applied
won
rejected
dismissed
```

This state never mutates canonical verification, application status or eligibility.

The first `applied` transition stamps `applied_at`. Later won/rejected/saved/preparing/dismissed updates preserve that original application timestamp.

## 13. Funding notifications

High-signal notification events are:

```text
watchlist_opened
closing_soon
deadline_changed
```

The authoritative source-refresh worker enqueues transition events only after successful deterministic status persistence, using the source-check UUID as the transition/dedupe key.

The delivery worker:

1. authenticates the scheduler with `FUNDING_NOTIFICATION_SECRET`;
2. leases at most 25 queue rows with `FOR UPDATE SKIP LOCKED`;
3. re-checks member state (`saved|preparing`);
4. re-checks notification preferences;
5. re-checks the opportunity is published, verified and current-status fresh;
6. suppresses events that are no longer relevant;
7. dispatches through the existing Resend/email funnel;
8. uses `funding-alert:<event-id>` as the transport idempotency key;
9. retries bounded failures and records attempt/error state.

Raw source bodies are never notification payloads.

## 14. Analytics/privacy

Funding lifecycle events include:

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
funding_search
```

The shared analytics boundary removes blocked raw-content keys, bounds strings/arrays/object depth, and is intended for identifiers, scores, statuses and aggregate counts — not raw search text or fetched third-party page bodies.

## 15. Accuracy certification

Repository evaluation has two modes.

### Engineering mode

Synthetic/fixed fixtures exercise deterministic identity, status, eligibility, ranking, provenance and anti-gaming rules.

### Production certification mode

Requires the full human-adjudicated corpus and, when explicitly requested, live authoritative-link checks.

Live-link checks require:

```text
--certification --live-links
ALLOW_FUNDING_LIVE_EVAL=1
```

They reuse the production `safeExternalFetch` boundary with Node DNS injected, preserving the same HTTP(S), redirect, DNS/private-network, timeout, content-type and body-size controls.

The release thresholds remain:

- current-open precision >=98%;
- confirmed-deadline source coverage =100%;
- hard eligibility false positives <2%;
- Precision@5 >=80%;
- AI promotion to verified/open =0;
- stale OPEN leakage =0;
- primary authoritative source coverage >=95%;
- broken primary authoritative links <1% in live certification.

## Implementation status

### Repository

Implemented:

- Business Enrichment Engine and member confirmation;
- provenance/source registry;
- deterministic Opportunity Status Engine and freshness;
- deterministic eligibility/matching;
- Funding Radar four-surface gate;
- trust-separated Opportunity Search;
- member workflow state;
- notification preferences, transition queue and delivery worker;
- analytics/privacy events;
- deterministic evaluation + explicit live-link evaluation mode;
- targeted CI/certification workflows.

### Still external / not production-certified

- migrations and functions deployed to the real Cresciva Supabase project `dwyglydswegyvjowzdot`;
- real provider/scheduler secrets configured;
- source-refresh and notification schedules exercised in staging/live;
- real Resend funding-alert delivery smoke tests;
- human-adjudicated production corpus at required minimum size;
- live authoritative-link certification over real source records;
- current GitHub Actions execution on the final branch head (Actions is presently failing before checkout with `steps: null`);
- production merge/cutover.

Therefore the correct release claim is:

> **Repository implementation is substantially complete; live Funding Intelligence remains BLOCKED_EXTERNAL and is not production-certified.**
