# Cresciva Authoritative Source Registry

## Purpose

The source registry is the trust boundary between **a URL Cresciva can reach** and **a source Cresciva is allowed to treat as authoritative funding evidence**.

A syntactically valid HTTP(S) URL is not enough to make an opportunity verified.

The paid Funding Radar may only rely on a source when its origin is present in the active staff-managed `funding_sources` registry.

## Core invariant

```text
HTTP(S) URL
    ↓
active funding_sources registry match?
    ├─ NO → unverified / current status unknown
    └─ YES
         ↓
      bounded source fetch
         ↓
      source evidence
         ↓
      deterministic verification/status rules
```

Registry membership is necessary but not sufficient for `verified`.

A record still needs the opportunity-specific verification timestamp and evidence. Likewise, a registered source does not make a programme `open`; the Opportunity Status Engine separately proves the current cycle.

## What the registry contains

Each source records:

- staff-controlled name;
- canonical/base URL;
- source type;
- optional country/tags;
- active flag;
- refresh interval;
- last check/success/error health metadata.

Only staff may manage the registry.

## Verification rule

`verification_status = verified` requires all of the following:

```text
source_url is valid HTTP(S)
AND source origin matches an active funding_sources entry
AND last_verified_at exists
```

The database provenance trigger enforces this rule. UI code cannot promote an arbitrary URL into verified state.

## Current-cycle rule

The service-role canonical status RPC also requires:

```text
source_id references an active funding_sources row
AND source_url matches the registered source origin
AND source_url passes the registry trust helper
```

The source-refresh worker applies an even narrower operational rule when a registry entry contains a path prefix: the fetched opportunity URL must be inside that registered path scope.

If there is no active registry match, the worker records:

```text
error_class = source_not_registered
classified_status = unknown
apply_canonical = false
```

It does not fetch the URL and does not advance verification/current-cycle state.

## Source changes

Changing a registered base URL revokes dependent trust.

Disabling a source also revokes dependent trust immediately.

Affected opportunities are reset to:

```text
verification_status = unverified
last_verified_at = null
application_status = unknown
status_checked_at = null
deadline_status = unknown
application_url = null
```

Re-enabling a source does **not** restore old trust. A fresh verification/recheck is required.

## Migration behavior

When the registry-backed rule is first deployed, previously `verified` opportunities without an active registry-backed source are downgraded to `unverified`.

This is deliberate fail-closed behavior. Before enabling the paid primary recommendation surface in production, staff must populate the authoritative source registry and re-verify/recheck legitimate opportunities.

## Relationship to other engines

```text
Funding Source Registry
        ↓ controls authority
Provenance Engine
        ↓ proves opportunity record
Opportunity Status Engine
        ↓ proves current cycle
Eligibility Engine
        ↓ proves member eligibility
Recommendation Engine
        ↓ ranks fit
Primary Funding Gate
```

The registry does not perform matching or eligibility.

## Operational requirements

Before production activation:

1. populate the registry with authoritative funder/programme origins;
2. review source types and active state;
3. re-verify existing curated opportunities;
4. run bounded source refresh;
5. resolve `source_not_registered` failures;
6. confirm source-health monitoring is operational;
7. run Funding Intelligence certification against live/staging authoritative evidence.

Repository implementation alone is not production verification evidence.
