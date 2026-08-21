# Cresciva Recommendation Engine

## What it does

The Recommendation Engine answers:

> **Which funding opportunities are the best fit for this specific Cresciva member, and why?**

It is intentionally different from Opportunity Search. Search starts from an explicit member query. Recommendations start from the member's business profile and Cresciva's curated opportunity feed.

## Implemented V2 architecture

```text
Member profile
  country
  sector
  keywords
  short/long business description
        |
        v
Feature extraction
        |
        v
Conservative hard eligibility
        |
        +---- known country mismatch ---> exclude + blocker
        |
        v
Normalized match score (0-100)
        |
        +---- geography (when known)
        +---- sector fit
        +---- keyword/tag fit
        +---- description fit
        |
        v
Separate confidence score
        |
        +---- verification recency
        +---- usable program/source URL
        +---- explicit geography
        +---- eligibility/structured details
        |
        v
Deterministic reasons
        |
        v
Ranked recommendations
        |
        +---- Dashboard
        +---- Funding Radar
        |
        v
Open / save / source-click analytics
```

The core implementation is `Frontend/src/lib/funding/recommendationEngine.ts`. Dashboard matching is an adapter over the same engine rather than a competing scoring implementation.

## Why the engine is deterministic

Cresciva does not ask an LLM to decide whether a member is eligible or to invent a numeric match score. V2 is deterministic so that:

- the same profile and opportunity produce the same result;
- a known hard eligibility mismatch cannot be overridden by persuasive AI text;
- every score can be explained;
- regression tests can protect ranking behavior;
- the system can later be benchmarked against human labels.

AI may later turn deterministic evidence into richer prose, but it does not own the eligibility verdict or score.

## Inputs

### Member profile

V2 currently uses fields that already exist in Cresciva:

- `country`
- `sector`
- `keywords[]`
- `short_description`
- `long_description`

Future funding-profile phases can add business stage, revenue, team size, company age, funding amount sought, equity/debt preferences and application readiness.

### Opportunity

V2 currently uses:

- `country_focus[]`
- `tags[]`
- `title`
- `funder`
- `summary`
- `eligibility`
- `type`
- `deadline`
- `url`
- `last_verified_at`
- `details` JSON where explicit structured values exist

The current generated Supabase funding type predates `details` and `last_verified_at`; the dashboard extends that row type locally until the real Cresciva project is available for trustworthy type regeneration.

## Step 1 — eligibility

Eligibility is evaluated before match scoring.

### Country rule

V2 is intentionally conservative:

- explicit member-country match -> `eligible`;
- `Africa`, `African`, `Pan-African`, `All`, and equivalent continent-wide focus -> `eligible`;
- explicit country list that excludes a known member country -> `ineligible` and match score `0`;
- explicit opportunity geography but missing member country -> `insufficient_information`;
- **missing opportunity geography -> `possibly_eligible`**, not automatically eligible.

Unknown opportunity geography receives **no geography match points**. Missing data is not converted into either a positive match or a hard rejection.

### Eligibility states

```ts
"eligible"
"possibly_eligible"
"insufficient_information"
"ineligible"
```

Additional hard rules should be added only when Cresciva has explicit structured source data for them.

## Step 2 — match score

The score is normalized to `0–100` using evaluable profile dimensions.

| Dimension | Maximum weight |
| --- | ---: |
| Geography | 30 |
| Sector fit | 25 |
| Keyword/tag fit | 25 |
| Business-description fit | 20 |
| **Total** | **100** |

### Geography

Full geography weight is awarded only when the member country is known **and** the opportunity explicitly supports that country or a Pan-African geography.

An explicit geographic mismatch excludes the recommendation.

### Sector fit

The engine normalizes and tokenizes member sector vs opportunity title, funder, type, summary, eligibility, tags and selected structured `details` fields. Small domain aliases improve basic vocabulary parity, for example `agritech -> agriculture` and `fintech -> finance`.

### Keyword fit

Profile keywords are compared with searchable opportunity tokens. Repeated keywords do not multiply the score.

### Business-description fit

Meaningful words from the short/long description are compared with opportunity evidence. Common stop words are ignored so generic English does not inflate the score.

## Step 3 — confidence score

**Match score and confidence score are intentionally separate.**

A program can be highly relevant while its Cresciva record needs rechecking.

Current confidence inputs are:

- base confidence: `10`;
- usable program/source URL: `+20`;
- explicit country focus: `+15`;
- eligibility text or structured details: `+15`;
- verification <=7 days: `+40`;
- verification <=30 days: `+25`;
- verification <=90 days: `+10`.

The score is bounded to `0–100`.

This is a **record-confidence heuristic**, not yet the full official-source provenance score planned in Phase 5.

## Step 4 — deterministic explanations

The engine emits evidence-backed reasons such as:

- `Nigeria is in the eligible geography.`
- `AgriTech & Food aligns with this program's focus.`
- `Matches your climate, agriculture interests.`

The UI renders only reasons produced by the engine.

## Ranking

Recommendations are ordered by:

1. eligibility state;
2. match score;
3. confidence score;
4. `featured` only as a final merchandising tie-break;
5. original stable feed order.

`featured` does not create relevance by itself.

Hard-ineligible records are omitted from the recommendation set, but the Funding Radar Explore feed can still show unmatched records below personalized matches rather than pretending every feed item is recommended.

## UI behavior

Dashboard and Funding Radar can show:

```text
92% match
VERIFIED SOURCE

Climate Smart Agriculture Growth Fund

Why it matches
✓ Nigeria is in the eligible geography.
✓ AgriTech & Food aligns with this program's focus.
✓ Matches your climate, agriculture interests.

[Learn more] [Official source]
```

If source confidence is weak, the UI can show `Source needs recheck` separately from the match percentage.

## Feedback loop

V2 uses the existing saved-opportunity system and adds aggregate product events:

- `recommendation_open`
- `recommendation_save` — emitted only after a successful save mutation
- `opportunity_source_click`

Recommendation events can include match/confidence/eligibility metadata. Raw Opportunity Search queries are not copied into general analytics.

Future signals can add `not_relevant`, application started/submitted, won and rejected states once the corresponding product workflows exist.

## Accuracy rules

1. A known hard mismatch never receives a positive recommendation.
2. Missing data is not a mismatch and is not free positive evidence.
3. AI text cannot change deterministic eligibility or scoring.
4. Verification confidence is never folded into relevance score.
5. A stale record may remain discoverable but must not look as trustworthy as a recently checked record.
6. Free-form `details` JSON cannot promote its own trust state; controlled curated columns own verification metadata.

## Current verification

Automated tests cover direct-country match, Pan-African match, explicit country exclusion, missing-country uncertainty, unknown-opportunity-geography behavior, sector/keyword ranking, bounded scores, stale-confidence degradation and recommendation ordering.

The full repository workspace gate has passed with the engine implementation, and all seven active Edge Functions have passed the focused Deno diagnostic. Final normal PR CI remains the release evidence source.

## Relationship with Opportunity Search

```text
Recommendation: profile -> curated candidates -> eligibility -> score -> rank
Search:         query   -> verified search -> optional AI discovery -> results
```

Both engines share opportunity data and UI components but preserve different trust and analytics semantics.

## Next accuracy layer

The current engine works on the existing Cresciva schema. Phase 5 provenance should add official-source evidence and more structured eligibility fields; a later Funding Profile phase can add stage, revenue, funding-size and preference features. Those additions increase the number of deterministic eligibility/ranking dimensions without changing the engine's basic architecture.
