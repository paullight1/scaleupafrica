# Cresciva Recommendation Engine V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Cresciva's existing country/sector/keyword dashboard matcher into a reusable, explainable 0–100 recommendation engine used by both dashboard and Funding Radar.

**Architecture:** A pure TypeScript engine consumes the existing profile and curated opportunity data, evaluates conservative hard eligibility, calculates normalized fit and confidence scores, and returns deterministic explanations. UI components receive the result rather than recomputing matching rules.

**Tech Stack:** TypeScript, React 18, Vitest, existing Supabase-generated profile/funding types, TanStack Query.

**Spec:** `docs/superpowers/specs/2026-08-21-cresciva-funding-intelligence-engines-design.md`

## Global Constraints

- Do not use an LLM to determine eligibility or the numeric match score.
- Explicit known country mismatch must be ineligible.
- Missing profile/opportunity information must not be treated as a hard mismatch.
- Match score and confidence score remain separate values.
- Reuse the existing database schema in V1; structured values in `details` are optional enhancements.
- Preserve saved-opportunity behavior.
- Preserve existing dashboard fallbacks for missing profiles/empty feeds.

---

### Task 1: Create the reusable recommendation domain

**Files:**
- Create: `Frontend/src/lib/funding/recommendationEngine.ts`
- Create: `Frontend/src/lib/funding/recommendationEngine.test.ts`

**Interfaces:**

```ts
export type EligibilityStatus =
  | "eligible"
  | "possibly_eligible"
  | "insufficient_information"
  | "ineligible";

export interface RecommendationProfile {
  country?: string | null;
  sector?: string | null;
  keywords?: string[] | null;
  shortDescription?: string | null;
  longDescription?: string | null;
}

export interface RecommendationOpportunity {
  id?: string;
  title: string;
  funder?: string | null;
  type?: string | null;
  summary?: string | null;
  eligibility?: string | null;
  url?: string | null;
  deadline?: string | null;
  tags?: string[] | null;
  countryFocus?: string[] | null;
  featured?: boolean;
  lastVerifiedAt?: string | null;
  details?: Record<string, unknown> | null;
}

export interface RecommendationResult<T> {
  opportunity: T;
  eligibilityStatus: EligibilityStatus;
  matchScore: number;
  confidenceScore: number;
  reasons: string[];
  blockers: string[];
  missingInformation: string[];
}

export function recommendOpportunity<T extends RecommendationOpportunity>(
  profile: RecommendationProfile,
  opportunity: T,
  now?: Date,
): RecommendationResult<T>;

export function rankRecommendations<T extends RecommendationOpportunity>(
  profile: RecommendationProfile | null | undefined,
  opportunities: T[],
  now?: Date,
): RecommendationResult<T>[];
```

- [ ] **Step 1: Write failing tests** for direct country eligibility, pan-African eligibility, explicit country exclusion, missing-country uncertainty, sector ranking, keyword ranking, description ranking, normalized 0–100 bounds and deterministic reasons.
- [ ] **Step 2: Run** `npm run test --workspace Frontend -- recommendationEngine.test.ts` and confirm RED.
- [ ] **Step 3: Implement token normalization, stop-word filtering, eligibility and normalized scoring.**
- [ ] **Step 4: Add confidence tests**: recent verification + URL > stale/missing verification; score always 0–100.
- [ ] **Step 5: Run the focused test and confirm GREEN.**

### Task 2: Adapt the dashboard matcher

**Files:**
- Modify: `Frontend/src/lib/dashboard/matchOpportunities.ts`
- Modify: `Frontend/src/lib/dashboard/__tests__/matchOpportunities.test.ts`

**Interfaces:**
- `matchOpportunities(profile, feed)` continues returning `FundingOpportunity[]` for compatibility.
- Add `recommendFundingOpportunities(profile, feed)` returning recommendation results.

- [ ] **Step 1: Replace internal scoring with the reusable engine adapter.**
- [ ] **Step 2: Update regression tests** so country mismatch remains excluded and sorting follows match score/confidence.
- [ ] **Step 3: Run dashboard matcher tests.**

### Task 3: Show recommendation evidence on dashboard rows

**Files:**
- Modify: `Frontend/src/components/dashboard/MatchedOpportunities.tsx`
- Modify: `Frontend/src/components/dashboard/OpportunityRow.tsx`
- Add/modify tests for these components where current test infrastructure permits.

**Interfaces:**
- `OpportunityRow` accepts optional `matchScore`, `confidenceScore`, `matchReasons`.

- [ ] **Step 1: Pass structured recommendation results instead of plain sorted rows.**
- [ ] **Step 2: Render a compact `NN% match` badge and up to two deterministic reasons.**
- [ ] **Step 3: Keep save, amount, deadline and official-source actions intact.**
- [ ] **Step 4: Verify keyboard/button accessibility remains unchanged.**

### Task 4: Make Funding Radar profile-ranked

**Files:**
- Modify: `Frontend/src/hooks/queries/funding.ts`
- Modify: `Frontend/src/components/funding/FundingWorkspace.tsx`

**Interfaces:**
- Expand `FundingProfile` with `short_description` and `long_description`.
- Expand `FeedItem` with `countryFocus`, `details`, and trust metadata needed by ranking.

- [ ] **Step 1: Fetch/map country focus and descriptions through both direct-Supabase and API paths.**
- [ ] **Step 2: Rank the curated feed with `rankRecommendations` whenever a profile exists.**
- [ ] **Step 3: Preserve text filtering after ranking.**
- [ ] **Step 4: If profile information is too sparse, show the feed normally with a small profile-improvement hint rather than fabricating confidence.**

### Task 5: Upgrade opportunity-card recommendation hierarchy

**Files:**
- Modify: `Frontend/src/components/funding/OpportunityCard.tsx`
- Modify: `Frontend/src/components/funding/OpportunityCard.test.tsx`

**Interfaces:**
- Add optional recommendation/trust props without requiring them for AI search results.

- [ ] **Step 1: Add tests for match badge, deterministic reason list and verified/AI trust badge.**
- [ ] **Step 2: Move the official-source action into the collapsed action row.**
- [ ] **Step 3: Keep expanded rich detail but remove duplicate source CTA.**
- [ ] **Step 4: Ensure low-confidence recommendations do not visually imply high verification confidence.**

### Task 6: Add recommendation analytics vocabulary

**Files:**
- Modify: `Shared/src/lib/analytics.ts`
- Modify the two funding/dashboard UI call sites that already own the user interactions.

**Events:**

```ts
"recommendation_open"
"recommendation_save"
"opportunity_source_click"
```

- [ ] **Step 1: Extend the event union.**
- [ ] **Step 2: Track source clicks and save actions without putting raw search text in analytics metadata.**
- [ ] **Step 3: Keep analytics fire-and-forget.**

### Task 7: Recommendation verification gate

- [ ] Run focused recommendation tests.
- [ ] Run `npm run typecheck --workspace Frontend`.
- [ ] Run `npm run lint --workspace Frontend`.
- [ ] Run full `npm run verify` through GitHub CI after Opportunity Search V2 is also applied.
- [ ] Update `docs/product/RECOMMENDATION-ENGINE.md` if implementation differs from the documented contract.
