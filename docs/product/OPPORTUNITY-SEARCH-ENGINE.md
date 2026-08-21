# Cresciva Opportunity Search Engine

## What it does

The Opportunity Search Engine answers:

> **Given what a member explicitly asks for, which Cresciva-curated opportunities match now, and what additional AI-assisted discoveries may be worth exploring?**

The engine is **curated/verified-first**. AI is a long-tail discovery fallback, not the source of truth.

## Implemented V2 architecture

```text
Member query
   |
   v
Trim + cap + normalize
   |
   v
Existing AI-containing cache?
   | yes
   +----------------------------> return cached result with conservative trust normalization
   |
   no
   v
Search up to 100 published Cresciva opportunities
   |
   v
Deterministic relevance scoring
   |
   +---- >=5 strong curated matches ----> return them without AI
   |
   v
AI quota / provider available?
   | no
   +----------------------------> return partial curated matches if any
   |
   yes
   v
AI-assisted long-tail discovery (0-10)
   |
   v
Schema validation + URL sanitization
   |
   v
Force `ai_assisted + unverified`
   |
   v
Verified-first dedupe
   |
   v
Return curated matches first + AI discoveries second
```

The Supabase Edge implementation is `supabase/functions/aggregate-funding/index.ts`. The optional NestJS API implements the same verified-first behavior in `Backend/src/funding/funding.service.ts` so a future API cutover does not regress search semantics.

## Why verified-first matters

The old Deep Search path asked a model to remember a fixed number of opportunities. That prototype created four major accuracy risks:

1. model memory could be stale;
2. minimum-result quotas encouraged padding;
3. an unknown deadline could be replaced by a historic/typical cycle;
4. syntactically safe URLs could be mistaken for factual verification.

V2 searches Cresciva's curated dataset first and can return reliable matches even if the AI gateway is unavailable.

## Query normalization

The member query is:

- trimmed;
- capped at 200 characters;
- normalized for cache identity;
- tokenized for deterministic curated-feed matching.

Raw query text remains in the member-owned funding search record/cache because it is required to reproduce the product interaction. General analytics receives only aggregate counts and trust mix, not the raw query.

## Curated-feed search

The engine scans up to **100 published** `funding_opportunities` records and scores query overlap.

Current per-token weights:

| Evidence | Weight |
| --- | ---: |
| tag | +8 |
| country focus | +8 |
| title | +6 |
| funder | +4 |
| opportunity type | +3 |
| summary | +2 |
| eligibility | +2 |

An exact normalized phrase in the title adds `+8`; an exact phrase in the summary adds `+4`.

Zero-overlap records are excluded. Ordering is stable for equal scores.

The search helper also produces deterministic reasons such as:

- `Available in nigeria.`
- `Matches climate, agritech focus.`
- `Program title matches climate.`

## Curated trust metadata

Curated search results are classified in code after parsing so free-form `details` JSON cannot spoof provenance fields.

```ts
{
  discovery_source: "verified_feed",
  verification_status: "verified" | "stale" | "unverified",
  source_checked_at?: string,
  match_reasons: string[]
}
```

Current V2 classification is deliberately conservative:

- usable program/source URL + `last_verified_at <= 7 days` -> `verified`;
- usable URL + older `last_verified_at` -> `stale`;
- missing URL or missing/invalid verification timestamp -> `unverified`.

This is a **curated-record trust state**, not yet proof that Cresciva fetched and cryptographically verified an official source page. The stricter official-source provenance model remains Phase 5 work.

## Strong curated-result threshold

When deterministic search produces at least **5** matching curated opportunities, the request returns immediately:

- no AI provider call;
- no AI quota consumed;
- no model latency;
- no model hallucination risk added to an already-useful result set.

If fewer than five curated matches exist, they are retained while AI may supplement the long tail.

## AI fallback

The model is constrained to discovery rather than verification.

Its current contract:

- `0-10` candidates;
- zero is explicitly valid;
- fewer strong candidates are preferred over padding;
- no fabricated funder, program, amount, URL, deadline or recipient;
- unknown **current** deadline -> empty string;
- no historic/typical closing-month substitution;
- no verified/current/open claim without genuine knowledge;
- no mandatory category or fellowship quota.

After parsing, Cresciva **overwrites** model trust metadata:

```ts
{
  discovery_source: "ai_assisted",
  verification_status: "unverified",
  source_checked_at: undefined,
  match_reasons: []
}
```

The model therefore cannot promote itself to verified by emitting a field.

## Graceful degradation

When curated matches already exist, Cresciva returns them rather than failing the whole search if:

- the AI key is missing on the Edge path;
- the user has exhausted AI-assisted search quota;
- the AI provider times out;
- the provider returns an error;
- AI output is malformed.

AI availability is no longer a prerequisite for useful curated search.

## Validation

All results pass the shared Opportunity schema before persistence/rendering.

The boundary constrains:

- title/funder shape;
- string lengths;
- bounded arrays;
- allowed trust enums;
- HTTP/HTTPS external links;
- malformed sibling records.

Schema validation proves that a result is safe enough to process/render. It does **not** prove a program exists.

## Deduplication

Curated records always enter dedupe before AI records and therefore win collisions.

Identity uses:

1. canonicalized program URL when available;
2. otherwise normalized `title + funder`.

URL canonicalization removes fragments and tracking parameters such as `utm_*`, `fbclid`, `gclid`, mailing IDs and referral parameters. It **preserves meaningful query parameters**, so URLs such as `?program=a` and `?program=b` are not incorrectly collapsed.

## Caching and cost control

Current behavior intentionally distinguishes curated-only from AI-assisted work.

### Curated-only result

A search returning >=5 strong curated matches is **not written to `funding_results` in V2**. That table currently doubles as the AI-result cache and AI-rate-limit ledger; writing cheap curated searches there would incorrectly consume AI quota.

### AI-assisted result

Combined curated + AI results use the existing per-user normalized cache:

- seven-day cache;
- repeat cache hit avoids another AI call;
- maximum three uncached AI-assisted searches per user per hour;
- 60-second server-side AI timeout;
- 90-second client-side stop.

A future schema can separate search-result caching from AI-usage accounting and then cache curated-only search independently.

### Legacy cache safety

Older cached rows predate provenance metadata. If `discovery_source` is absent, V2 treats the item conservatively as:

```ts
ai_assisted + unverified
```

rather than allowing an old model result to look neutral or verified.

## UI trust classes

### Verified source

```text
VERIFIED SOURCE
Checked 2 days ago
```

### Source needs recheck

```text
SOURCE NEEDS RECHECK
Checked 18 days ago
```

### AI discovery

```text
AI DISCOVERY · UNVERIFIED
```

The official program/source action is visible on the collapsed card. AI discovery never uses the verified treatment merely because it has a URL.

## Search UX

The input now asks:

> **What kind of opportunity are you looking for?**

Example:

> `climate grant for Nigerian agritech expansion`

Loading copy reflects the actual system:

> **Matching your request against Cresciva's funding intelligence…**

The UI does not claim live funder-page retrieval before that capability exists.

Result summaries expose trust mix, for example:

> `9 opportunities found · 6 verified · 3 AI discoveries.`

The empty state explicitly permits a small or zero list rather than padding uncertain opportunities.

## Analytics

`funding_search` stores aggregate metadata only:

- result count;
- verified count;
- AI count;
- cached flag.

`opportunity_source_click` records source interaction. Raw query text is not duplicated into the general analytics table.

## Accuracy rules

1. Search may return zero results.
2. No minimum list size is required.
3. Current-cycle deadlines are never replaced with historic/typical deadlines.
4. Curated results always outrank equivalent AI discoveries.
5. AI-generated links remain factually unverified after URL sanitization.
6. Cached AI output retains unverified trust unless a separate source-verification process upgrades a canonical opportunity record.
7. Free-form details cannot assign verified trust.
8. The UI exposes trust class before the user chooses to apply.

## Verification

Tests cover deterministic relevance weights, zero-overlap exclusion, field-level match reasons, tracking-parameter dedupe, meaningful-query preservation, verified-first API bypass, AI prompt invariants, schema trust enums and AI trust-label UI.

The full repository workspace gate has passed with V2, and a branch-head diagnostic confirmed all seven active Edge Functions pass `deno check`. The normal PR CI is the final release evidence source after documentation reconciliation.

## Relationship with Recommendation Engine

```text
Search:          query   -> curated candidates -> relevance -> optional AI discovery
Recommendation: profile -> curated candidates -> eligibility -> fit/confidence
```

The engines share opportunity data and UI building blocks but deliberately keep separate intent, ranking and trust semantics.

## Next source-accuracy layer

Phase 5 remains necessary for true official-source provenance:

```text
Curated source registry
  -> bounded fetch
  -> extraction
  -> canonicalization
  -> official-source verification
  -> daily refreshed opportunity knowledge base
```

Once that exists, the AI fallback can consume retrieved evidence instead of model memory for long-tail discovery.
