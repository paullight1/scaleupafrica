# Cresciva Opportunity Search Engine V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cresciva Opportunity Search verified-first, relevance-ranked, explicit about trust, and safer when AI is used for long-tail discovery.

**Architecture:** Search the existing published Cresciva funding feed deterministically before calling the AI gateway. If verified search is insufficient, call AI with a precision-first prompt, force AI results to unverified trust metadata, deduplicate them against verified results, then return verified results first.

**Tech Stack:** Supabase Edge Functions/Deno, NestJS + Drizzle parity path, TypeScript, Zod, React 18, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-cresciva-funding-intelligence-engines-design.md`

## Global Constraints

- Active membership and existing cache/rate-limit/timeouts remain in place.
- No minimum number of AI results.
- No historic/typical deadline may be presented as a current deadline.
- Model results are always `ai_assisted + unverified` until a separate verification process upgrades them.
- Verified curated records win deduplication conflicts.
- Search may return zero results.
- Do not log raw member search text into general analytics.

---

### Task 1: Extend opportunity trust metadata

**Files:**
- Modify: `Frontend/src/lib/fundingSchema.ts`
- Modify: `supabase/functions/_shared/fundingSchema.ts`
- Modify: `Shared/contracts/funding.ts`
- Modify schema tests.

**Interfaces:**

```ts
discovery_source?: "verified_feed" | "ai_assisted";
verification_status?: "verified" | "unverified" | "stale";
source_checked_at?: string;
match_reasons?: string[];
```

- [ ] **Step 1: Add failing schema tests** that preserve valid trust metadata and reject invalid enum values.
- [ ] **Step 2: Add the fields identically to client/Edge/shared contracts.**
- [ ] **Step 3: Run schema/contract tests.**

### Task 2: Build pure verified-feed search ranking

**Files:**
- Create: `supabase/functions/_shared/fundingSearch.ts`
- Create: `Frontend/src/lib/fundingSearch.test.ts` importing the pure helper where runtime compatibility allows, or mirror focused tests in Backend.
- Create/mirror: `Backend/src/funding/search-ranking.ts`
- Test: `Backend/test/funding-search-ranking.spec.ts`

**Interfaces:**

```ts
export interface SearchableFundingOpportunity {
  title: string;
  funder: string;
  type?: string | null;
  summary?: string | null;
  eligibility?: string | null;
  tags?: string[] | null;
  countryFocus?: string[] | null;
  url?: string | null;
}

export function scoreFundingSearch(query: string, opportunity: SearchableFundingOpportunity): number;
export function rankFundingSearch<T extends SearchableFundingOpportunity>(query: string, items: T[], limit?: number): T[];
```

- [ ] **Step 1: Tests cover title, tag, country and funder relevance plus zero-overlap exclusion.**
- [ ] **Step 2: Implement deterministic token scoring and stable ranking.**
- [ ] **Step 3: Add conservative dedupe helper using URL then title+funder.**

### Task 3: Add verified-first Edge search

**Files:**
- Modify: `supabase/functions/aggregate-funding/index.ts`
- Use: `supabase/functions/_shared/fundingSearch.ts`

- [ ] **Step 1: After cache/rate-limit preparation, query published `funding_opportunities` with bounded `.limit(100)`.**
- [ ] **Step 2: Map rows to Opportunity shape with `discovery_source="verified_feed"` and verification state based on `last_verified_at`.**
- [ ] **Step 3: Rank by explicit query.**
- [ ] **Step 4: If enough strong verified results exist, persist/return them without paying for an AI call.**
- [ ] **Step 5: Otherwise call AI and merge verified + AI results.**

### Task 4: Harden the AI discovery prompt

**Files:**
- Modify: `supabase/functions/aggregate-funding/index.ts`
- Modify: `Backend/src/funding/ai-gateway.service.ts`
- Add prompt-invariant tests.

**Required prompt changes:**

```text
Return 0-10 opportunities.
Prefer fewer strong candidates over padding.
If the current deadline is unknown, return an empty string.
Never substitute a typical/historical closing month for the current deadline.
Never claim a result is verified.
```

- [ ] **Step 1: Remove `AT LEAST 15`, `15-25`, and mandatory fellowship quotas.**
- [ ] **Step 2: Add explicit zero-result permission.**
- [ ] **Step 3: Force trust metadata in code after parsing rather than relying on model compliance.**
- [ ] **Step 4: Preserve past-recipient anti-fabrication and URL-safety rules.**

### Task 5: Keep NestJS search behavior in parity

**Files:**
- Modify: `Backend/src/funding/funding.service.ts`
- Modify: `Backend/src/funding/ai-gateway.service.ts`
- Modify: `Backend/test/funding.service.spec.ts`

- [ ] **Step 1: Search published `fundingOpportunities` before calling `AiGatewayService.curate`.**
- [ ] **Step 2: Skip the AI call when verified results satisfy the V1 result threshold.**
- [ ] **Step 3: Merge/dedupe when AI fallback is needed.**
- [ ] **Step 4: Preserve membership gate, cache, rate limit and error mapping.**

### Task 6: Upgrade Deep Search trust UX

**Files:**
- Modify: `Frontend/src/components/funding/FundingSearch.tsx`
- Modify: `Frontend/src/components/funding/OpportunityCard.tsx`
- Modify corresponding tests.

- [ ] **Step 1: Replace misleading "checking dozens of funders" copy with `Matching your request against Cresciva's funding intelligence…`.**
- [ ] **Step 2: Render `Verified source`, `Source needs recheck`, or `AI discovery` before result detail.**
- [ ] **Step 3: Keep official source/program CTA visible on collapsed cards.**
- [ ] **Step 4: Show source mix in the saved-results summary when useful, e.g. `6 verified · 3 AI discoveries`.**

### Task 7: Search analytics without raw-query leakage

**Files:**
- Modify: `Shared/src/lib/analytics.ts`
- Modify: `Frontend/src/components/funding/FundingSearch.tsx`

- [ ] **Step 1: Keep/use `funding_search` with metadata limited to result count, cached flag, verified count and AI count.**
- [ ] **Step 2: Add `opportunity_source_click` tracking through OpportunityCard.**
- [ ] **Step 3: Never include raw keywords in analytics metadata.**

### Task 8: Opportunity Search verification gate

- [ ] Run schema/ranking/prompt tests.
- [ ] Run Backend funding tests.
- [ ] Run Frontend funding tests.
- [ ] Run workspace typechecks/lints.
- [ ] Run GitHub `npm run verify` + Deno checks.
- [ ] Confirm dependency audit and Gitleaks remain green.
- [ ] Update `docs/product/OPPORTUNITY-SEARCH-ENGINE.md` if implementation differs from the documented contract.
