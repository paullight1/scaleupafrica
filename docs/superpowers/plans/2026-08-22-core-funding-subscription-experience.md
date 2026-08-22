# Core Funding Subscription Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Funding Radar deliver the paid promise through a business-name-first, trust-explicit experience with separate Open for you, Closing soon, Watchlist and Explore surfaces.

**Architecture:** Funding Radar consumes canonical outputs from Business Enrichment, Opportunity Status and Recommendation Engines. The primary Apply experience is a derived view—never a second source of truth—and admits only verified, fresh, current-cycle open/rolling, deterministically eligible records. Member interactions persist as workflow/feedback state without mutating deterministic eligibility.

**Tech Stack:** React, TypeScript, TanStack Query, Supabase/PostgreSQL, existing funding/recommendation hooks, shared analytics, Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-22-business-to-funding-intelligence-design.md`

## Global Constraints

- Primary `Open for you` requires verified + fresh + `open|closing_soon|rolling` + eligible.
- `Closing soon` is a subset of the primary eligible/open set.
- Upcoming/current-status-unknown/incomplete-eligibility records go to Watchlist, not Apply Now.
- AI discoveries remain Explore-only and explicitly unverified.
- Zero primary recommendations is valid and must not trigger padded AI results.
- Match score, source confidence, application status and readiness are visually distinct.
- Official source/application CTA is primary for verified/open records.
- User feedback never directly changes hard eligibility rules.
- Existing membership/paywall gates remain authoritative.
- Do not hand-edit generated Supabase types; regenerate them only from the real project/tooling.

---

## File Structure

**Create**

- `supabase/migrations/20260822060000_member_funding_pipeline.sql` — per-member opportunity workflow state.
- `Frontend/src/lib/funding/primaryFundingGate.ts` — pure Apply Now/Watchlist/Explore classifier.
- `Frontend/src/lib/funding/primaryFundingGate.test.ts` — truth-table tests.
- `Frontend/src/components/funding/FundingRadarTabs.tsx` — tab navigation/counts.
- `Frontend/src/components/funding/FundingRadarTabs.test.tsx` — UI gating tests.
- `Frontend/src/hooks/queries/memberOpportunityState.ts` — saved/preparing/applied/won/rejected/dismissed workflow.
- `Frontend/src/hooks/queries/memberOpportunityState.test.ts` — state-mutation tests.
- `Frontend/src/components/funding/FundingProfilePrompt.tsx` — enrichment/profile-completeness prompt.
- `Frontend/src/components/funding/FundingSearch.test.tsx` — Explore/search grouping tests.
- `Shared/src/lib/analytics.test.ts` — funding event allowlist/privacy tests.
- `Backend/test/funding-notifications.spec.ts` — notification transition/dedupe tests.

**Modify**

- `Frontend/src/components/funding/FundingWorkspace.tsx` — compose primary/watchlist/explore lists.
- `Frontend/src/components/funding/OpportunityCard.tsx` — hierarchy/status/CTA rules.
- `Frontend/src/components/funding/OpportunityCard.test.tsx` — trust-critical CTA tests.
- `Frontend/src/components/funding/FundingSearch.tsx` — Explore semantics and trust mix.
- `Frontend/src/hooks/queries/funding.ts` — carry status/evidence/member state.
- `Frontend/src/lib/funding/recommendationEngine.ts` — expose readiness/missing-information reasons used by UI.
- `Shared/src/lib/analytics.ts` — recommendation/application feedback events.
- `Backend/src/db/schema.ts` — mirror member workflow/notification tables.
- `supabase/config.toml` — register notification worker.
- `docs/product/CORE-SUBSCRIPTION-FUNDING-INTELLIGENCE-FLOW.md` — implementation/evidence status.

---

### Task 1: Define the primary funding gate as pure logic

**Files:**
- Create: `Frontend/src/lib/funding/primaryFundingGate.ts`
- Create: `Frontend/src/lib/funding/primaryFundingGate.test.ts`

**Interfaces:**

```ts
type FundingSurface =
  | "open_for_you"
  | "closing_soon"
  | "watchlist"
  | "explore";

interface PrimaryFundingGateInput {
  verificationStatus: "verified" | "stale" | "unverified";
  applicationStatus:
    | "open"
    | "closing_soon"
    | "rolling"
    | "upcoming"
    | "closed"
    | "paused"
    | "unknown";
  eligibilityStatus:
    | "eligible"
    | "possibly_eligible"
    | "insufficient_information"
    | "ineligible";
  statusFresh: boolean;
  discoverySource: "verified_feed" | "ai_assisted";
}

classifyFundingSurface(input: PrimaryFundingGateInput): FundingSurface[];
```

- [ ] **Step 1: Write the failing truth-table tests**

Include exact cases:

```text
verified + fresh + open + eligible -> [open_for_you]
verified + fresh + closing_soon + eligible -> [open_for_you, closing_soon]
verified + fresh + rolling + eligible -> [open_for_you]
verified + upcoming + eligible -> [watchlist]
verified + open + insufficient_information -> [watchlist]
verified + unknown + eligible -> [watchlist]
verified + closed -> [explore]
unverified AI discovery -> [explore]
stored open + statusFresh=false -> [watchlist]
ineligible -> [explore]
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
npm run test --workspace Frontend -- primaryFundingGate.test.ts
```

Expected: FAIL because `primaryFundingGate.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure classifier**

Do not copy the rule into React components; all surface membership must call this function.

- [ ] **Step 4: Run GREEN**

```bash
npm run test --workspace Frontend -- primaryFundingGate.test.ts
npm run typecheck --workspace Frontend
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/lib/funding/primaryFundingGate.ts Frontend/src/lib/funding/primaryFundingGate.test.ts
git commit -m "feat: gate primary funding recommendations"
```

---

### Task 2: Persist member opportunity workflow and feedback

**Files:**
- Create: `supabase/migrations/20260822060000_member_funding_pipeline.sql`
- Create: `Frontend/src/hooks/queries/memberOpportunityState.ts`
- Create: `Frontend/src/hooks/queries/memberOpportunityState.test.ts`
- Modify: `Backend/src/db/schema.ts`

**Interfaces:**

```sql
CREATE TABLE public.member_opportunity_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'saved'
    CHECK (state IN ('saved','preparing','applied','won','rejected','dismissed')),
  note text,
  applied_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);
```

Expose:

```ts
useMemberOpportunityStates(): UseQueryResult<MemberOpportunityState[]>;
useSetMemberOpportunityState(): UseMutationResult<...>;
```

- [ ] **Step 1: Write failing hook tests**

Test:

- `saved -> preparing -> applied` mutation payloads;
- `applied_at` is supplied only for `applied|won|rejected` transitions where required by implementation;
- failed mutation does not optimistically persist incorrect state;
- success invalidates the member-state query;
- `dismissed` remains member-local and does not update `funding_opportunities`.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- memberOpportunityState.test.ts
```

Expected: FAIL because the hook/module does not exist.

- [ ] **Step 3: Add migration and RLS**

Owner may SELECT/INSERT/UPDATE/DELETE only rows where `auth.uid() = user_id`. Do not expose other members' workflow state.

- [ ] **Step 4: Mirror the table in Drizzle and implement the hook**

- [ ] **Step 5: Run GREEN**

```bash
npm run test --workspace Frontend -- memberOpportunityState.test.ts
npm run typecheck --workspace Frontend
npm run typecheck --workspace Backend
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260822060000_member_funding_pipeline.sql Frontend/src/hooks/queries/memberOpportunityState.ts Frontend/src/hooks/queries/memberOpportunityState.test.ts Backend/src/db/schema.ts
git commit -m "feat: track member funding workflow"
```

---

### Task 3: Build Funding Radar tabs from engine output

**Files:**
- Create: `Frontend/src/components/funding/FundingRadarTabs.tsx`
- Create: `Frontend/src/components/funding/FundingRadarTabs.test.tsx`
- Modify: `Frontend/src/components/funding/FundingWorkspace.tsx`

**Interfaces:**

Tabs are exactly:

```text
Open for you
Closing soon
Watchlist
Explore
```

- [ ] **Step 1: Write failing tab tests**

Assert:

- counts match `classifyFundingSurface` output;
- unverified AI results never enter first three tabs;
- closed records never enter Open/Closing;
- zero Open results shows the honest zero state, not Explore results;
- tabs use `role=tablist`, `role=tab`, `aria-selected`, keyboard-focusable controls.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- FundingRadarTabs.test.tsx
```

Expected: FAIL because the tab component does not exist.

- [ ] **Step 3: Implement `FundingRadarTabs` and refactor `FundingWorkspace`**

Calculate recommendation results once, classify once, then render four derived lists.

- [ ] **Step 4: Add zero-state copy**

```text
No verified open opportunities match your confirmed profile today.
We are watching X relevant programmes for changes.
```

- [ ] **Step 5: Run GREEN**

```bash
npm run test --workspace Frontend -- FundingRadarTabs.test.tsx
npm run typecheck --workspace Frontend
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/funding/FundingRadarTabs.tsx Frontend/src/components/funding/FundingRadarTabs.test.tsx Frontend/src/components/funding/FundingWorkspace.tsx
git commit -m "feat: split Funding Radar by application readiness"
```

---

### Task 4: Rebuild opportunity-card hierarchy and CTA gates

**Files:**
- Modify: `Frontend/src/components/funding/OpportunityCard.tsx`
- Modify: `Frontend/src/components/funding/OpportunityCard.test.tsx`

**Interfaces:**

Primary card hierarchy:

```text
MATCH SCORE · APPLICATION STATUS
SOURCE/TRUST + CHECK AGE
Title / Funder
Amount
Why it matches (2-4)
Deadline/urgency
Potential blocker / missing info
CTA row
```

- [ ] **Step 1: Add failing trust-critical CTA tests**

Required assertions:

```text
verified + fresh + open + eligible -> "Apply on official site"
verified + upcoming -> no Apply; "View official source"
verified + closed -> no Apply
unverified AI -> "Check this discovery"; no Apply
verified + open + insufficient_information -> eligibility prompt; no Apply
```

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- OpportunityCard.test.tsx
```

Expected: at least one new trust-critical assertion FAILS.

- [ ] **Step 3: Implement compact hierarchy and CTA decisions**

Use separate badges/labels for verification and application status. Do not use one generic green `Verified` treatment to imply open.

- [ ] **Step 4: Add exact status labels**

```text
OPEN NOW
CLOSING SOON · N days left
ROLLING APPLICATIONS
UPCOMING
CLOSED
CURRENT STATUS NOT CONFIRMED
AI DISCOVERY · UNVERIFIED
```

- [ ] **Step 5: Run GREEN**

```bash
npm run test --workspace Frontend -- OpportunityCard.test.tsx
npm run typecheck --workspace Frontend
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/funding/OpportunityCard.tsx Frontend/src/components/funding/OpportunityCard.test.tsx
git commit -m "feat: make funding cards status and trust explicit"
```

---

### Task 5: Make Business Enrichment the first-class funding-profile entry point

**Files:**
- Create: `Frontend/src/components/funding/FundingProfilePrompt.tsx`
- Modify: `Frontend/src/components/funding/FundingWorkspace.tsx`
- Modify: `Frontend/src/components/funding/BusinessEnrichmentStart.tsx`
- Modify: `Frontend/src/components/funding/FundingRadarTabs.test.tsx`

**Interfaces:**

```ts
interface FundingProfilePromptState {
  identityConfirmed: boolean;
  profileCompleteness: number;
  missingEligibilityFields: string[];
}
```

- [ ] **Step 1: Add failing first-run tests to `FundingRadarTabs.test.tsx`**

Assert a new member sees:

```text
Tell Cresciva your organisation
[Business name]
[Find my organisation]
```

Assert a returning member with incomplete profile sees a compact improvement prompt rather than the full first-run form.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- FundingRadarTabs.test.tsx
```

Expected: new first-run/prompt assertions FAIL.

- [ ] **Step 3: Implement `FundingProfilePrompt`**

Show only deterministic missing-data benefits; do not promise fake percentage improvements.

- [ ] **Step 4: Keep manual profile editing available**

Render an explicit `Enter details manually` route/action whenever enrichment is unavailable, ambiguous or declined.

- [ ] **Step 5: Run GREEN**

```bash
npm run test --workspace Frontend -- FundingRadarTabs.test.tsx
npm run typecheck --workspace Frontend
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/funding/FundingProfilePrompt.tsx Frontend/src/components/funding/FundingWorkspace.tsx Frontend/src/components/funding/BusinessEnrichmentStart.tsx Frontend/src/components/funding/FundingRadarTabs.test.tsx
git commit -m "feat: make business enrichment the funding entry point"
```

---

### Task 6: Integrate Explore/Search without weakening primary trust

**Files:**
- Modify: `Frontend/src/components/funding/FundingSearch.tsx`
- Modify: `Frontend/src/hooks/queries/funding.ts`
- Create: `Frontend/src/components/funding/FundingSearch.test.tsx`

**Interfaces:**

Search groups are exactly:

```text
Verified current matches
Other verified records
AI discoveries
```

- [ ] **Step 1: Write failing grouping tests**

Assert:

- verified/current records render before other verified records;
- AI discoveries render in their own labelled group;
- explicit user search cannot make AI discovery receive `Apply on official site` treatment;
- result summary reports counts by trust/status group;
- zero/few result states stay truthful.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- FundingSearch.test.tsx
```

Expected: FAIL because the new grouping behavior/test target is not implemented.

- [ ] **Step 3: Implement grouping and copy**

Example summary:

```text
9 results · 4 verified current · 2 verified watchlist · 3 AI discoveries
```

- [ ] **Step 4: Run GREEN**

```bash
npm run test --workspace Frontend -- FundingSearch.test.tsx
npm run typecheck --workspace Frontend
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/components/funding/FundingSearch.tsx Frontend/src/components/funding/FundingSearch.test.tsx Frontend/src/hooks/queries/funding.ts
git commit -m "feat: separate verified search from AI discoveries"
```

---

### Task 7: Add member feedback analytics and application events

**Files:**
- Modify: `Shared/src/lib/analytics.ts`
- Create: `Shared/src/lib/analytics.test.ts`
- Modify: `Frontend/src/hooks/queries/memberOpportunityState.ts`
- Modify: `Frontend/src/hooks/queries/memberOpportunityState.test.ts`
- Modify: `Frontend/src/components/funding/OpportunityCard.tsx`

**Interfaces:**

Event allowlist additions:

```text
recommendation_impression
recommendation_open
recommendation_save
recommendation_not_relevant
application_started
application_submitted
application_won
application_rejected
opportunity_source_click
```

- [ ] **Step 1: Write failing analytics allowlist/privacy tests**

Assert all nine events are accepted and metadata sanitisation does not admit raw third-party page bodies or unrestricted query/source text.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Shared -- analytics.test.ts
```

Expected: FAIL until new events are added.

- [ ] **Step 3: Add events and emit them only after successful mutations where applicable**

For save/applied/won/rejected events, emit after the member-state database mutation succeeds.

- [ ] **Step 4: Add mutation-event assertions**

Update `memberOpportunityState.test.ts` to prove failure paths do not emit success analytics.

- [ ] **Step 5: Run GREEN**

```bash
npm run test --workspace Shared -- analytics.test.ts
npm run test --workspace Frontend -- memberOpportunityState.test.ts
npm run typecheck --workspace Shared
npm run typecheck --workspace Frontend
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Shared/src/lib/analytics.ts Shared/src/lib/analytics.test.ts Frontend/src/hooks/queries/memberOpportunityState.ts Frontend/src/hooks/queries/memberOpportunityState.test.ts Frontend/src/components/funding/OpportunityCard.tsx
git commit -m "feat: track funding recommendation outcomes"
```

---

### Task 8: Add Watchlist transition notification foundation

**Files:**
- Create: `supabase/migrations/20260822061000_funding_notifications.sql`
- Create: `supabase/functions/funding-notifications/index.ts`
- Create: `Backend/test/funding-notifications.spec.ts`
- Modify: `supabase/config.toml`

**Interfaces:**

Meaningful transition types:

```text
watchlist_upcoming_to_open
watchlist_unknown_to_open
open_to_closing_soon
deadline_changed
member_became_eligible
new_high_fit_open_opportunity
```

Outbox must have a unique `event_key` so the same transition cannot enqueue twice.

- [ ] **Step 1: Write failing dedupe/transition tests**

Test that identical `{user, opportunity, transition, source-state-version}` produces one outbox event and unchanged refreshes produce zero notification events.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Backend -- funding-notifications.spec.ts
```

Expected: FAIL because notification persistence/worker contract does not exist.

- [ ] **Step 3: Create notification outbox migration**

Include `event_key text UNIQUE NOT NULL`, `user_id`, `opportunity_id`, `event_type`, `payload jsonb`, `status`, `attempt_count`, timestamps.

- [ ] **Step 4: Implement delivery worker using existing email infrastructure**

Authenticate scheduled mode with a dedicated secret; respect existing email preferences; mark sent/failed idempotently.

- [ ] **Step 5: Register the function and verify**

```bash
deno check supabase/functions/funding-notifications/index.ts
npm run test --workspace Backend -- funding-notifications.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260822061000_funding_notifications.sql supabase/functions/funding-notifications/index.ts Backend/test/funding-notifications.spec.ts supabase/config.toml
git commit -m "feat: notify members on meaningful funding changes"
```

---

### Task 9: Full subscriber-flow verification

**Files:**
- Modify: `docs/product/CORE-SUBSCRIPTION-FUNDING-INTELLIGENCE-FLOW.md`
- Modify: `docs/superpowers/plans/2026-08-22-core-funding-subscription-experience.md` — check boxes only after fresh evidence.

- [ ] **Step 1: Run full repository verification**

```bash
npm ci
npm run verify
```

Expected: exit 0.

- [ ] **Step 2: Deno-check every active Edge Function including new funding workers**

```bash
for f in \
  supabase/functions/business-enrichment/index.ts \
  supabase/functions/funding-source-refresh/index.ts \
  supabase/functions/funding-notifications/index.ts \
  supabase/functions/aggregate-funding/index.ts \
  supabase/functions/bachs-init/index.ts \
  supabase/functions/bachs-verify/index.ts \
  supabase/functions/bachs-webhook/index.ts \
  supabase/functions/payment-reconciliation/index.ts \
  supabase/functions/send-email/index.ts \
  supabase/functions/email-unsubscribe/index.ts; do
  deno check "$f"
done
```

Expected: every command exits 0.

- [ ] **Step 3: Execute the end-to-end fixture matrix**

Automated acceptance tests must cover:

```text
name-only business resolves -> confirmed -> open eligible recommendations
ambiguous business -> no recommendation profile until selection
no open eligible opportunities -> truthful zero + Watchlist
verified closed high match -> Explore only, no Apply CTA
unverified AI discovery -> Explore only
verified open but missing stage -> Watchlist/missing-detail prompt, no Apply CTA
verified open eligible -> Apply official source CTA
status becomes stale -> removed from Open for you
```

Run:

```bash
npm run test --workspace Frontend -- FundingRadarTabs.test.tsx OpportunityCard.test.tsx FundingSearch.test.tsx
npm run test --workspace Backend -- funding-notifications.spec.ts funding-status.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Verify membership boundary**

Run the existing funding/paywall tests and confirm a non-member cannot read full recommendation/source/eligibility intelligence.

```bash
npm run test --workspace Frontend -- DashboardFunding.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Update engine manual with exact implementation status and external deployment blockers**

Document repository evidence separately from live deployment evidence.

- [ ] **Step 6: Commit verification documentation**

```bash
git add docs/product/CORE-SUBSCRIPTION-FUNDING-INTELLIGENCE-FLOW.md docs/superpowers/plans/2026-08-22-core-funding-subscription-experience.md
git commit -m "docs: record core funding subscription verification"
```

## Plan PASS gate

Repository PASS requires the trust-critical UI matrix, workspace verification and all Edge checks green. Production PASS additionally requires live source refresh and Business Enrichment smoke tests. The paid claim `Open for you` must not be enabled in production until the Accuracy Certification plan passes.
