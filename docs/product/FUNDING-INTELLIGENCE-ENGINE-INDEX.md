# Cresciva Funding Intelligence Engine Index

## Product promise

Cresciva's paid funding intelligence is built to answer:

> **Who is this organisation, which real funding programmes are current, which ones can this organisation actually apply for, and why are they a strong match?**

No single model owns that answer. Cresciva separates identity, source authority, source truth, current-cycle status, eligibility, ranking, search, member workflow, notifications and certification into independently testable layers.

## Engine map

```text
Organisation name / member profile
        ↓
BUSINESS ENRICHMENT ENGINE
identity + public evidence + member confirmation
        ↓
CONFIRMED FUNDING PROFILE
        ↓
AUTHORITATIVE SOURCE REGISTRY
active staff-approved origins
        ↓
PROVENANCE + SOURCE REFRESH
        ↓
OPPORTUNITY STATUS ENGINE
verified? current cycle? open now?
        ↓
HARD ELIGIBILITY ENGINE
        ↓
RECOMMENDATION ENGINE
fit + confidence + readiness + reasons
        ↓
PRIMARY FUNDING GATE
verified + fresh + current + eligible
        ↓
FUNDING RADAR
Open for you / Closing soon / Watchlist / Explore
        ├─────────────→ OPPORTUNITY SEARCH
        │               verified current / other verified / AI discovery
        ↓
MEMBER WORKFLOW
saved / preparing / applied / won / rejected / dismissed
        ↓
TRANSITION NOTIFICATION ENGINE
queue → preference/state/trust recheck → email dispatch
        ↓
FUNDING INTELLIGENCE CERTIFICATION
engineering benchmark + human/live certification mode
```

## Engine manuals

### Business Enrichment

`docs/product/BUSINESS-ENRICHMENT-ENGINE.md`

Owns organisation identity resolution, bounded public evidence, structured public-business fact extraction, ambiguity handling and member confirmation.

Does **not** recommend funding or infer sensitive personal facts.

### Authoritative Source Registry

`docs/product/AUTHORITATIVE-SOURCE-REGISTRY.md`

Owns the allowlist of staff-approved funding-source origins that may participate in verification/current-cycle truth.

A valid HTTP(S) URL is not sufficient. `verified` requires an active registry-backed source plus opportunity-specific evidence and a verification timestamp. Disabling/changing a source revokes dependent verification/current-cycle trust and requires a fresh recheck.

### Opportunity Search

`docs/product/OPPORTUNITY-SEARCH-ENGINE.md`

Owns explicit search intent, verified-first retrieval/ranking, deterministic deduplication and AI-assisted long-tail discovery.

User-facing groups are:

```text
Verified current matches
Other verified records
AI discoveries
```

Search does not grant primary application eligibility.

### Opportunity Status

`docs/product/OPPORTUNITY-STATUS-ENGINE.md`

Owns current-cycle evidence and:

```text
open | closing_soon | rolling | upcoming | closed | paused | unknown
```

It also owns freshness, append-only source-check history and conflict handling.

`verified` is not synonymous with `open`.

### Recommendation

`docs/product/RECOMMENDATION-ENGINE.md`

Owns hard eligibility, match score, source confidence, readiness, deterministic ranking and match/blocker/missing-information explanations.

A high match score cannot bypass eligibility/current-cycle gates.

### Core Subscription Flow

`docs/product/CORE-SUBSCRIPTION-FUNDING-INTELLIGENCE-FLOW.md`

Owns composition of the four Funding Radar surfaces, truthful zero state, application CTA rules, member workflow, notifications, analytics/privacy and certification relationship.

### Funding Radar implementation status

`docs/product/FUNDING-RADAR-SUBSCRIPTION.md`

Tracks repository implementation versus external/live production evidence.

## Notification engine

Source refresh owns the authoritative transition. After successful canonical persistence it passes previous/next status and deadline plus the source-check UUID into the deduplicating queue RPC.

Delivery then:

1. leases a bounded queue batch;
2. rechecks `saved|preparing` member state;
3. rechecks member preferences;
4. rechecks published/verified/current freshness;
5. suppresses stale/irrelevant transitions;
6. sends through the existing email dispatch/Resend funnel;
7. uses `funding-alert:<event-id>` transport idempotency;
8. records bounded retry state;
9. terminalizes an abandoned exhausted lease instead of leaving a pending zombie row.

Notification state never changes opportunity truth.

## Primary paid recommendation rule

An opportunity can enter **Open for you** only when all are true:

```text
discovery_source = verified_feed
AND source_url matches an active authoritative funding_sources registry origin
AND verification_status = verified
AND source/current-status evidence is fresh
AND application_status IN (open, closing_soon, rolling)
AND eligibility_status = eligible
```

Ranking happens **after** those gates.

The application CTA additionally requires a valid authoritative `application_url` and is labelled **Apply on official site**.

## Certification

Two different evaluation modes exist.

### Engineering evaluation

Fixed/synthetic fixtures test deterministic behavior and regression boundaries.

### Production certification

Requires the minimum human-adjudicated corpus plus real/staging authoritative-source evidence. Explicit live-link mode uses the same `safeExternalFetch` boundary as source refresh with Node DNS injected.

Certification evidence:

`docs/production-readiness/evidence/funding-intelligence-certification.md`

## Implementation plans

Master execution:

`docs/superpowers/plans/2026-08-22-funding-intelligence-p0-master.md`

Mandatory execution clarification:

`docs/superpowers/plans/2026-08-22-funding-intelligence-plan-clarifications.md`

Subsystem plans:

1. `docs/superpowers/plans/2026-08-22-business-enrichment-engine.md`
2. `docs/superpowers/plans/2026-08-22-open-opportunity-verification-engine.md`
3. `docs/superpowers/plans/2026-08-22-core-funding-subscription-experience.md`
4. `docs/superpowers/plans/2026-08-22-funding-intelligence-accuracy-certification.md`

Approved architecture:

`docs/superpowers/specs/2026-08-22-business-to-funding-intelligence-design.md`

## Release metrics

The production paid claim remains gated until the live certification proves:

```text
0 wrong automatic identity selections in acceptance corpus
>=95% authoritative source coverage for primary recommendations
>=98% precision for Open/Closing Soon/Rolling
100% source coverage for confirmed deadlines
<2% hard eligibility false positives
>=80% Precision@5 recommendation usefulness
<1% broken primary official-source links
0 AI discoveries promoted to verified/open primary results
0 stale OPEN records in primary output
```

Repository implementation/tests do not certify live source accuracy. Live/staging deployment, active registry population, human adjudication, source freshness and link checks are required before production PASS.
