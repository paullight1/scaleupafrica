# Funding Intelligence Provenance & Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cresciva Funding Radar trustworthy enough for a paid launch by ensuring opportunities presented as current/verified are backed by inspectable sources, freshness metadata, validation, deduplication and an admin review workflow.

**Architecture:** Keep the existing member feed and bounded Deep Search UX. Introduce a source-backed ingestion/verification layer whose records become the authoritative funding dataset. AI may extract, normalize, rank, summarize and personalize source records, but must not be the sole source of facts such as existence, URL, opening date or deadline.

**Tech Stack:** Supabase Postgres, Edge Functions or scheduled worker, AdminPanel, React/TanStack Query, Zod/shared contracts, existing AI gateway, HTTP source retrieval, optional NestJS ingestion path after Phase 6 decision.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Global Constraints

- Existing subscription checks, seven-day Deep Search cache, three uncached searches/hour, 60-second timeout and AI-output sanitization remain in place unless replaced by a stricter equivalent.
- No opportunity may display a `verified` badge/state without a canonical source URL and a successful verification record.
- AI-generated text may not silently overwrite source-derived dates/URLs.
- Source retrieval failures must lower freshness/confidence; they must not fabricate replacement facts.
- Every public opportunity URL must be `https:` and pass normalization/allow rules already represented by the funding schema.
- Admins need a clear audit trail of what source was checked and when.
- Respect source terms/robots/access restrictions; do not build a scraper that circumvents technical access controls.

---

### Task 1: Extend the funding data model with provenance

**Files:**
- Create: migration via `supabase migration new funding_provenance`
- Modify: `Shared/contracts/` funding opportunity contract
- Regenerate: current Supabase generated types under `Shared/src/integrations/supabase/`
- Modify: Backend Drizzle schema mirror if Backend remains part of the repository contract

**Interfaces:**

Every authoritative opportunity must support:

```ts
type VerificationStatus = "unverified" | "verified" | "stale" | "rejected";
type OpportunityStatus = "open" | "upcoming" | "closed" | "unknown";

type FundingProvenance = {
  source_url: string;
  source_name: string;
  source_retrieved_at: string;
  last_checked_at: string;
  verification_status: VerificationStatus;
  opportunity_status: OpportunityStatus;
  verified_at: string | null;
  verified_by: string | null;
  source_fingerprint: string | null;
};
```

- [ ] **Step 1: Write contract tests before schema changes**

Tests must reject `verified` records without `source_url`, `last_checked_at`, or `verified_at`, and reject non-HTTPS public URLs.

- [ ] **Step 2: Generate migration**

```bash
supabase migration new funding_provenance
```

Add provenance columns/table(s) with indexes supporting:

- status + deadline/open date feed queries;
- source URL/fingerprint dedupe;
- stale verification scans;
- admin review queues.

- [ ] **Step 3: Preserve historical compatibility**

Existing opportunities become `unverified` or `stale` until rechecked. Do not mark old rows verified during backfill merely because they already exist.

- [ ] **Step 4: Regenerate types and update shared contracts**

Run current Supabase type generation after applying to a development/test database.

### Task 2: Build deterministic source normalization and deduplication

**Files:**
- Create: `supabase/functions/_shared/fundingSource.ts` or the corresponding Backend module selected in Phase 6
- Create: focused tests next to the module

**Interfaces:**
- `normalizeSourceUrl(url: string): string | null`
- `fundingFingerprint(input: { sourceUrl: string; title: string; funder: string }): Promise<string>`
- `mergeCandidate(existing, incoming): MergeDecision`

- [ ] **Step 1: Test URL normalization**

Cover tracking query removal where safe, host casing, trailing slash normalization, invalid protocols, fragments and known duplicate URL forms.

- [ ] **Step 2: Test fingerprint stability**

The same program reached through equivalent canonical URLs must dedupe; unrelated programs from the same funder must not collapse together.

- [ ] **Step 3: Implement conservative merge policy**

Never overwrite a more recently verified source-derived deadline with an older AI-derived value. Record conflicts for admin review.

### Task 3: Implement source-backed ingestion

**Files:**
- Create: `supabase/functions/refresh-funding-feed/index.ts` or a Backend scheduled ingestion module if Phase 6 chooses Backend ownership
- Modify: `supabase/config.toml` if a new Edge Function is used
- Modify: funding repository/query layer
- Add tests for fetch/parse failure semantics

**Interfaces:**
- Input: a curated source registry or admin-approved source URLs.
- Output: normalized candidates with source evidence; no direct `verified` state until verification rules pass.

- [ ] **Step 1: Start with a curated source registry**

Do not attempt internet-wide crawling for launch. Seed high-value official funders/program directories relevant to Cresciva's audience.

Each source entry records:

```ts
{
  name: string;
  url: string;
  geography: string[];
  categories: string[];
  enabled: boolean;
}
```

- [ ] **Step 2: Fetch with bounded timeouts and response-size limits**

A slow/huge source must not exhaust a function invocation. Record fetch status and last successful retrieval time.

- [ ] **Step 3: Extract facts from retrieved content**

AI can convert retrieved text into the shared schema, but the prompt must include the source content and source URL. If a required fact is absent, return `unknown`/null rather than infer it from memory.

- [ ] **Step 4: Validate before persistence**

Reject invalid URLs, impossible dates, structurally invalid arrays and content that does not identify a real opportunity/program.

- [ ] **Step 5: Mark candidates `unverified` until automated or human verification passes**

Do not make ingestion synonymous with verification.

### Task 4: Create verification and freshness rules

**Files:**
- Modify: funding source/service module
- Create: tests for status/freshness computation

**Interfaces:**
- `computeOpportunityStatus(now, opensAt, deadlineAt): OpportunityStatus`
- `computeVerificationStatus(now, lastCheckedAt, sourceReachable, conflicts): VerificationStatus`

- [ ] **Step 1: Define time semantics**

Use UTC internally. Display local/date-only values carefully where funder deadlines do not specify time zones.

- [ ] **Step 2: Define stale threshold**

For launch, a row shown as verified must have been successfully checked within **7 days**, or within a shorter funder-specific interval when the deadline is near. A failed recheck transitions to `stale`, not silently retained `verified`.

- [ ] **Step 3: Define conflict behavior**

Conflicting deadline/opening data causes admin review and removes verified status until resolved.

- [ ] **Step 4: Test edge dates**

Cover rolling programs, unknown deadlines, midnight boundaries, already-closed opportunities and future openings.

### Task 5: Upgrade AdminPanel funding review

**Files:**
- Modify: existing `/admin/funding` page under `AdminPanel/src/pages/`
- Modify: existing admin funding query hooks
- Add tests under `AdminPanel/src/`

**Interfaces:**
- Review actions: approve/verify, reject, mark stale, refresh source, correct structured fields while preserving audit trail.

- [ ] **Step 1: Add queue tabs**

Minimum queues:

```text
Needs review
Verified
Stale
Rejected
Source errors
```

- [ ] **Step 2: Show evidence beside every candidate**

Display source URL/domain, retrieved time, last checked time, extracted facts and conflicts. Admin must be able to open the official source in a new safe tab.

- [ ] **Step 3: Require deliberate verification**

A verification action records actor and timestamp. Bulk verification must not allow source-unchecked records.

- [ ] **Step 4: Add audit tests**

Verify that normal members cannot execute review mutations and that admin actions record the actor.

### Task 6: Change member feed trust language and provenance UI

**Files:**
- Modify: `Frontend/src/components/funding/OpportunityCard.tsx`
- Modify: `Frontend/src/components/funding/FundingWorkspace.tsx`
- Modify: funding query/contracts as needed
- Add tests next to funding components

- [ ] **Step 1: Add clear source/freshness presentation**

For verified records show:

```text
Verified from official source · Checked <date>
```

For stale/unverified records, do not use the same visual trust treatment.

- [ ] **Step 2: Make official-source action primary**

Application/deadline decisions always link users to the source. Cresciva should not imply that cached data replaces funder instructions.

- [ ] **Step 3: Preserve Deep Search distinction**

Deep Search results must be labelled as AI-assisted discovery unless/until a source verification step upgrades them.

### Task 7: Refactor Deep Search to use retrieved evidence

**Files:**
- Modify: `supabase/functions/aggregate-funding/index.ts`
- Modify: `supabase/functions/_shared/fundingSchema.ts`
- Add tests for prompt/source invariants

- [ ] **Step 1: Keep existing cost/safety controls**

Do not regress auth, subscription RPC, caching, rate limit, timeout or sanitization.

- [ ] **Step 2: Stop asking the model to be the sole source of truth**

The Deep Search pipeline should first query the verified feed and/or retrieve official source pages. The model receives evidence and ranks/summarizes it for the member's keywords.

- [ ] **Step 3: Define fallback when no sources can be verified**

Return a smaller `AI-assisted discovery` set with explicit unverified state or return no results; never fabricate a “verified” set.

### Task 8: Schedule refresh and alert on stale coverage

**Files:**
- Add scheduler configuration appropriate to the selected runtime
- Update observability hooks consumed by Phase 8
- Create: `docs/production-readiness/evidence/funding-provenance-review.md`

- [ ] **Step 1: Schedule source refresh**

Run at least daily for the verified feed; higher frequency is unnecessary for launch unless a source changes rapidly.

- [ ] **Step 2: Track coverage metrics**

Record:

- verified active opportunities;
- stale records;
- source fetch failure rate;
- records within 7 days of deadline;
- average last-checked age;
- Deep Search calls/cached-hit ratio.

- [ ] **Step 3: Create alerts for systemic source failure**

If verified inventory collapses or a major source repeatedly fails, admin should know before users do.

## Phase 5 Definition of Done

- Every `verified` opportunity has official source provenance and freshness metadata.
- Old data is not auto-promoted to verified.
- Ingestion has bounded fetches, deterministic validation and dedupe.
- Admin review/verification exists with an audit trail.
- Member UI distinguishes verified feed from AI-assisted discovery.
- Deep Search retains its current cost controls and progressively consumes evidence rather than model memory alone.
- Daily refresh/freshness metrics exist.
- Evidence ends with `PHASE 5 RELEASE GATE: PASS`.