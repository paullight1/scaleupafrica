# Core Funding Subscription Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Funding Radar deliver the paid promise through a business-name-first, trust-explicit experience with separate Open for you, Closing soon, Watchlist and Explore surfaces.

**Architecture:** Funding Radar consumes the canonical outputs of Business Enrichment, Opportunity Status and Recommendation Engines. The primary Apply experience is a derived view—never a second source of truth—and only admits verified, fresh, current-cycle open/rolling, deterministically eligible records. Member interactions persist as workflow/feedback state without mutating deterministic eligibility.

**Tech Stack:** React, TypeScript, TanStack Query, Supabase/PostgreSQL, existing funding/recommendation hooks, shared analytics, Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-22-business-to-funding-intelligence-design.md`

## Global Constraints

- Primary `Open for you` requires verified + fresh + open/closing-soon/rolling + eligible.
- `Closing soon` is a subset of the primary eligible/open set.
- Upcoming/current-status-unknown/incomplete-eligibility records go to Watchlist, not Apply Now.
- AI discoveries remain Explore-only and explicitly unverified.
- Zero primary recommendations is valid and must not trigger padded AI results.
- Match score, source confidence, application status and readiness are visually distinct.
- Official source/application CTA is primary for verified/open records.
- User feedback never directly changes hard eligibility rules.
- Existing membership/paywall gates remain authoritative.

---

## File Structure

**Create**

- `supabase/migrations/20260822060000_member_funding_pipeline.sql` — per-member opportunity workflow state.
- `Frontend/src/lib/funding/primaryFundingGate.ts` — pure Apply Now/Watchlist/Explore classifier.
- `Frontend/src/lib/funding/primaryFundingGate.test.ts` — truth-table tests.
- `Frontend/src/components/funding/FundingRadarTabs.tsx` — tab navigation/counts.
- `Frontend/src/components/funding/FundingRadarTabs.test.tsx` — UI gating tests.
- `Frontend/src/hooks/queries/memberOpportunityState.ts` — save/applied/dismissed workflow.
- `Frontend/src/components/funding/FundingProfilePrompt.tsx` — missing-detail/enrichment progress prompt.

**Modify**

- `Frontend/src/components/funding/FundingWorkspace.tsx` — compose primary/watchlist/explore lists.
- `Frontend/src/components/funding/OpportunityCard.tsx` — hierarchy/status/CTA rules.
- `Frontend/src/components/funding/OpportunityCard.test.tsx` — trust-critical CTA tests.
- `Frontend/src/components/funding/FundingSearch.tsx` — Explore semantics and trust mix.
- `Frontend/src/hooks/queries/funding.ts` — carry status/evidence and member state.
- `Frontend/src/lib/funding/recommendationEngine.ts` — expose readiness/missing-information reasons used by UI.
- `Shared/src/lib/analytics.ts` — recommendation/application feedback events.
- `Shared/integrations/supabase/types.ts` — regenerate only when the real project/tooling is available; do not hand-edit generated types.
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

classifyFundingSurface({
  verificationStatus,
  applicationStatus,
  eligibilityStatus,
  statusFresh,
  discoverySource,
}): FundingSurface[]
```

- [ ] **Step 1: Write failing truth-table tests**

Required cases:

```text
verified + fresh + open + eligible -> open_for_you
verified + fresh + closing_soon + eligible -> open_for_you + closing_soon
verified + fresh + rolling + eligible -> open_for_you
verified + upcoming + eligible -> watchlist
verified + open + insufficient_information -> watchlist
verified + unknown + strong match -> watchlist
verified + closed -> explore only
unverified AI discovery -> explore only
stale stored open -> watchlist/explore, never open_for_you
ineligible -> never open_for_you/watchlist eligibility prompt
```

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- primaryFundingGate.test.ts
```

- [ ] **Step 3: Implement minimal pure classifier**

No UI conditions may duplicate this business rule later.

- [ ] **Step 4: Run GREEN**

```bash
npm run test --workspace Frontend -- primaryFundingGate.test.ts
```

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
- Modify: `Backend/src/db/schema.ts`
- Test: `Frontend/src/hooks/queries/memberOpportunityState.test.ts`

**Interfaces:**

Use one row per member/canonical opportunity:

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

Owner-only RLS; staff may read aggregated support data only if needed by existing staff policy.

- [ ] **Step 1: Write failing hook tests**

Cover successful state transitions, rollback/error behavior and query invalidation.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Add migration and Drizzle mirror**

- [ ] **Step 4: Implement TanStack Query hook**

```ts
useMemberOpportunityStates()
useSetMemberOpportunityState()
```

Do not treat `dismissed` as global opportunity invalidation; it is a member preference signal.

- [ ] **Step 5: Run GREEN**

```bash
npm run test --workspace Frontend -- memberOpportunityState.test.ts
npm run typecheck --workspace Backend
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260822060000_member_funding_pipeline.sql Frontend/src/hooks/queries/memberOpportunityState.ts Backend/src/db/schema.ts
git commit -m "feat: track member funding workflow"
```

---

### Task 3: Build Funding Radar tabs from engine output

**Files:**
- Create: `Frontend/src/components/funding/FundingRadarTabs.tsx`
- Create: `Frontend/src/components/funding/FundingRadarTabs.test.tsx`
- Modify: `Frontend/src/components/funding/FundingWorkspace.tsx`

**Interfaces:**

Tabs:

```text
Open for you
Closing soon
Watchlist
Explore
```

- [ ] **Step 1: Write failing tab tests**

Assert:

- counts match classified results;
- unverified AI result never enters first three tabs;
- closed record cannot enter Open/Closing;
- zero Open results shows honest zero state, not Explore results;
- active tab is keyboard accessible and uses correct ARIA semantics.

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- FundingRadarTabs.test.tsx
```

- [ ] **Step 3: Refactor FundingWorkspace composition**

Calculate recommendation result once, call `classifyFundingSurface`, build four lists, then render via tabs.

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

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/funding/FundingRadarTabs.tsx Frontend/src/components/funding/FundingRadarTabs.test.tsx Frontend/src/components/funding/FundingWorkspace.tsx
git commit -m "feat: split Funding Radar by application readiness"
```

---

### Task 4: Rebuild opportunity card information hierarchy and CTA gates

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

- [ ] **Step 1: Write failing trust-critical CTA tests**

Required:

```text
verified open eligible -> Apply on official site visible
verified upcoming -> no Apply; View source / Watchlist visible
verified closed -> no Apply
unverified AI -> Check this discovery; never Apply
verified open insufficient member data -> Confirm eligibility detail; no Apply
```

- [ ] **Step 2: Run RED**

```bash
npm run test --workspace Frontend -- OpportunityCard.test.tsx
```

- [ ] **Step 3: Implement compact hierarchy**

Keep secondary data in expanded section. Never use one generic green badge for both verification and open state.

- [ ] **Step 4: Add status-specific labels**

```text
OPEN NOW
CLOSING SOON · N days left
ROLLING APPLICATIONS
UPCOMING
CLOSED
CURRENT STATUS NOT CONFIRMED
AI DISCOVERY · UNVERIFIED
```

- [ ] **Step 5: Run GREEN + accessibility test suite**

```bash
npm run test --workspace Frontend -- OpportunityCard.test.tsx
npm run test --workspace Shared
```

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/funding/OpportunityCard.tsx Frontend/src/components/funding/OpportunityCard.test.tsx
git commit -m "feat: make funding cards status and trust explicit"
```

---

### Task 5: Make business enrichment the first-class funding-profile entry point

**Files:**
- Create: `Frontend/src/components/funding/FundingProfilePrompt.tsx`
- Modify: `Frontend/src/components/funding/FundingWorkspace.tsx`
- Modify: `Frontend/src/components/funding/BusinessEnrichmentStart.tsx`
- Test: `Frontend/src/components/funding/FundingRadarTabs.test.tsx`

**Interfaces:**

Funding profile state:

```ts
{
  identityConfirmed: boolean;
  profileCompleteness: number;
  missingEligibilityFields: string[];
}
```

- [ ] **Step 1: Write failing first-run tests**

New member sees:

```text
Tell Cresciva your organisation
[Business name]
[Find my organisation]
```

Returning member with incomplete funding profile sees a compact improvement prompt, not the full onboarding wizard again.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement prompt states**

Show how a missing field improves recommendation confidence/eligibility only when that improvement is real and deterministic.

- [ ] **Step 4: Confirm manual fallback remains available**

- [ ] **Step 5: Run GREEN**

- [ ] **Step 6: Commit**

---

### Task 6: Integrate Explore/Search without weakening primary trust

**Files:**
- Modify: `Frontend/src/components/funding/FundingSearch.tsx`
- Modify: `Frontend/src/hooks/queries/funding.ts`
- Test: `Frontend/src/components/funding/FundingSearch.test.tsx` or nearest existing test.

**Interfaces:**

Search result grouping:

```text
Verified/current matches
Other verified records
AI discoveries
```

- [ ] **Step 1: Write failing grouping tests**

- [ ] **Step 2: Ensure explicit search cannot move an AI discovery into Apply Now**

- [ ] **Step 3: Surface source mix truthfully**

Example:

```text
9 results · 4 verified current · 2 verified watchlist · 3 AI discoveries
```

- [ ] **Step 4: Preserve zero/few-result behavior**

- [ ] **Step 5: Run GREEN**

- [ ] **Step 6: Commit**

---

### Task 7: Add useful member feedback analytics and application events

**Files:**
- Modify: `Shared/src/lib/analytics.ts`
- Modify: `Frontend/src/hooks/queries/memberOpportunityState.ts`
- Modify: `Frontend/src/components/funding/OpportunityCard.tsx`
- Test: corresponding analytics/member-state tests.

**Interfaces:**

Events:

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

- [ ] **Step 1: Write failing analytics allowlist tests**
- [ ] **Step 2: Emit events after successful state mutations where applicable**
- [ ] **Step 3: Include match/status/confidence classes, not raw third-party source bodies**
- [ ] **Step 4: Run GREEN**
- [ ] **Step 5: Commit**

---

### Task 8: Add Watchlist transition notification foundation

**Files:**
- Create: `supabase/migrations/20260822061000_funding_notifications.sql`
- Create: `supabase/functions/funding-notifications/index.ts`
- Modify: `Shared/src/lib/analytics.ts`
- Test: `Backend/test/funding-status.spec.ts`

**Interfaces:**

Notify only on meaningful transitions:

```text
watchlist upcoming -> open
watchlist unknown -> open
open -> closing_soon
confirmed deadline changed
member profile update changes insufficient_information -> eligible for an open programme
new verified/open high-fit opportunity
```

- [ ] **Step 1: Write failing dedupe tests**

Same transition/event key must not send twice.

- [ ] **Step 2: Create notification outbox table with unique event key**

- [ ] **Step 3: Build JWT/cron-secret protected delivery worker using existing email infrastructure**

- [ ] **Step 4: Respect existing user email preferences**

- [ ] **Step 5: Deno check + tests**

- [ ] **Step 6: Commit**

---

### Task 9: Full subscriber-flow verification

**Files:**
- Modify: `docs/product/CORE-SUBSCRIPTION-FUNDING-INTELLIGENCE-FLOW.md`

- [ ] **Step 1: Run full repository verification**

```bash
npm ci
npm run verify
```

- [ ] **Step 2: Deno-check every active Edge Function including new funding workers**

- [ ] **Step 3: Execute end-to-end fixture matrix**

Minimum scenarios:

```text
name-only business resolves -> confirmed -> open eligible recommendations
ambiguous business -> no recommendation profile until selection
no open eligible opportunities -> truthful zero + Watchlist
verified closed high match -> Explore/Watchlist only, no Apply CTA
unverified AI discovery -> Explore-only
verified open but missing stage -> prompt, no Apply CTA
verified open eligible -> Apply official source CTA
status becomes stale -> removed from Open for you
```

- [ ] **Step 4: Verify membership boundary**

Non-member still sees only the approved teaser/paywall experience; detailed source/eligibility intelligence remains paid.

- [ ] **Step 5: Update engine manual with exact implemented behavior and external deployment blockers**

## Plan PASS gate

Repository PASS requires the trust-critical UI matrix, workspace verification and all Edge checks green. Production PASS additionally requires live source refresh and business enrichment smoke tests. The paid claim `open for you` must not be enabled in production until the Accuracy Certification plan passes.
