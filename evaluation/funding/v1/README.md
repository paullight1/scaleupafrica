# Funding Intelligence Evaluation Corpus v1

This directory is the versioned evidence input for Cresciva's Funding Intelligence evaluation.

## Two evidence modes

### Engineering mode

Fixtures marked `synthetic_engineering` exist to exercise deterministic code paths, metrics, regression boundaries, and CI wiring. They are **not evidence that real funders or organisations were human-reviewed** and must never be used to claim production accuracy.

Minimum engineering corpus:

- 20 organisation identity cases;
- 40 opportunity-cycle cases;
- 20 eligibility pairs;
- 10 recommendation candidate pools.

### Certification mode

Production certification requires fixtures marked `human_adjudicated`, two distinct human reviewer IDs per P0 label, and the fixed minimum corpus:

- >=100 organisation identity cases;
- >=200 opportunity-cycle cases;
- >=150 organisation/opportunity eligibility pairs;
- >=50 recommendation candidate pools.

The validator intentionally rejects `synthetic_engineering` fixtures in certification mode.

## Labels

Identity:

- `resolved`
- `ambiguous`
- `not_found`

Application status:

- `open`
- `closing_soon`
- `rolling`
- `upcoming`
- `closed`
- `paused`
- `unknown`

Eligibility:

- `eligible`
- `insufficient_information`
- `ineligible`

Relevance:

- `0` irrelevant
- `1` weak
- `2` relevant
- `3` highly relevant

## Provenance rules

- Resolved identity cases require at least one evidence URL.
- Confirmed deadline cases require a current-cycle deadline and authoritative source URL.
- Eligibility labels require a source URL supporting the hard criterion being evaluated.
- Full third-party source pages are not copied into the repository. Keep URLs and bounded fact/excerpt metadata only.
- An LLM cannot be recorded as a human reviewer.
- Reviewer disagreement must be adjudicated before a fixture can be changed to `human_adjudicated`.

## Versioning

Labels and thresholds are frozen per benchmark version. If the rubric, thresholds, or label interpretation changes, create a new benchmark version rather than editing history to make a failing model pass.

## Current repository state

The v1 repository corpus begins as an engineering acceptance corpus. Production certification remains `BLOCKED_EXTERNAL` until genuine dual-human adjudication and live/staging source checks are available.
