# Cresciva Funding Intelligence Engine Index

## Product promise

Cresciva's paid funding intelligence is built to answer:

> **Who is this organisation, which real funding programmes are current, which ones can this organisation actually apply for, and why are they a strong match?**

No single model owns that answer. Cresciva separates identity, source truth, current-cycle status, eligibility, ranking and subscriber presentation into independently testable engines.

---

## Engine map

```text
Organisation name
      |
      v
BUSINESS ENRICHMENT ENGINE
identity + public evidence + member confirmation
      |
      v
CONFIRMED FUNDING PROFILE
      |
      +--------------------------------+
                                       |
AUTHORITATIVE FUNDING SOURCES          |
      |                                |
      v                                |
PROVENANCE / SOURCE REFRESH            |
      |                                |
      v                                |
OPPORTUNITY STATUS ENGINE              |
verified? current cycle? open now?     |
      |                                |
      +---------------+----------------+
                      |
                      v
HARD ELIGIBILITY ENGINE
                      |
                      v
RECOMMENDATION ENGINE
fit + source confidence + readiness + reasons
                      |
                      v
CORE SUBSCRIPTION FUNDING EXPERIENCE
Open for you / Closing soon / Watchlist / Explore
                      |
                      v
MEMBER OUTCOMES + EVALUATION
```

---

## Engine manuals

### Business Enrichment

`docs/product/BUSINESS-ENRICHMENT-ENGINE.md`

Owns:

- organisation identity resolution;
- authoritative/controlled/secondary public evidence;
- structured public-business fact extraction;
- field-level evidence/confidence;
- ambiguity handling;
- member confirmation.

Does **not** recommend funding or infer sensitive personal facts.

### Opportunity Search

`docs/product/OPPORTUNITY-SEARCH-ENGINE.md`

Owns:

- explicit member search intent;
- verified-first candidate retrieval;
- deterministic search ranking;
- AI-assisted long-tail discovery;
- verified-result precedence and deduplication.

Does **not** make AI discoveries verified or prove that a current round is open.

### Opportunity Status

`docs/product/OPPORTUNITY-STATUS-ENGINE.md`

Owns:

- current-cycle evidence;
- `open`, `closing_soon`, `rolling`, `upcoming`, `closed`, `paused`, `unknown`;
- status freshness;
- source-check history;
- conflict handling.

`verified` is not synonymous with `open`.

### Recommendation

`docs/product/RECOMMENDATION-ENGINE.md`

Owns:

- hard eligibility;
- match score;
- source confidence;
- application readiness;
- deterministic ranking;
- match/blocker/missing-information explanations.

A high match score cannot bypass an eligibility or current-cycle gate.

### Core Subscription Flow

`docs/product/CORE-SUBSCRIPTION-FUNDING-INTELLIGENCE-FLOW.md`

Owns the product composition:

- Open for you;
- Closing soon;
- Watchlist;
- Explore;
- CTA rules;
- zero-result behavior;
- save/apply/dismiss workflow;
- notification transition semantics.

---

## Primary paid recommendation rule

An opportunity can enter **Open for you** only when all are true:

```text
verification_status = verified
AND source/current-status evidence is fresh
AND application_status IN (open, closing_soon, rolling)
AND eligibility_status = eligible
```

Ranking happens **after** those truth gates.

Anything else is Watchlist, Explore, an eligibility prompt, or excluded.

---

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

---

## Release metrics

The production paid claim remains gated until the certification plan proves:

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

Repository tests alone do not certify live source accuracy. Live/staging source freshness and link checks are required before production PASS.
