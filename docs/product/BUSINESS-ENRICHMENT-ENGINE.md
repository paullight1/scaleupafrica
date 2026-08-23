# Cresciva Business Enrichment Engine

## What it does

The Business Enrichment Engine answers:

> **Given an organisation name, which real organisation is this, what does it do, and which facts can Cresciva safely use to improve funding recommendations?**

The engine exists to make the subscription experience work from a simple input such as:

```text
Top100 Africa Future Leaders
```

The name is an identity-resolution starting point. It is **not** sent directly to the funding recommendation model as though the words in the name described the business.

---

## Core process

```text
Business name
   |
   +-- optional website
   +-- optional country
   |
   v
Identity candidate discovery
   |
   v
Candidate scoring
   |
   +-- no reliable candidate --> manual profile fallback
   |
   +-- ambiguous candidates --> ask member to choose
   |
   v
Public evidence retrieval
   |
   v
Evidence classification
 official / controlled / trusted secondary
   |
   v
Structured extraction
   |
   v
Field-level confidence + source URLs
   |
   v
Member confirmation
   |
   v
Confirmed private funding profile
   |
   v
Recommendation + eligibility engines
```

---

## Why identity comes first

Business names are not globally unique.

Examples:

- a startup and an NGO may share a name;
- a company may have an old and new website;
- a trading name may differ from the registered entity;
- a social profile may belong to a person rather than the organisation;
- search results may contain companies from another country.

Cresciva therefore never treats the first search result as the organisation automatically.

---

## Input contract

```ts
interface BusinessEnrichmentInput {
  businessName: string;
  website?: string;
  countryHint?: string;
}
```

Required:

- `businessName`, trimmed and length bounded.

Optional hints:

- organisation website;
- operating/HQ country.

A website is the strongest disambiguation hint because it also gives Cresciva an official-source anchor.

---

## Identity candidates

A resolver returns candidates in a controlled shape:

```ts
interface BusinessIdentityCandidate {
  id: string;
  canonicalName: string;
  website: string | null;
  country: string | null;
  summary: string | null;
  sourceUrls: string[];
  identityConfidence: number;
}
```

### Candidate confidence signals

Positive signals can include:

- exact/near-exact organisation name;
- official website title/metadata match;
- country hint match;
- official domain referenced by multiple independent sources;
- organisation-controlled professional profile linking to the same domain.

Negative signals include:

- country conflict;
- different sector/organisation type;
- personal profile instead of entity;
- conflicting official domains;
- stale/parked/nonexistent domain.

---

## Ambiguity policy

### Strong unique identity

When one candidate is clearly dominant, Cresciva proposes it:

> We found **Top100 Africa Future Leaders**. Is this your organisation?

The member still gets confirmation/edit controls.

### Multiple plausible identities

Cresciva shows a short candidate chooser with name, country, website and summary.

It does not select silently.

### No trustworthy identity

The engine returns:

```text
We couldn't confidently identify this organisation from public sources.
Add your website or complete your funding profile manually.
```

No fake enrichment is generated to avoid an empty state.

---

## Evidence priority

The engine ranks evidence by source quality.

### Tier A — authoritative

- official organisation website;
- official government/company/nonprofit registry;
- official public filing;
- official programme/partner page describing the organisation.

### Tier B — organisation-controlled

- verified/clearly controlled LinkedIn organisation page;
- official social profile linked from the business website;
- organisation-managed public directory profile.

### Tier C — trusted secondary

- reputable press;
- recognised ecosystem database;
- accelerator/funder portfolio page;
- reputable event/partner profile.

Tier C can corroborate facts but should not silently override conflicting Tier A evidence.

---

## Extraction contract

The extractor operates on retrieved evidence, not model memory.

Possible fields:

```ts
interface EnrichedBusinessProfile {
  canonicalName?: string;
  website?: string;
  country?: string;
  operatingCountries?: string[];
  organisationType?:
    | "for_profit"
    | "nonprofit"
    | "social_enterprise"
    | "ngo"
    | "foundation"
    | "association"
    | "public_body"
    | "other";
  sector?: string;
  subsectors?: string[];
  businessStage?: "idea" | "early" | "growth" | "scale";
  foundingYear?: number;
  description?: string;
  keywords?: string[];
  sdgFocus?: string[];
  geographicFocus?: string[];
  proposedFundingTypes?: string[];
}
```

The extractor may return fewer fields. Missing is preferable to invented.

---

## Field-level provenance

Every meaningful extracted field is evidence-backed:

```ts
interface EnrichedField<T> {
  value: T;
  confidence: number; // 0-100
  sourceUrls: string[];
  status: "confirmed" | "proposed" | "conflicting" | "unknown";
}
```

Example:

```text
Sector: Youth development
Confidence: 94
Evidence:
- official website /about
- partner programme profile
```

This lets Cresciva explain where a recommendation profile came from and lets a reviewer inspect conflicts without rereading an entire page.

---

## Member confirmation

Public enrichment is a proposal. The member owns their private funding profile.

The confirmation screen should show:

```text
We found your organisation

Top100 Africa Future Leaders
Nigeria · Pan-African youth leadership / education
https://...

We can use these details to improve funding matches:
✓ Nonprofit / social-impact organisation
✓ Youth leadership
✓ Education and employability
✓ Pan-African focus

[Use this profile] [Edit details] [This isn't my organisation]
```

Corrections are persisted as member-confirmed facts and take precedence for recommendation decisions.

---

## Business facts vs funding preferences

The engine may enrich observable business facts. It should not pretend to know private funding intent.

### Enrichment may propose

- organisation type;
- sector;
- geography;
- mission/focus;
- stage where supported;
- founding year;
- keywords.

### Member should supply/confirm

- funding amount sought;
- equity/debt preference;
- application readiness;
- current revenue where needed;
- team size where needed;
- demographic eligibility facts;
- financial/document readiness.

---

## Sensitive-data rule

Cresciva must not infer protected/sensitive personal characteristics from public sources for funding eligibility.

Examples not to infer automatically:

- race/ethnicity;
- religion;
- health/disability;
- political affiliation;
- sexual orientation;
- other sensitive personal traits.

When an opportunity legally and legitimately depends on a founder criterion, Cresciva can ask the member to provide the relevant fact voluntarily.

---

## AI's role

AI is allowed to:

- extract facts from retrieved evidence;
- normalise sector terminology;
- summarise an organisation;
- suggest keywords from sourced descriptions;
- identify contradictions for review.

AI is not allowed to:

- invent an organisation;
- select an ambiguous identity without evidence;
- state unsupported founding/revenue/team facts;
- infer sensitive founder characteristics;
- overwrite user-confirmed information;
- mark its own output as authoritative.

---

## Cache and refresh

Business enrichment does not need to run on every page load.

Suggested behaviour:

- cache successful public evidence for 30 days;
- reuse confirmed identity until the member requests re-enrichment or the official domain changes;
- recheck official website availability periodically;
- never silently overwrite user-confirmed fields during background refresh;
- surface meaningful conflicts as a review prompt.

---

## Failure states

### `not_found`

No sufficiently strong public identity candidate.

### `ambiguous`

Two or more plausible candidates.

### `source_unavailable`

Identity exists but official/secondary evidence cannot currently be retrieved.

### `insufficient_evidence`

Evidence exists but does not support useful structured facts.

### `conflicting_evidence`

High-quality sources disagree on a field.

### `provider_unavailable`

Discovery/extraction provider unavailable; existing profile remains usable.

Every failure has a manual fallback.

---

## Relationship with recommendations

The Business Enrichment Engine never recommends funding itself.

Its output feeds the Recommendation Engine:

```text
Business Enrichment
        |
confirmed profile
        |
        v
Hard Eligibility
        |
        v
Match / Confidence / Readiness
```

This separation prevents a persuasive company description from bypassing explicit eligibility rules.

---

## Accuracy metrics

Track:

- identity resolution precision;
- percentage of name-only inputs resolved;
- ambiguity rate;
- member correction rate per field;
- official-source coverage;
- enrichment completion latency;
- percentage of enrichments that improve recommendation completeness;
- false identity selection count.

**Release-critical:** false automatic identity selection must be zero in the acceptance benchmark.

---

## Example — Top100 Africa Future Leaders

The expected process is:

```text
Input: Top100 Africa Future Leaders
   ↓
Find candidate organisation(s)
   ↓
Confirm official site / country / public description
   ↓
Extract supported themes such as youth leadership / education / social impact
   ↓
Ask member to confirm
   ↓
Merge with member funding preferences
   ↓
Send confirmed profile to eligibility + recommendation
```

Cresciva must not simply search the words `top100 africa future leaders` against funding titles and call that personalisation.
