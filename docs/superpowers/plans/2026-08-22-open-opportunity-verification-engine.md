# Open Opportunity Verification Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continuously determine whether each authoritative funding programme is verified and whether the current application cycle is open, rolling, upcoming, closed, paused or unknown, with evidence and freshness sufficient for a paid `Apply now` promise.

**Architecture:** Extend the canonical opportunity record with application-cycle state and append-only source-check evidence. A bounded source-refresh Edge Function fetches registered authoritative URLs, extracts status signals from retrieved evidence, then a deterministic classifier assigns application status; AI may extract signals but cannot directly set trusted state. Recommendation/Search consume the stored/effective status and never infer `open` from a deadline alone.

**Tech Stack:** PostgreSQL/Supabase, TypeScript, Deno Edge Functions, existing `funding_sources`, existing `fundingTrust`, SSRF-safe `safeExternalFetch` from the Business Enrichment plan, Zod, React/AdminPanel, TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-22-business-to-funding-intelligence-design.md`

## Global Constraints

- `verification_status` and `application_status` are separate dimensions.
- Application status enum is exactly: `open`, `closing_soon`, `rolling`, `upcoming`, `closed`, `paused`, `unknown`.
- `closing_soon` threshold is 14 calendar days and requires OPEN first.
- Missing deadline never implies rolling.
- A future deadline alone never proves open.
- Current-cycle deadline must be source-backed; historical/typical dates are forbidden.
- AI may extract text/date/status signals but cannot directly promote trusted application state.
- Conflicting authoritative evidence becomes `unknown` and enters review.
- OPEN freshness <=24h; CLOSING_SOON <=6h; ROLLING <=48h; UPCOMING <=24h; CLOSED <=7d.
- Source retrieval must use bounded SSRF-safe fetch.
- Source worker failure must not turn stale evidence into optimistic status.

---

## File Structure

**Create**

- `supabase/migrations/20260822050000_opportunity_application_status.sql` — cycle/status fields and source-check history.
- `Shared/src/lib/fundingStatus.ts` — deterministic status classifier/freshness evaluator.
- `Shared/src/lib/fundingStatus.test.ts` — status truth-table tests.
- `supabase/functions/_shared/fundingSourceSignals.ts` — evidence extraction schema and prompt boundary.
- `supabase/functions/funding-source-refresh/index.ts` — bounded refresh orchestrator.
- `AdminPanel/src/pages/AdminFundingSources.tsx` — source health/conflict operations.
- `AdminPanel/src/hooks/queries/fundingSources.ts` — admin data layer.
- `AdminPanel/src/pages/AdminFundingSources.test.tsx` — operations UX tests.
- `Backend/test/funding-status.spec.ts` — API parity/status contract tests.

**Modify**

- `Shared/contracts/funding.ts` — status/cycle fields and schemas.
- `supabase/config.toml` — register refresh function.
- `Frontend/src/hooks/queries/funding.ts` — fetch application status and effective freshness.
- `Frontend/src/lib/funding/recommendationEngine.ts` — expose status without using it as match-score evidence.
- `Frontend/src/components/funding/OpportunityCard.tsx` — explicit current-status UI.
- `Frontend/src/components/funding/OpportunityCard.test.tsx` — CTA/status gates.
- `supabase/functions/aggregate-funding/index.ts` — verified search carries status, AI stays unknown.
- `Backend/src/db/schema.ts` — mirror new fields/check table.
- `Backend/src/funding/funding.service.ts` — API parity.
- `AdminPanel/src/App.tsx` — sources route.
- `AdminPanel/src/pages/AdminFunding.tsx` — show evidence/current-cycle state.
- `docs/product/OPPORTUNITY-STATUS-ENGINE.md` — evidence/status updates.

---

### Task 1: Add canonical application-cycle persistence

**Files:**
- Create: `supabase/migrations/20260822050000_opportunity_application_status.sql`
- Modify: `Backend/src/db/schema.ts`
- Modify: `Shared/contracts/funding.ts`
- Test: `Backend/test/funding-status.spec.ts`

**Interfaces:**

Add to `funding_opportunities`:

```text
application_status
status_checked_at
status_evidence_url
opens_at
deadline_at
deadline_timezone
deadline_status
current_cycle_label
application_url
```

Add append-only `funding_source_checks`.

- [ ] **Step 1: Write failing shared/API status contract test**

```ts
expect(ApplicationStatusSchema.options).toEqual([
  "open",
  "closing_soon",
  "rolling",
  "upcoming",
  "closed",
  "paused",
  "unknown",
]);
expect(DeadlineStatusSchema.options).toEqual(["confirmed", "rolling", "unknown"]);
```

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Backend -- funding-status.spec.ts
```

Expected: FAIL because schemas do not exist.

- [ ] **Step 3: Implement migration fields**

Use:

```sql
ALTER TABLE public.funding_opportunities
  ADD COLUMN IF NOT EXISTS application_status text NOT NULL DEFAULT 'unknown'
    CHECK (application_status IN ('open','closing_soon','rolling','upcoming','closed','paused','unknown')),
  ADD COLUMN IF NOT EXISTS status_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_evidence_url text,
  ADD COLUMN IF NOT EXISTS opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_timezone text,
  ADD COLUMN IF NOT EXISTS deadline_status text NOT NULL DEFAULT 'unknown'
    CHECK (deadline_status IN ('confirmed','rolling','unknown')),
  ADD COLUMN IF NOT EXISTS current_cycle_label text,
  ADD COLUMN IF NOT EXISTS application_url text;
```

Create `funding_source_checks` with source/opportunity IDs, URL, checked timestamp, HTTP metadata, fingerprint, extracted signals JSONB, classified status and bounded error class.

- [ ] **Step 4: Add indexes**

```sql
CREATE INDEX funding_open_status_idx
ON public.funding_opportunities (application_status, deadline_at)
WHERE status = 'published';

CREATE INDEX funding_source_checks_opportunity_idx
ON public.funding_source_checks (opportunity_id, checked_at DESC);
```

- [ ] **Step 5: Mirror in Drizzle and shared contracts**

- [ ] **Step 6: Run GREEN**

```bash
npm run test --workspace Backend -- funding-status.spec.ts
npm run typecheck --workspace Backend
npm run typecheck --workspace Shared
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260822050000_opportunity_application_status.sql Backend/src/db/schema.ts Shared/contracts/funding.ts Backend/test/funding-status.spec.ts
git commit -m "feat: add opportunity application status model"
```

---

### Task 2: Implement the deterministic status classifier

**Files:**
- Create: `Shared/src/lib/fundingStatus.ts`
- Create: `Shared/src/lib/fundingStatus.test.ts`

**Interfaces:**

```ts
interface FundingStatusSignals {
  sourceVerified: boolean;
  checkedAt: Date;
  cycleLabel?: string | null;
  explicitOpen: boolean;
  explicitClosed: boolean;
  explicitPaused: boolean;
  explicitRolling: boolean;
  applicationCtaActive: boolean;
  opensAt?: Date | null;
  deadlineAt?: Date | null;
  hasCurrentCycleEvidence: boolean;
  conflict: boolean;
}

classifyFundingStatus(signals, now): ApplicationStatus
freshnessWindowMs(status): number
isStatusFresh(status, checkedAt, now): boolean
```

- [ ] **Step 1: Write the truth-table tests first**

Required cases:

```text
verified + current cycle + explicit open + active CTA + future deadline -> open
same with deadline <=14d -> closing_soon
explicit rolling + active intake -> rolling
future opensAt + current cycle -> upcoming
explicit closed -> closed
explicit paused -> paused
future deadline without explicit/current intake evidence -> unknown
missing deadline without rolling evidence -> unknown
conflict -> unknown
stale open check >24h -> effective unknown
stale closing-soon check >6h -> effective unknown
```

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Shared -- fundingStatus.test.ts
```

- [ ] **Step 3: Implement classifier without AI**

Precedence:

1. conflict -> unknown;
2. not source verified/current cycle -> unknown;
3. paused -> paused;
4. explicit closed -> closed;
5. rolling + active intake -> rolling;
6. future opening date and not open -> upcoming;
7. explicit open + active CTA + deadline valid or no confirmed deadline -> open/closing_soon;
8. else unknown.

- [ ] **Step 4: Implement freshness helper**

Exact max ages:

```ts
open: 24h
closing_soon: 6h
rolling: 48h
upcoming: 24h
closed: 7d
paused: 24h
unknown: 12h
```

- [ ] **Step 5: Run GREEN**

```bash
npm run test --workspace Shared -- fundingStatus.test.ts
npm run typecheck --workspace Shared
```

- [ ] **Step 6: Commit**

```bash
git add Shared/src/lib/fundingStatus.ts Shared/src/lib/fundingStatus.test.ts
git commit -m "feat: classify current funding cycles deterministically"
```

---

### Task 3: Define source-signal extraction without giving AI truth ownership

**Files:**
- Create: `supabase/functions/_shared/fundingSourceSignals.ts`
- Test: `Backend/test/funding-status.spec.ts`

**Interfaces:**

```ts
interface ExtractedFundingSignals {
  cycle_label: string | null;
  explicit_open_text: string | null;
  explicit_closed_text: string | null;
  explicit_paused_text: string | null;
  rolling_text: string | null;
  application_cta_text: string | null;
  application_url: string | null;
  opens_at: string | null;
  deadline_at: string | null;
  deadline_timezone: string | null;
  source_quotes: string[];
}
```

- [ ] **Step 1: Add failing prompt-boundary tests**

Assert prompt includes:

```text
Use only supplied source text.
Do not infer open from a future deadline alone.
Do not substitute a historical/typical deadline.
Return null for unsupported fields.
Do not output a trusted application_status.
```

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Backend -- funding-status.spec.ts
```

- [ ] **Step 3: Implement schema + extractor**

The extractor may return candidate dates/text. The caller converts them into deterministic booleans/signals and calls `classifyFundingStatus`.

- [ ] **Step 4: Deno check**

```bash
deno check supabase/functions/_shared/fundingSourceSignals.ts
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/fundingSourceSignals.ts Backend/test/funding-status.spec.ts
git commit -m "feat: extract source-backed funding status signals"
```

---

### Task 4: Build bounded source refresh orchestration

**Files:**
- Create: `supabase/functions/funding-source-refresh/index.ts`
- Modify: `supabase/config.toml`
- Test: `Backend/test/funding-status.spec.ts`

**Interfaces:**

The function supports two modes:

```ts
{ mode: "due", limit?: number }
{ mode: "opportunity", opportunityId: string }
```

Authentication:

- staff JWT may run an individual recheck;
- scheduled due-mode requires `X-Cresciva-Refresh-Secret` matching `FUNDING_REFRESH_SECRET`.

Maximum due batch: 25 opportunities/source targets per invocation.

- [ ] **Step 1: Write failing orchestration contract tests**

Assert:

- batch limit <=25;
- uses `safeExternalFetch`;
- records a check row on success and bounded failure;
- persists classifier result, never extractor status;
- conflict yields unknown;
- invalid secret cannot run due-mode.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Query due sources/opportunities**

Prioritise:

1. closing soon overdue >6h;
2. open overdue >24h;
3. upcoming overdue >24h;
4. unknown/conflict overdue >12h;
5. rolling overdue >48h;
6. closed overdue >7d.

- [ ] **Step 4: Fetch + fingerprint**

Use `safeExternalFetch`. Hash canonical meaningful text with SHA-256. If fingerprint unchanged, classification can reuse last extracted signals only if freshness requirements and cycle identity remain valid; otherwise re-extract.

- [ ] **Step 5: Extract signals and classify**

Call `fundingSourceSignals` then `classifyFundingStatus`.

- [ ] **Step 6: Write append-only check and canonical status atomically enough for retries**

Use a per-check UUID/idempotency key in the check row. A retried invocation must not create contradictory state for the same check attempt.

- [ ] **Step 7: Register function**

```toml
[functions.funding-source-refresh]
verify_jwt = false
```

The function itself authenticates staff JWT or refresh secret; document why `verify_jwt=false` is required for scheduler mode.

- [ ] **Step 8: Verify**

```bash
deno check supabase/functions/funding-source-refresh/index.ts
npm run test --workspace Backend -- funding-status.spec.ts
```

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/funding-source-refresh/index.ts supabase/config.toml Backend/test/funding-status.spec.ts
git commit -m "feat: refresh authoritative funding source status"
```

---

### Task 5: Add staff source/status operations

**Files:**
- Create: `AdminPanel/src/hooks/queries/fundingSources.ts`
- Create: `AdminPanel/src/pages/AdminFundingSources.tsx`
- Create: `AdminPanel/src/pages/AdminFundingSources.test.tsx`
- Modify: `AdminPanel/src/App.tsx`
- Modify: `AdminPanel/src/pages/AdminFunding.tsx`

**Interfaces:**

Admin page sections:

```text
Due for refresh
Failures
Conflicts / Unknown
Sources
Recent status transitions
```

- [ ] **Step 1: Write failing UI tests**

Cover:

- failed source visibly shows error class and last success;
- conflict cannot be shown as OPEN;
- recheck calls individual refresh mode;
- source edit invalidates/rechecks dependent trust rather than silently preserving verified/open state;
- no `Force open` action exists.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace AdminPanel -- AdminFundingSources.test.tsx
```

- [ ] **Step 3: Implement query/mutation hooks**

Every mutation audit logs source/status operations.

- [ ] **Step 4: Implement admin page and route**

- [ ] **Step 5: Add compact status/source evidence in existing AdminFunding rows**

Show:

```text
Verified / Stale / Unverified
Open / Rolling / Upcoming / Closed / Unknown
last check
source link
```

- [ ] **Step 6: Run GREEN**

```bash
npm run test --workspace AdminPanel -- AdminFundingSources.test.tsx
npm run typecheck --workspace AdminPanel
```

- [ ] **Step 7: Commit**

```bash
git add AdminPanel/src/hooks/queries/fundingSources.ts AdminPanel/src/pages/AdminFundingSources.tsx AdminPanel/src/pages/AdminFundingSources.test.tsx AdminPanel/src/App.tsx AdminPanel/src/pages/AdminFunding.tsx
git commit -m "feat: add funding source monitoring console"
```

---

### Task 6: Carry status through Search and Recommendation boundaries

**Files:**
- Modify: `Frontend/src/hooks/queries/funding.ts`
- Modify: `Frontend/src/lib/funding/recommendationEngine.ts`
- Modify: `supabase/functions/aggregate-funding/index.ts`
- Modify: `Backend/src/funding/funding.service.ts`
- Test: `Frontend/src/lib/funding/recommendationEngine.test.ts`
- Test: `Backend/test/funding-verified-first.spec.ts`

**Interfaces:**

Recommendation results gain status metadata but match score remains conceptually independent from current-cycle availability.

- [ ] **Step 1: Write failing tests**

Required:

```text
verified + closed strong match is not eligible for primary apply-now output
verified + open candidate preserves match score
AI discovery status is always unknown/unverified
stale OPEN source becomes effective unknown before rendering
Backend and Edge return the same status classes
```

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Extend feed/search row selects and contracts**

Carry:

```text
application_status
status_checked_at
status_evidence_url
opens_at
deadline_at
deadline_status
current_cycle_label
application_url
```

- [ ] **Step 4: Recompute effective freshness at read time**

Never trust a stored `open` forever simply because a background job stopped.

- [ ] **Step 5: Keep AI fallback unknown**

AI discoveries may have model text/deadlines but:

```ts
verification_status = "unverified"
application_status = "unknown"
```

- [ ] **Step 6: Run GREEN**

```bash
npm run test --workspace Frontend -- recommendationEngine.test.ts
npm run test --workspace Backend -- funding-verified-first.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/hooks/queries/funding.ts Frontend/src/lib/funding/recommendationEngine.ts supabase/functions/aggregate-funding/index.ts Backend/src/funding/funding.service.ts Frontend/src/lib/funding/recommendationEngine.test.ts Backend/test/funding-verified-first.spec.ts
git commit -m "feat: enforce current-cycle status in funding intelligence"
```

---

### Task 7: Add source freshness and status observability

**Files:**
- Modify: `Shared/src/lib/analytics.ts`
- Create: `docs/production-readiness/evidence/funding-source-monitoring.md`

**Interfaces:**

Operational metrics:

```text
funding_source_check_success
funding_source_check_failure
funding_status_changed
funding_status_conflict
funding_source_overdue
```

- [ ] **Step 1: Add failing event allowlist tests**
- [ ] **Step 2: Add aggregate events only; no raw source bodies**
- [ ] **Step 3: Document alert thresholds**

Alert when:

- >5% of primary OPEN records are past freshness SLA;
- one authoritative source fails 3 consecutive due checks;
- conflict count >0 for an opportunity currently shown in primary recommendations;
- broken source-link sample >=1%.

- [ ] **Step 4: Verify**

```bash
npm run test --workspace Shared
```

- [ ] **Step 5: Commit**

---

### Task 8: Full status-engine certification gate

**Files:**
- Modify: `docs/product/OPPORTUNITY-STATUS-ENGINE.md`
- Modify: `docs/production-readiness/evidence/funding-source-monitoring.md`

- [ ] **Step 1: Run repository verification**

```bash
npm ci
npm run verify
```

- [ ] **Step 2: Run Deno checks including refresh and search**

```bash
deno check supabase/functions/funding-source-refresh/index.ts
deno check supabase/functions/business-enrichment/index.ts
deno check supabase/functions/aggregate-funding/index.ts
```

Then all other active functions required by `.github/workflows/ci.yml`.

- [ ] **Step 3: Run status truth-table fixtures**

Minimum 30 curated cases covering every status, conflict, stale evidence, historic-cycle contamination and timezone edge.

- [ ] **Step 4: Confirm no current-cycle status is inferred from AI memory**

Search source for assignments/prompts that could bypass classifier:

```bash
grep -R "application_status.*open\|applicationStatus.*open" supabase/functions Backend/src Frontend/src Shared/src
```

Review every hit.

- [ ] **Step 5: Update evidence document with actual PASS/BLOCKED_EXTERNAL state**

Live certification requires network smoke tests against the real Cresciva source registry and deployed scheduler. Without live project/secrets, status is `BLOCKED_EXTERNAL`, not PASS.

## Plan PASS gate

Repository PASS requires deterministic status truth-table tests, full workspace verification, all active Edge Deno checks, and zero AI-only paths capable of assigning verified/open trust. Production PASS additionally requires scheduled refresh evidence and >=98% correct Open/Closing Soon/Rolling status in the certification benchmark.
