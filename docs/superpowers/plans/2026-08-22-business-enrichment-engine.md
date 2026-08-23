# Business Enrichment Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a member enter an organisation name and safely turn public evidence into a member-confirmed funding profile without letting AI or ambiguous search results own organisation identity.

**Architecture:** Add a business identity/evidence pipeline in a JWT-protected Supabase Edge Function. Candidate discovery uses a bounded search-provider adapter; official/controlled pages are fetched through an SSRF-safe helper; AI extracts structured facts only from retrieved evidence; the member confirms the selected identity before enriched fields are persisted into the recommendation profile.

**Tech Stack:** TypeScript, React, TanStack Query, Zod, Supabase/PostgreSQL/RLS, Supabase Edge Functions/Deno, existing Lovable AI gateway, Brave Search Web API for initial public candidate discovery, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-22-business-to-funding-intelligence-design.md`

## Global Constraints

- Node runtime floor: **22+**.
- Business name alone must be a valid enrichment input.
- Ambiguous identities are never auto-selected.
- AI may extract from fetched evidence but may not invent source facts or mark itself authoritative.
- Only public business information is enriched automatically.
- Sensitive personal characteristics must not be inferred.
- Member-confirmed values outrank background enrichment values for recommendation decisions.
- Every network fetch must use bounded SSRF-safe retrieval.
- Existing recommendation/search behavior must keep working when enrichment providers are unavailable.
- No production/live Supabase deployment is considered verified until the actual Cresciva project is connected and migration/function evidence exists.

---

## File Structure

**Create**

- `supabase/migrations/20260822040000_business_enrichment.sql` — enrichment runs/candidates and RLS.
- `Shared/contracts/business-enrichment.ts` — request/response schemas shared by Frontend/Backend.
- `Shared/src/lib/businessIdentity.ts` — deterministic candidate normalisation/scoring helpers.
- `Shared/src/lib/businessIdentity.test.ts` — identity scoring and ambiguity tests.
- `supabase/functions/_shared/safeExternalFetch.ts` — SSRF-safe bounded fetch helper.
- `supabase/functions/_shared/businessDiscovery.ts` — Brave search adapter + candidate extraction boundary.
- `supabase/functions/business-enrichment/index.ts` — authenticated orchestration endpoint.
- `Frontend/src/lib/api/businessEnrichment.ts` — frontend API wrapper.
- `Frontend/src/hooks/queries/businessEnrichment.ts` — TanStack Query/mutation layer.
- `Frontend/src/components/funding/BusinessEnrichmentStart.tsx` — business-name entry.
- `Frontend/src/components/funding/BusinessIdentityConfirm.tsx` — candidate confirmation/correction UX.
- `Frontend/src/components/funding/BusinessEnrichmentStart.test.tsx` — user-flow tests.
- `Backend/test/business-enrichment-contracts.spec.ts` — shared API contract tests.

**Modify**

- `Shared/contracts/index.ts` — export business-enrichment contracts.
- `supabase/config.toml` — register JWT-protected `business-enrichment`.
- `Frontend/src/components/funding/FundingWorkspace.tsx` — offer enrichment when funding profile lacks identity confidence.
- `Frontend/src/pages/dashboard/DashboardProfileEdit.tsx` — hydrate accepted enrichment into editable profile fields.
- `Frontend/src/hooks/queries/directory.ts` — persist confirmed enrichment through both direct Supabase and API paths.
- `Shared/contracts/profiles.ts` — accept any enrichment-backed profile fields not already covered.
- `Backend/src/db/schema.ts` — mirror enrichment/profile migration additions.
- `Backend/src/profiles/profiles.service.ts` — preserve confirmed enriched fields through API cutover.
- `docs/product/BUSINESS-ENRICHMENT-ENGINE.md` — implementation-status/evidence updates.

---

### Task 1: Persist enrichment runs and candidates

**Files:**
- Create: `supabase/migrations/20260822040000_business_enrichment.sql`
- Modify: `Backend/src/db/schema.ts`
- Test: `Backend/test/business-enrichment-contracts.spec.ts`

**Interfaces:**
- Produces tables `business_enrichment_runs` and `business_enrichment_candidates`.
- Candidate structured profile is JSONB but identity fields/source URLs are explicit columns.
- Only the owning member and staff may read the member's runs/candidates; service role writes orchestration results.

- [ ] **Step 1: Write the failing contract test**

Add a test that imports the expected enrichment contracts and asserts statuses:

```ts
expect(BusinessEnrichmentRunStatusSchema.options).toEqual([
  "pending",
  "resolved",
  "ambiguous",
  "not_found",
  "failed",
]);
```

- [ ] **Step 2: Run the focused test to prove RED**

Run:

```bash
npm run test --workspace Backend -- business-enrichment-contracts.spec.ts
```

Expected: FAIL because the contract/module does not exist.

- [ ] **Step 3: Write the migration**

Create:

```sql
CREATE TABLE public.business_enrichment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name_input text NOT NULL,
  website_hint text,
  country_hint text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','resolved','ambiguous','not_found','failed')),
  selected_candidate_id uuid,
  candidate_count integer NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  error_class text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE public.business_enrichment_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.business_enrichment_runs(id) ON DELETE CASCADE,
  canonical_name text NOT NULL,
  website text,
  country text,
  summary text,
  identity_confidence integer NOT NULL CHECK (identity_confidence BETWEEN 0 AND 100),
  source_urls text[] NOT NULL DEFAULT '{}',
  enriched_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  member_state text NOT NULL DEFAULT 'proposed'
    CHECK (member_state IN ('proposed','confirmed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Add owner/staff SELECT policies; authenticated users must not insert arbitrary evidence rows.

- [ ] **Step 4: Mirror tables in Drizzle**

Add `businessEnrichmentRuns` and `businessEnrichmentCandidates` to `Backend/src/db/schema.ts` with the same column names/types.

- [ ] **Step 5: Run typecheck and migration grep checks**

```bash
npm run typecheck --workspace Backend
grep -n "business_enrichment_runs\|business_enrichment_candidates" supabase/migrations/20260822040000_business_enrichment.sql
```

Expected: PASS and both table names present.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260822040000_business_enrichment.sql Backend/src/db/schema.ts Backend/test/business-enrichment-contracts.spec.ts
git commit -m "feat: add business enrichment persistence"
```

---

### Task 2: Define shared enrichment contracts and deterministic identity scoring

**Files:**
- Create: `Shared/contracts/business-enrichment.ts`
- Create: `Shared/src/lib/businessIdentity.ts`
- Create: `Shared/src/lib/businessIdentity.test.ts`
- Modify: `Shared/contracts/index.ts`

**Interfaces:**

```ts
BusinessEnrichmentRequestSchema
BusinessIdentityCandidateSchema
BusinessEnrichmentResponseSchema
scoreBusinessIdentity(input, candidate): number
selectBusinessIdentity(candidates): { state; candidate? }
```

- [ ] **Step 1: Write failing identity tests**

Cover:

```ts
it("does not auto-select two similarly strong candidates", ...)
it("rewards exact name + website-domain evidence", ...)
it("penalizes a conflicting country hint", ...)
it("returns not_found when all candidates are below 60", ...)
it("auto-proposes only one candidate at >=85 with >=15 point lead", ...)
```

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Shared -- businessIdentity.test.ts
```

Expected: FAIL because `businessIdentity.ts` is absent.

- [ ] **Step 3: Implement schemas**

The request schema must be strict:

```ts
z.object({
  businessName: z.string().trim().min(2).max(160),
  website: z.string().trim().max(300).optional(),
  countryHint: z.string().trim().max(120).optional(),
}).strict()
```

Candidate confidence is integer `0..100`; source URLs max 10.

- [ ] **Step 4: Implement deterministic candidate scoring**

Use explicit weights:

- exact normalised business-name match: +45;
- strong token/name similarity: up to +25;
- website/domain matches explicit user hint: +25;
- country hint exact match: +15;
- country conflict: -30;
- missing source URLs: cap final confidence at 59.

Auto-propose only when top candidate `>=85` and leads second candidate by `>=15`. Otherwise return `ambiguous`.

- [ ] **Step 5: Run GREEN**

```bash
npm run test --workspace Shared -- businessIdentity.test.ts
npm run typecheck --workspace Shared
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Shared/contracts/business-enrichment.ts Shared/contracts/index.ts Shared/src/lib/businessIdentity.ts Shared/src/lib/businessIdentity.test.ts
git commit -m "feat: add deterministic business identity contracts"
```

---

### Task 3: Build SSRF-safe public evidence retrieval

**Files:**
- Create: `supabase/functions/_shared/safeExternalFetch.ts`
- Create: `Frontend/src/lib/__tests__/safe-external-fetch-contract.test.ts`

**Interfaces:**

```ts
safeExternalFetch(url, {
  timeoutMs: 10_000,
  maxBytes: 2_097_152,
  maxRedirects: 5,
}): Promise<SafeFetchResult>
```

- [ ] **Step 1: Write contract tests against source text**

Assert the helper contains protections for:

- HTTP/HTTPS only;
- localhost/private/link-local/metadata IP rejection;
- redirect cap 5;
- 10-second timeout default;
- 2 MiB body cap;
- content-type allowlist.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- safe-external-fetch-contract.test.ts
```

Expected: FAIL because helper is absent.

- [ ] **Step 3: Implement safe URL validation**

Reject hostnames/IPs resolving to:

```text
localhost
127.0.0.0/8
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
169.254.0.0/16
::1
fc00::/7
fe80::/10
169.254.169.254
```

Validate every redirect destination before following it.

- [ ] **Step 4: Implement bounded streaming body read**

Abort when bytes exceed `maxBytes`. Permit `text/html`, `text/plain`, and `application/json` only in V1.

- [ ] **Step 5: Run GREEN + Deno check**

```bash
npm run test --workspace Frontend -- safe-external-fetch-contract.test.ts
deno check supabase/functions/_shared/safeExternalFetch.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/safeExternalFetch.ts Frontend/src/lib/__tests__/safe-external-fetch-contract.test.ts
git commit -m "feat: add bounded external evidence fetch"
```

---

### Task 4: Add candidate discovery and evidence extraction Edge Function

**Files:**
- Create: `supabase/functions/_shared/businessDiscovery.ts`
- Create: `supabase/functions/business-enrichment/index.ts`
- Modify: `supabase/config.toml`
- Test: `Backend/test/business-enrichment-contracts.spec.ts`

**Interfaces:**

Initial discovery provider: Brave Search Web API using `BRAVE_SEARCH_API_KEY`.

The Edge Function:

```http
POST /functions/v1/business-enrichment
Authorization: Bearer <Supabase JWT>
{
  "businessName": "Top100 Africa Future Leaders",
  "website": "optional",
  "countryHint": "optional"
}
```

Returns `resolved`, `ambiguous`, or `not_found` plus bounded candidates.

- [ ] **Step 1: Add failing contract tests**

Assert:

- missing JWT -> unauthorised path exists;
- search results are not returned directly as confirmed identity;
- AI extraction prompt says `use only supplied evidence`;
- sensitive demographic inference is explicitly forbidden;
- extracted facts contain source URL references.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Backend -- business-enrichment-contracts.spec.ts
```

Expected: FAIL on missing Edge files/contract strings.

- [ ] **Step 3: Implement Brave discovery adapter**

Use query:

```text
"<business name>" <country hint> official
```

Request a bounded maximum of 8 results. Keep title, URL, description only. Do not trust provider descriptions as confirmed facts.

- [ ] **Step 4: Fetch candidate evidence**

For top candidates, use `safeExternalFetch` on the canonical website/result pages. Limit total evidence fetches per run to 6.

- [ ] **Step 5: Extract structured evidence using existing AI gateway**

System requirement:

```text
Extract only facts explicitly supported by the supplied evidence.
For unsupported fields return null/[]; do not use model memory.
Return source_urls for every non-null field.
Never infer sensitive personal characteristics.
```

- [ ] **Step 6: Score/select candidates deterministically and persist the run**

Use `selectBusinessIdentity`; persist candidate/evidence rows before responding.

- [ ] **Step 7: Register the function**

```toml
[functions.business-enrichment]
verify_jwt = true
```

- [ ] **Step 8: Verify**

```bash
deno check supabase/functions/business-enrichment/index.ts
npm run test --workspace Backend -- business-enrichment-contracts.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/_shared/businessDiscovery.ts supabase/functions/business-enrichment/index.ts supabase/config.toml Backend/test/business-enrichment-contracts.spec.ts
git commit -m "feat: add business enrichment edge pipeline"
```

---

### Task 5: Build member identity confirmation UX

**Files:**
- Create: `Frontend/src/lib/api/businessEnrichment.ts`
- Create: `Frontend/src/hooks/queries/businessEnrichment.ts`
- Create: `Frontend/src/components/funding/BusinessEnrichmentStart.tsx`
- Create: `Frontend/src/components/funding/BusinessIdentityConfirm.tsx`
- Create: `Frontend/src/components/funding/BusinessEnrichmentStart.test.tsx`
- Modify: `Frontend/src/components/funding/FundingWorkspace.tsx`

**Interfaces:**

```ts
useStartBusinessEnrichment()
useConfirmBusinessIdentity()
```

- [ ] **Step 1: Write failing UI tests**

Cover:

- accepts business name only;
- resolved candidate shows `Use this profile`, `Edit details`, `This isn't mine`;
- ambiguous candidates require a click before confirmation;
- not-found state asks for website/manual profile;
- provider failure does not erase current funding profile.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- BusinessEnrichmentStart.test.tsx
```

- [ ] **Step 3: Implement mutations and components**

Do not present proposed fields as confirmed before member action. Show source link(s) in an expandable `Where we found this` region.

- [ ] **Step 4: Integrate into Funding Radar**

When there is no confirmed/enriched business identity, show enrichment CTA above recommendation content without blocking manual search.

- [ ] **Step 5: Run GREEN**

```bash
npm run test --workspace Frontend -- BusinessEnrichmentStart.test.tsx
npm run typecheck --workspace Frontend
```

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/lib/api/businessEnrichment.ts Frontend/src/hooks/queries/businessEnrichment.ts Frontend/src/components/funding/BusinessEnrichmentStart.tsx Frontend/src/components/funding/BusinessIdentityConfirm.tsx Frontend/src/components/funding/BusinessEnrichmentStart.test.tsx Frontend/src/components/funding/FundingWorkspace.tsx
git commit -m "feat: add business identity confirmation experience"
```

---

### Task 6: Persist confirmed enrichment into the recommendation profile

**Files:**
- Modify: `Frontend/src/hooks/queries/directory.ts`
- Modify: `Frontend/src/pages/dashboard/DashboardProfileEdit.tsx`
- Modify: `Shared/contracts/profiles.ts`
- Modify: `Backend/src/db/schema.ts`
- Modify: `Backend/src/profiles/profiles.service.ts`
- Test: `Backend/test/profiles.service.spec.ts`
- Test: `Frontend/src/lib/validation/profile.test.ts`

**Interfaces:**

Member confirmation updates only supported profile fields. It never changes subscription, admin status, directory moderation or user identity.

- [ ] **Step 1: Write failing API parity test**

In `Backend/test/profiles.service.spec.ts`, upsert a profile containing enriched `organisation_type`, `operating_countries` and `founding_year` once those fields are added to the migration/contracts; assert round-trip preservation.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Backend -- profiles.service.spec.ts
```

- [ ] **Step 3: Add profile columns in the same enrichment migration**

Add:

```sql
organisation_type text,
operating_countries text[] NOT NULL DEFAULT '{}',
founding_year integer CHECK (founding_year IS NULL OR founding_year BETWEEN 1800 AND 2100),
business_identity_confirmed_at timestamptz,
business_identity_source_urls text[] NOT NULL DEFAULT '{}'
```

- [ ] **Step 4: Add fields to Frontend/Shared/Backend mappings**

Ensure both direct Supabase and NestJS API paths preserve them.

- [ ] **Step 5: Hydrate returning member forms without overwriting confirmed private funding preferences**

Public enrichment fills missing facts only; existing member-confirmed values win.

- [ ] **Step 6: Run GREEN**

```bash
npm run test --workspace Backend -- profiles.service.spec.ts
npm run test --workspace Frontend -- profile.test.ts
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260822040000_business_enrichment.sql Frontend/src/hooks/queries/directory.ts Frontend/src/pages/dashboard/DashboardProfileEdit.tsx Shared/contracts/profiles.ts Backend/src/db/schema.ts Backend/src/profiles/profiles.service.ts Backend/test/profiles.service.spec.ts Frontend/src/lib/validation/profile.test.ts
git commit -m "feat: persist confirmed business intelligence"
```

---

### Task 7: Add enrichment analytics without sensitive/raw evidence leakage

**Files:**
- Modify: `Shared/src/lib/analytics.ts`
- Modify: `Frontend/src/hooks/queries/businessEnrichment.ts`
- Test: `Shared/src/lib/analytics.test.ts` or nearest existing analytics test.

**Interfaces:**

Events:

```text
business_enrichment_started
business_identity_resolved
business_identity_ambiguous
business_identity_confirmed
business_identity_rejected
business_enrichment_failed
```

- [ ] **Step 1: Write failing event allowlist test**
- [ ] **Step 2: Verify RED**
- [ ] **Step 3: Add event names and emit only counts/confidence/state**

Do not place page text, raw fetched source bodies, or sensitive inferred values into general analytics metadata.

- [ ] **Step 4: Verify GREEN**

```bash
npm run test --workspace Shared
npm run test --workspace Frontend
```

- [ ] **Step 5: Commit**

```bash
git add Shared/src/lib/analytics.ts Frontend/src/hooks/queries/businessEnrichment.ts
git commit -m "feat: measure business enrichment outcomes"
```

---

### Task 8: Plan-level release verification

**Files:**
- Modify: `docs/product/BUSINESS-ENRICHMENT-ENGINE.md`
- Modify: `docs/superpowers/plans/2026-08-22-business-enrichment-engine.md` checkboxes only after evidence.

- [ ] **Step 1: Run full workspace verification**

```bash
npm ci
npm run verify
```

Expected: exit 0.

- [ ] **Step 2: Deno-check every active Edge Function including enrichment**

```bash
deno check supabase/functions/business-enrichment/index.ts
deno check supabase/functions/aggregate-funding/index.ts
deno check supabase/functions/bachs-init/index.ts
deno check supabase/functions/bachs-verify/index.ts
deno check supabase/functions/bachs-webhook/index.ts
deno check supabase/functions/payment-reconciliation/index.ts
deno check supabase/functions/send-email/index.ts
deno check supabase/functions/email-unsubscribe/index.ts
```

- [ ] **Step 3: Acceptance fixtures**

Create at least these cases in tests/fixtures:

```text
unique organisation with official domain -> resolved
same-name organisations in two countries -> ambiguous
no trustworthy web presence -> not_found
malicious/private URL result -> rejected before fetch
AI extractor unsupported field -> null, never invented
member correction -> survives re-enrichment
```

- [ ] **Step 4: Update engine manual with actual implementation status and known external blockers**

- [ ] **Step 5: Commit verification documentation**

```bash
git add docs/product/BUSINESS-ENRICHMENT-ENGINE.md docs/superpowers/plans/2026-08-22-business-enrichment-engine.md
git commit -m "docs: certify business enrichment repository gate"
```

## Plan PASS gate

Repository-side PASS requires all tests/typechecks/builds/Deno checks green plus zero automatic false-identity selections in the acceptance fixtures. Live PASS additionally requires the Cresciva Supabase project, provider credentials and real source-network smoke tests; if those are unavailable, record `BLOCKED_EXTERNAL` rather than claiming production certification.
