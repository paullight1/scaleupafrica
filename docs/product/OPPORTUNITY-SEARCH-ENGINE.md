# Cresciva Opportunity Search Engine

## Purpose

The Opportunity Search Engine answers:

> **Given what a member explicitly asks for, which Cresciva records match that intent, which of those are source-verified/current, and what additional AI discoveries may be worth investigating?**

Search is **verified-first**. AI is a long-tail discovery fallback and never owns source truth, current-cycle status or member eligibility.

## Current architecture

```text
Member query
   ↓
trim / cap / normalize
   ↓
search published Cresciva opportunity records
   ↓
deterministic relevance scoring
   ↓
>= 5 useful curated matches?
   ├─ yes → return without AI
   └─ no
        ↓
   optional AI discovery (0–10)
        ↓
   schema / URL validation
        ↓
   force AI trust = unverified + current status unknown
        ↓
   verified-first dedupe
        ↓
UI trust grouping
   ├─ Verified current matches
   ├─ Other Cresciva records
   └─ AI discoveries
```

The Supabase Edge implementation is `supabase/functions/aggregate-funding/index.ts`. The optional NestJS path mirrors verified-first behavior in `Backend/src/funding/funding.service.ts`.

## Separation from Recommendation Engine

Search and recommendations answer different questions.

```text
Search:
explicit query → relevance → current/curated/AI discovery groups

Recommendation:
confirmed member profile → hard eligibility → fit/confidence/readiness
```

Search **never** grants the member-specific primary application CTA. Even a verified-current Search card receives `primaryApplyEligible=false`; the Funding Radar profile gate owns `Apply on official site`.

## Query handling

Queries are trimmed, capped at 200 characters, normalized for deterministic cache identity, and tokenized for curated relevance scoring.

Raw query text may exist in the member-owned search/cache record because it is needed to reproduce that interaction. General analytics stores aggregate result/trust counts, not raw query text.

## Curated relevance scoring

Search examines published Cresciva opportunity records before considering AI.

| Evidence | Weight |
| --- | ---: |
| tag | +8 |
| country focus | +8 |
| title | +6 |
| funder | +4 |
| opportunity type | +3 |
| summary | +2 |
| eligibility | +2 |

Strong phrase matches receive additional boosts. Zero-overlap records are excluded. Stable deterministic ordering is used for ties.

## Source and current-cycle truth

P0-B provides controlled provenance/current-cycle fields such as:

```text
source_url
verification_status
last_verified_at
application_status
status_checked_at
application_url
deadline_at
deadline_status
```

Search consumes those fields; it does not derive current truth from free-form AI text.

### Verified current match

A Search record enters **Verified current matches** only when:

```text
discovery_source = verified_feed
AND verification_status = verified
AND application_status IN (open, closing_soon, rolling)
AND status_checked_at is inside that status's freshness window
```

### Other Cresciva record

Every non-AI curated record outside the verified-current class is shown under **Other Cresciva records**. This group may contain:

- verified upcoming/closed/paused records;
- stale records whose source needs recheck;
- curated records whose verification was invalidated after a source change;
- current-status-unknown curated records.

The card itself continues to display the exact `verified / stale / unverified` trust badge. The group name deliberately does **not** imply every row is currently verified.

### AI discovery

AI results are forced to:

```text
discovery_source = ai_assisted
verification_status = unverified
application_status = unknown
status_checked_at = undefined
application_url = null
```

This overwrite happens in code after model output. A model cannot promote itself to `OPEN` by emitting trusted-looking fields.

## AI fallback

AI is called only when curated search is insufficient and the AI path is available within quota.

The discovery contract permits 0–10 candidates, allows zero results, forbids filler/fabricated fields, forbids historical deadline substitution, and forbids trusted verification/current/open claims.

If useful curated matches already exist, Cresciva returns them rather than failing the entire search when AI is unavailable, rate-limited, timed out or malformed.

## Cache behavior

AI-assisted search uses the normalized per-user cache and quota ledger.

Legacy cached rows that predate provenance are treated conservatively. If `discovery_source` is absent, the UI normalizes them to:

```text
AI-assisted
unverified
current status unknown
no primary application URL
```

## Deduplication

Curated records enter dedupe before AI results, so canonical Cresciva records win collisions.

Identity uses canonical program URL when available, otherwise normalized `title + funder`. Tracking parameters/fragments are removed while meaningful program parameters remain distinct.

## User-facing groups

### Verified current matches

Source-verified Cresciva records with a fresh current Open/Closing-soon/Rolling cycle.

### Other Cresciva records

Curated records outside the verified-current class. Trust remains visible per card and is never upgraded by the group heading.

### AI discoveries

Long-tail candidates that have not yet passed authoritative-source verification/current-cycle checks.

Example result summary:

```text
9 results · 4 verified current · 2 other Cresciva · 3 AI discoveries
```

Only records with `verification_status=verified` contribute to `verified_count` analytics; stale/unverified curated records no longer inflate that metric.

## Search UI rules

The input asks:

> **What kind of opportunity are you looking for?**

Loading copy is truthful:

> **Matching your request against Cresciva's funding intelligence…**

If there are no reliable matches, Cresciva says so rather than padding the list.

## Application CTA rule

Opportunity Search is exploratory. The Search component explicitly passes:

```text
primaryApplyEligible = false
```

Therefore Search results can expose `Official source` for inspection but cannot independently show the paid **Apply on official site** treatment.

To get the member-specific application CTA, the canonical record must pass:

```text
verified + fresh + current + hard eligible + valid application URL
```

## Analytics/privacy

`funding_search` records aggregate metadata including:

```text
result_count
verified_current_count
other_curated_count
verified_count
ai_count
cached
```

The shared analytics sanitizer drops raw-query/source-body/page-content keys and bounds retained metadata.

## Accuracy invariants

1. Zero results are valid.
2. No result-count quota forces padding.
3. Current deadlines are never replaced by historical/typical dates.
4. Curated records win dedupe collisions with AI.
5. AI output remains unverified/current-status-unknown until canonical verification.
6. Free-form details cannot promote trust.
7. Stale current-cycle state cannot remain “verified current.”
8. Search cannot bypass member eligibility/application gating.
9. Stale/unverified curated rows are never labelled “verified” merely because they are in Cresciva's database.

## Tests and certification

Targeted repository tests cover deterministic search ranking, verified-first AI bypass, deduplication, AI prompt/trust invariants, stale/cache normalization, three-group ordering/counts, stale curated labelling, model-shaped OPEN suppression and primary application CTA disablement inside Search.

These tests are included in the Funding Intelligence Certification workflow.

## Current release status

**Repository behavior:** implemented.

**Fresh executable verification:** `BLOCKED_EXTERNAL` because GitHub Actions jobs on the current P0 branch fail before checkout/setup (`steps: null`) and produce no downloadable job log blob.

**Live source certification:** `BLOCKED_EXTERNAL` until the real Cresciva Supabase source registry/refresh scheduler and human/live certification environment are deployed.

Do not interpret repository implementation as proof that every live funding result is current until those external gates pass.
