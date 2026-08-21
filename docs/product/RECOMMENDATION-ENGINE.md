# Cresciva Recommendation Engine

## What it does

The Recommendation Engine answers:

> **Which funding opportunities are the best fit for this specific Cresciva member, and why?**

It is intentionally different from Opportunity Search. Search starts from a user query. Recommendations start from the member's business profile and the verified Cresciva opportunity feed.

## Current production architecture

```text
Member profile
  country
  sector
  keywords
  business descriptions
        |
        v
Feature extraction
        |
        v
Hard eligibility checks
        |
        +---- explicit mismatch ---> exclude / explain
        |
        v
Match scoring (0-100)
        |
        +---- geography
        +---- sector fit
        +---- keyword/tag fit
        +---- description fit
        |
        v
Confidence scoring
        |
        +---- verification freshness
        +---- program/source URL
        +---- explicit eligibility/geography data
        |
        v
Ranked recommendations
        |
        v
Dashboard + Funding Radar
```

## Why the engine is deterministic

Cresciva does not ask an LLM to decide whether a member is eligible or to invent a match score. The first version is deterministic so that:

- the same profile and opportunity produce the same result;
- hard eligibility cannot be overridden by persuasive AI text;
- every score can be explained;
- regression tests can protect ranking behavior;
- the system can later be benchmarked against human labels.

AI may later explain a deterministic result in richer language, but the AI does not own the eligibility verdict.

## Inputs

### Member profile

V1 uses fields already present in Cresciva:

- `country`
- `sector`
- `keywords[]`
- `short_description`
- `long_description`

Future versions can add business stage, revenue, team size, company age, funding amount sought, equity/debt preferences and application readiness.

### Opportunity

V1 uses existing funding fields:

- `country_focus[]`
- `tags[]`
- `title`
- `summary`
- `eligibility`
- `type`
- `deadline`
- `url`
- `last_verified_at`
- `details` JSON where explicit structured fields exist

## Step 1 — eligibility

Eligibility is evaluated before match scoring.

### Country rule

An opportunity is treated as geographically eligible when:

- `country_focus` is empty;
- the opportunity is marked Africa / Pan-African / All; or
- the member's country appears in `country_focus`.

If the opportunity explicitly lists countries and the known member country is absent, it is a hard mismatch.

If the member country is missing, Cresciva returns `insufficient_information` rather than guessing.

### Eligibility states

```ts
"eligible"
"possibly_eligible"
"insufficient_information"
"ineligible"
```

The engine may grow additional hard rules as Cresciva's opportunity data becomes more structured.

## Step 2 — match score

The score is normalized to `0–100` using only dimensions that can actually be evaluated.

| Dimension | Max weight |
| --- | ---: |
| Geography | 30 |
| Sector fit | 25 |
| Keyword/tag fit | 25 |
| Business-description fit | 20 |
| **Total** | **100** |

### Geography

Direct country or Pan-African eligibility receives full geography weight.

An explicit geographic mismatch excludes the recommendation instead of merely lowering the score.

### Sector fit

The engine tokenizes the member sector and compares it with opportunity title, summary and tags.

Examples:

- `Agriculture & AgriTech` can match `agriculture`, `agritech`, `food security`.
- `Financial Technology` can match `fintech` when the opportunity carries that language.

### Keyword fit

Profile keywords are compared with opportunity tags and searchable opportunity text. Repeated keywords do not multiply the score.

### Business-description fit

Meaningful words from the short/long description are compared with opportunity title, summary and tags. Common stop words are ignored so the score is not inflated by generic English words.

## Step 3 — confidence score

**Match score and confidence are different.**

A program can be a 95% conceptual match but have low trust because its record is stale.

Confidence considers:

- how recently the opportunity was verified;
- whether a program/source URL exists;
- whether explicit country focus exists;
- whether eligibility or structured details exist.

Typical interpretation:

- `80–100`: strong source confidence
- `60–79`: usable but should be rechecked
- `<60`: discovery-quality data; user should verify carefully

## Step 4 — explanation

The engine returns deterministic reasons such as:

- `Nigeria is in the eligible geography.`
- `Agritech matches this program.`
- `Matches your climate and food-security keywords.`

The UI shows the strongest reasons before secondary detail.

## Ranking

Recommendations are ordered by:

1. eligibility status;
2. match score;
3. confidence score;
4. deadline/relevance tie breakers;
5. merchandising state only as a final tie-break.

`featured` does not create relevance by itself.

## User experience

A recommendation should look like:

```text
94% MATCH · VERIFIED

AECF Climate Innovation Fund
$50k–$150k

Why it matches
✓ Nigeria is eligible
✓ Climate-tech aligns with your sector
✓ Matches your growth and food-security keywords

Deadline: 12 Sep 2026

[Save] [Official source]
```

If important data is missing:

```text
Potential match · More information needed
Add your operating country to confirm eligibility.
```

## Feedback loop

Curated opportunities can be saved through Cresciva's existing saved-opportunity infrastructure.

The recommendation system should record aggregate product events such as:

- recommendation opened;
- recommendation saved;
- official source clicked;
- not relevant (future);
- application started (future).

These events create the data needed for a future learning-to-rank model. V1 does not pretend that Cresciva already has enough interaction data for machine-learning ranking.

## Accuracy rules

1. A known hard mismatch must never receive a positive recommendation.
2. Missing data is not a mismatch.
3. AI text may explain a result but cannot change the deterministic verdict.
4. Verification confidence must not be folded into relevance score.
5. A stale record may remain visible but must not look as trustworthy as a recently verified record.

## Relationship with Opportunity Search

Recommendation Engine:

```text
profile -> verified feed -> eligibility -> score -> rank
```

Opportunity Search Engine:

```text
query -> verified search -> optional AI discovery -> results
```

Both ultimately render through Cresciva's opportunity experience, but they must retain different trust labels and analytics semantics.
