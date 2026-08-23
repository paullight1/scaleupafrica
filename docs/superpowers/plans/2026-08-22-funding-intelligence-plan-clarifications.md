# Funding Intelligence P0 Plan Execution Clarifications

**Status:** MANDATORY companion to the 2026-08-22 P0 plan set.

This file removes the remaining ambiguous execution wording discovered during Superpowers self-review. Where this file names a task/step, the exact path/command below overrides the shorter wording in the original plan.

## Business Enrichment Plan — Task 7 analytics

Applies to: `docs/superpowers/plans/2026-08-22-business-enrichment-engine.md`, Task 7.

### Exact files

- Modify: `Shared/src/lib/analytics.ts`
- Create: `Shared/src/lib/analytics.test.ts`
- Modify: `Frontend/src/hooks/queries/businessEnrichment.ts`

### Exact RED step

Add failing tests in `Shared/src/lib/analytics.test.ts` requiring these events:

```text
business_enrichment_started
business_identity_resolved
business_identity_ambiguous
business_identity_confirmed
business_identity_rejected
business_enrichment_failed
```

Also assert analytics metadata rejects/omits raw fetched page bodies and sensitive inferred fields.

Run:

```bash
npm run test --workspace Shared -- analytics.test.ts
```

Expected: FAIL until the event allowlist is extended.

### Exact GREEN step

After adding the event names and emitting only counts, confidence bands, resolution state and candidate counts:

```bash
npm run test --workspace Shared -- analytics.test.ts
npm run typecheck --workspace Shared
npm run typecheck --workspace Frontend
```

Expected: PASS.

### Exact commit

```bash
git add Shared/src/lib/analytics.ts Shared/src/lib/analytics.test.ts Frontend/src/hooks/queries/businessEnrichment.ts
git commit -m "feat: measure business enrichment outcomes"
```

---

## Open Opportunity Verification Plan — Task 4 source refresh RED

Applies to: `docs/superpowers/plans/2026-08-22-open-opportunity-verification-engine.md`, Task 4 Step 2.

After adding failing orchestration contract assertions to `Backend/test/funding-status.spec.ts`, run:

```bash
npm run test --workspace Backend -- funding-status.spec.ts
```

Expected: FAIL because `supabase/functions/funding-source-refresh/index.ts` and its orchestration behavior are not implemented yet.

The test must cover all of:

```text
batch limit <= 25
safeExternalFetch is the retrieval boundary
success writes a source-check row
bounded failure writes a source-check row
extractor output cannot directly persist trusted status
conflict becomes unknown
invalid refresh secret cannot run due mode
```

---

## Open Opportunity Verification Plan — Task 6 Search/Recommendation RED and GREEN

Applies to: `docs/superpowers/plans/2026-08-22-open-opportunity-verification-engine.md`, Task 6 Steps 1, 2 and 6.

### Exact test files

- Modify: `Frontend/src/lib/funding/recommendationEngine.test.ts`
- Modify: `Backend/test/funding-verified-first.spec.ts`
- Modify: `Backend/test/funding.service.spec.ts`

### Exact RED assertions

Frontend:

```text
verified + closed strong match retains fit score but cannot qualify for primary apply-now status
stored open + stale source check becomes effective unknown/non-primary
AI discovery carries application_status=unknown
```

Backend:

```text
verified-first API carries application_status/status_checked_at/current-cycle fields
AI fallback is always unverified + application_status=unknown
Backend current-status treatment matches Edge contract
```

Run:

```bash
npm run test --workspace Frontend -- recommendationEngine.test.ts
npm run test --workspace Backend -- funding-verified-first.spec.ts funding.service.spec.ts
```

Expected: at least one command FAILS before the status fields/effective-freshness logic are wired.

### Exact GREEN commands

```bash
npm run test --workspace Frontend -- recommendationEngine.test.ts
npm run test --workspace Backend -- funding-verified-first.spec.ts funding.service.spec.ts
npm run typecheck --workspace Frontend
npm run typecheck --workspace Backend
deno check supabase/functions/aggregate-funding/index.ts
```

Expected: PASS.

### Exact commit

```bash
git add Frontend/src/hooks/queries/funding.ts Frontend/src/lib/funding/recommendationEngine.ts Frontend/src/lib/funding/recommendationEngine.test.ts supabase/functions/aggregate-funding/index.ts Backend/src/funding/funding.service.ts Backend/test/funding-verified-first.spec.ts Backend/test/funding.service.spec.ts
git commit -m "feat: enforce current-cycle status in funding intelligence"
```

---

## Rule for all P0 plans

Any step that appears shorter in an original plan must still satisfy the global execution loop:

```text
write behavior test first
-> run exact focused test and observe expected RED
-> implement minimum behavior
-> rerun exact focused test GREEN
-> run relevant typecheck/Deno check
-> review P0/P1 findings
-> commit
```

Do not interpret a missing inline command as permission to skip RED/GREEN verification.
