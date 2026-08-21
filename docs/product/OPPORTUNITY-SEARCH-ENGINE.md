# Cresciva Opportunity Search Engine

## What it does

The Opportunity Search Engine answers:

> **Given what a member explicitly asks for, which verified opportunities can Cresciva find, and what additional AI-assisted discoveries might be worth exploring?**

The engine is intentionally **verified-first**. AI is a long-tail discovery fallback, not the source of truth.

## Architecture

```text
Member query
   |
   v
Normalize + validate
   |
   v
Search curated Cresciva opportunity feed
   |
   +---- strong verified matches available ----> return them
   |
   v
AI-assisted discovery
   |
   v
Schema validation + URL sanitization
   |
   v
Force unverified trust metadata
   |
   v
Deduplicate against verified results
   |
   v
Verified results first + AI discoveries second
```

## Why verified-first matters

The previous Deep Search architecture sent the user's keywords directly to a model and asked it to remember a fixed number of real opportunities. That was useful as an exploratory prototype but created four accuracy risks:

1. model memory could be stale;
2. minimum-result quotas encouraged padding;
3. an unknown deadline could be guessed from a historic cycle;
4. safe URL syntax could be mistaken for factual verification.

V2 uses Cresciva's own curated opportunity dataset before making any model call.

## Query normalization

The member query is:

- trimmed;
- capped at 200 characters;
- normalized for cache identity;
- tokenized for deterministic verified-feed matching.

Raw query text remains in the user's existing search cache/record because it is part of the product interaction. Analytics should record only aggregate search outcomes rather than duplicating raw business intent into general analytics events.

## Verified-feed search

Search examines published `funding_opportunities` and weights the following evidence:

| Field | Relative importance |
| --- | --- |
| tags | very high |
| country focus | very high |
| title | high |
| funder | medium-high |
| opportunity type | medium |
| summary | medium |
| eligibility | medium |

A published opportunity with no meaningful overlap is not returned merely because it is recent or featured.

The search output is capped so users receive a useful shortlist rather than an unranked dump.

## Verified-result trust metadata

A verified-feed result carries:

```ts
{
  discovery_source: "verified_feed",
  verification_status: "verified" | "stale" | "unverified",
  source_checked_at: string | undefined
}
```

`verified` requires a recent verification timestamp under the current V1 contract. The later Funding Provenance phase will make the criteria stricter by requiring official-source evidence.

## AI fallback

AI is called only when verified search cannot satisfy the long-tail request strongly enough.

The model is instructed to:

- return **up to 10** results;
- return zero results when it cannot identify useful programs;
- prefer precision over breadth;
- never invent a program, funder, amount, URL or past recipient;
- never infer a current deadline from a historic/typical closing month;
- leave an unknown current deadline empty;
- never claim that a result is verified.

After parsing, Cresciva overwrites trust metadata so every model result becomes:

```ts
{
  discovery_source: "ai_assisted",
  verification_status: "unverified"
}
```

This is enforced by code rather than trusted to the prompt.

## Validation

All opportunities pass the same Zod boundary before persistence/rendering.

Validation currently ensures:

- title and funder are present;
- string lengths are bounded;
- arrays are bounded;
- external links are only `http:` or `https:`;
- malformed items can be dropped without crashing valid siblings.

This protects the application from malformed/model-hostile output.

It does **not** prove that a program exists. Factual verification is a separate provenance responsibility.

## Deduplication

When verified and AI results are combined, verified records win.

Candidates are deduplicated using conservative identity signals:

1. normalized program URL when available;
2. otherwise normalized `title + funder` identity.

An AI result may not replace or overwrite a verified Cresciva record.

## Caching and cost control

Existing controls remain:

- active membership required;
- normalized per-user cache;
- seven-day cache window;
- cache hits do not consume an AI call;
- maximum three uncached AI searches per user per hour;
- 60-second server-side AI timeout;
- 90-second client-side stop.

Verified-feed-only results should be inexpensive and should not count as an AI-generation event.

## UI trust classes

### Verified source

```text
VERIFIED SOURCE
AECF Climate Fund
Checked 2 days ago
```

The official program action is visible immediately.

### Stale/needs recheck

```text
SOURCE NEEDS RECHECK
Last checked 18 days ago
```

### AI discovery

```text
AI DISCOVERY
Verify current details on the program site before applying.
```

AI discovery must not look visually identical to verified records.

## Search UX

### Input

The free-text field is a refinement tool, not the only personalization mechanism.

Preferred prompt:

> **What kind of opportunity are you looking for?**

Example:

> `climate grant for Nigerian agritech expansion`

### Loading

Use copy that matches the actual implementation:

> **Matching your request against Cresciva's funding intelligence…**

Do not claim live source retrieval until Cresciva actually performs it.

### Result ordering

1. verified strong matches;
2. verified weaker matches;
3. AI-assisted discoveries.

Within each class, relevance determines order.

## Accuracy rules

1. Search may return zero results.
2. No minimum list size is required.
3. Current-cycle deadlines are never fabricated.
4. Verified data always outranks equivalent AI discovery.
5. AI-generated links are safe-to-render only after schema validation, but remain factually unverified.
6. Cached AI output retains its unverified status for the entire cache lifetime.
7. Search UI must expose the trust class before the user decides to apply.

## Relationship with Recommendation Engine

Opportunity Search does not decide the member's full suitability. It answers an explicit query.

Recommendation Engine may reuse the same verified candidate store, then apply profile eligibility and match scoring:

```text
Search:          query   -> candidates -> relevance
Recommendation: profile -> candidates -> eligibility -> fit
```

The engines therefore share opportunity data and UI building blocks but keep separate logic and metrics.

## Future source-backed search

The next provenance iteration can add live/periodic source retrieval:

```text
Curated source registry
  -> bounded fetch
  -> extraction
  -> canonicalization
  -> verification
  -> daily refreshed opportunity knowledge base
```

When that exists, Deep Search can query current source evidence instead of relying on model memory for the long tail.
