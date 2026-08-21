# Cresciva Funding Intelligence Engines Design

**Date:** 2026-08-21  
**Repository:** `paullight1/scaleupafrica`  
**Branch:** `docs/cresciva-production-readiness`  
**Scope:** Recommendation Engine V2 + Opportunity Search Engine V2

## 1. Purpose

Cresciva's Funding Radar must answer two different questions reliably:

1. **Recommendation Engine:** "Given what Cresciva knows about this business, which verified opportunities are the best fit and why?"
2. **Opportunity Search Engine:** "Given an explicit user query, which verified opportunities can Cresciva retrieve, and what additional AI-assisted discoveries may be worth exploring?"

The engines share the same opportunity intelligence but have different product semantics. Recommendations are proactive and profile-driven. Search is query-driven. Neither engine may present model memory as verified source truth.

## 2. Existing foundation to preserve

Cresciva already has useful production foundations:

- a curated `funding_opportunities` feed with `country_focus`, tags, details, featured state and `last_verified_at`;
- a deterministic dashboard matcher using country, sector, keywords and tags;
- saved-opportunity persistence;
- a member-gated AI Deep Search path;
- seven-day result caching and three uncached searches per hour;
- server-side subscription checks;
- JSON/schema validation and external-URL sanitization;
- current Funding Radar, dashboard and opportunity-card UI.

The new design evolves these components rather than replacing them.

## 3. Trust model

Every result belongs to one of three trust classes.

### 3.1 Verified recommendation

A curated opportunity that:

- comes from the Cresciva opportunity store;
- has a recent `last_verified_at` value;
- passes the user's hard eligibility rules that are known;
- receives a deterministic profile-fit score;
- exposes why it matches.

UI label: **Verified · 92% match**.

### 3.2 Verified search result

A curated opportunity returned because it matches the user's explicit query. It may be relevant without enough profile information to call it a recommendation.

UI label: **Verified source**.

### 3.3 AI-assisted discovery

A long-tail result produced by the model after verified search has been exhausted. It is always unverified unless a separate source-verification process upgrades it.

UI label: **AI discovery · Verify on official source**.

AI discovery may never inherit a verified badge from schema validity alone.

## 4. Recommendation Engine architecture

```text
Business profile
     |
     v
Profile feature extraction
     |
     v
Hard eligibility checks --------> ineligible / missing-info reason
     |
     v
Deterministic fit scoring
     |
     +----> Match score (0-100)
     +----> Match reasons
     +----> Missing information
     |
     v
Confidence scoring
     |
     +----> verification freshness
     +----> source/program URL
     +----> structured eligibility evidence
     |
     v
Ranked recommendations
     |
     v
UI + save/click feedback
```

### 4.1 V1 profile inputs

V1 uses fields that already exist in Cresciva:

- country;
- sector;
- keywords;
- short description;
- long description.

A later schema phase can add funding amount sought, stage, revenue band, company age, funding-type preferences and other explicit funding-profile fields.

### 4.2 V1 opportunity inputs

V1 uses existing opportunity fields:

- `country_focus`;
- tags;
- title;
- summary;
- eligibility text;
- type;
- deadline;
- URL;
- `last_verified_at`;
- `details` JSON when structured values are present.

### 4.3 Hard eligibility

Hard rules are evaluated before ranking.

V1 implements a conservative country rule:

- an empty or pan-African country focus is open;
- an explicit country list containing the member's country is eligible;
- an explicit country list excluding a known member country is ineligible;
- missing member country or ambiguous opportunity data produces `insufficient_information`, not a false rejection.

Structured rules placed inside `details` may be consumed only when their meaning is explicit. Missing structured data must not be guessed from prose.

### 4.4 Match score

The V1 score is normalized over available dimensions so missing profile data does not automatically create a poor score.

| Dimension | Maximum weight |
| --- | ---: |
| Geography | 30 |
| Sector/subsector text fit | 25 |
| Keyword/tag fit | 25 |
| Business-description semantic-token fit | 20 |
| **Total** | **100** |

Featured state is a merchandising tie-breaker, not relevance evidence.

### 4.5 Match explanations

Every recommendation returns zero or more human-readable reasons, for example:

- `Nigeria is in the eligible geography.`
- `Agritech matches the opportunity sector.`
- `Matches your climate and food-security keywords.`

The UI must never invent a reason that the deterministic engine did not produce.

### 4.6 Confidence score

Confidence is separate from match score.

V1 confidence considers:

- verification freshness;
- presence of an official/program URL;
- explicit geography data;
- explicit eligibility text/structured details.

A highly relevant but stale opportunity can therefore have high match and low confidence.

## 5. Opportunity Search architecture

```text
Explicit user query
      |
      v
Normalize query
      |
      v
Search verified Cresciva feed
      |
      +---- enough strong results ----> return verified results
      |
      v
AI-assisted long-tail discovery
      |
      v
Schema validation + URL sanitization
      |
      v
Deduplicate against verified results
      |
      v
Return verified first + AI discovery second
```

### 5.1 Verified-first search

Search must inspect the curated `funding_opportunities` dataset before paying for or trusting an AI generation.

V1 search scoring weights terms found in:

1. tags and country focus;
2. title;
3. funder;
4. type;
5. summary and eligibility.

Results with no query overlap are not returned as verified matches.

### 5.2 AI fallback rules

The model is a discovery fallback, not the database.

The prompt must:

- allow zero results;
- return **up to 10** opportunities, with no minimum quota;
- never invent a deadline;
- use an empty deadline when the current cycle cannot be recalled confidently;
- never substitute a "typical closing month" for a current-cycle deadline;
- never claim a result is verified;
- avoid fabricated recipients, URLs, funders and amounts;
- prefer fewer plausible results over padding.

Every model result receives `discovery_source = "ai_assisted"` and `verification_status = "unverified"` before persistence or rendering.

### 5.3 Search result classes

The opportunity schema gains optional trust metadata:

```ts
type DiscoverySource = "verified_feed" | "ai_assisted";
type VerificationStatus = "verified" | "unverified" | "stale";

type OpportunityTrust = {
  discovery_source?: DiscoverySource;
  verification_status?: VerificationStatus;
  source_checked_at?: string;
  match_reasons?: string[];
};
```

These fields are presentation/trust metadata and do not replace the Phase 5 normalized provenance schema.

## 6. UX design

### 6.1 Funding Radar primary experience

The curated feed becomes profile-ranked when a member profile exists.

Top cards show:

- match score;
- verified/unverified state;
- up to three reasons;
- deadline;
- amount;
- official-source action.

Members without enough profile data still receive the verified feed, with a prompt to improve their profile for stronger matching.

### 6.2 Deep Search

Deep Search remains secondary and is explicitly labelled as exploration.

Loading copy must describe the real process. Until live source retrieval exists, Cresciva must not say it is "checking dozens of funders".

Preferred copy:

> Matching your request against Cresciva's funding intelligence…

### 6.3 Official-source action

The external program/source action must be visible without expanding the entire card. Users should not have to inspect AI-generated detail before they can verify the source.

## 7. Feedback and analytics

V1 records low-risk product events without storing the raw search query in analytics:

- `funding_search` with result count, cache state and source mix;
- `recommendation_open`;
- `opportunity_source_click`;
- `recommendation_save` where the curated opportunity has a database ID.

Raw funding search text stays in the existing member-owned funding cache/record; analytics receives aggregates only.

## 8. Accuracy principles

1. Eligibility beats similarity. A hard-known mismatch cannot be rescued by a high semantic score.
2. Match and confidence are separate.
3. Schema validity is not factual verification.
4. A program URL being syntactically safe is not proof the program is real.
5. Current-cycle deadlines must never be inferred from historical cycles and presented as current fact.
6. Fewer accurate results are better than fixed-size result lists.
7. AI discovery is always visually distinct from verified Cresciva data.

## 9. V1 non-goals

The following require later source/provenance infrastructure and are intentionally not faked in this iteration:

- internet-wide crawling;
- live funder-page retrieval during every query;
- complete structured eligibility for every program;
- learning-to-rank ML;
- collaborative filtering;
- automatic application-success prediction.

The existing Phase 5 provenance plan remains the route to these higher-trust capabilities.

## 10. Testing and release gates

V1 is complete only when automated tests cover:

- explicit country mismatch exclusion;
- pan-African eligibility;
- sector/keyword ranking;
- normalized 0-100 scoring;
- confidence degradation for stale/unverified opportunities;
- verified search ranking;
- verified-first behavior;
- AI results forced to unverified trust metadata;
- zero-result AI output accepted;
- no minimum-result requirement in prompt tests;
- no "typical deadline" fallback instruction;
- trust labels rendered correctly;
- misleading loading copy removed.

Repository release gate remains `npm run verify` plus Deno Edge Function checks in GitHub Actions.
