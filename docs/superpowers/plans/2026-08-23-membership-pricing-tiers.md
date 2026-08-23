# Membership Pricing Tiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add monthly ($10), quarterly ($25), and annual ($90) one-time Bachs membership tiers with server-priced checkout and duration-aware entitlement grants.

**Architecture:** The Supabase Edge Function billing module remains the pricing source of truth. The frontend mirrors the plan metadata for display only. Bachs product IDs become plan-and-currency specific; USD supports all three new tiers, while the existing NGN annual product remains available until NGN prices/products are supplied. A new privileged Postgres grant routine derives the entitlement duration from the stored `payments.plan_code`.

**Tech Stack:** React/Vite, TypeScript, Vitest, Supabase Edge Functions, PostgreSQL migrations, Bachs hosted checkout.

**Spec:** User request in this conversation: monthly $10, quarterly $25, annual $90.

## Global Constraints

- The browser sends `{ plan_code, currency }`, never an amount.
- Server prices are integer cents/kobo and successful provider amount/currency must match the internal payment row.
- USD is supported for monthly, quarterly, and annual; the existing NGN annual price remains supported.
- Monthly/quarterly NGN checkout is rejected until explicit NGN prices and Bachs products are configured.
- Bachs membership products remain one-time products with no automatic renewal.
- Only the service-role grant RPC can change paid access.

### Task 1: Lock the new billing contract with failing tests

**Files:**
- Modify: `Frontend/src/lib/__tests__/billing.test.ts`
- Test: `Frontend/src/lib/__tests__/billing.test.ts`

- [x] Update tests to assert plan codes `monthly`, `quarterly`, `annual`, USD amounts `1_000`, `2_500`, `9_000`, monthly terms `1`, `3`, and `12`, and null for monthly/quarterly NGN.
- [x] Run `npm test --workspace Frontend -- src/lib/__tests__/billing.test.ts` and confirm the new assertions fail against the annual-only implementation.

### Task 2: Implement the canonical and display billing models

**Files:**
- Modify: `supabase/functions/_shared/billing.ts`
- Modify: `Frontend/src/lib/billing.ts`

- [x] Add `monthly`, `quarterly`, and `annual` plan codes with `term_months` values `1`, `3`, and `12`.
- [x] Store USD prices as `1_000`, `2_500`, and `9_000` cents; retain the existing annual NGN price and return `null` for unsupported plan/currency pairs.
- [x] Keep client and server plan metadata in parity without allowing the browser to define charge amounts.
- [x] Run the billing test file and confirm it passes.

### Task 3: Make Bachs product selection plan-aware

**Files:**
- Modify: `supabase/functions/bachs-init/index.ts`
- Modify: `Frontend/src/lib/bachs.ts`
- Modify: `Frontend/src/components/billing/CheckoutButton.tsx`
- Test: `Frontend/src/lib/__tests__/bachs-client.test.ts`

- [x] Replace annual-only product env lookups with plan-specific product variables for USD monthly/quarterly/annual and NGN annual compatibility.
- [x] Select the product by both validated plan code and currency, rejecting unsupported combinations before creating a payment row.
- [x] Keep the default checkout plan annual and allow pricing cards to pass the selected plan code.
- [x] Add tests proving checkout requests retain the selected plan code and invalid unsupported combinations are not accepted by the billing contract.
- [x] Run the focused Bachs and billing tests.

### Task 4: Grant the purchased duration atomically

**Files:**
- Modify: `supabase/migrations/20260823095653_membership_plan_terms.sql`
- Modify: `supabase/functions/bachs-webhook/index.ts`
- Modify: `supabase/functions/bachs-verify/index.ts`

- [x] Create the migration with the Supabase CLI migration generator.
- [x] Add a service-role-only `grant_membership_access(UUID)` RPC that maps `monthly` to one month, `quarterly` to three months, and `annual` to twelve months using the stored payment row, preserving idempotency and rollback-on-missing-subscription behavior.
- [x] Update webhook and callback verification to call the new RPC; keep the legacy annual RPC available for historical compatibility unless the migration safely replaces it.
- [x] Run `npx supabase db lint --help` to confirm available local SQL validation, then run the available lint command and focused backend/payment tests.

### Task 5: Update the pricing UI and copy

**Files:**
- Modify: `Frontend/src/components/landing/Pricing.tsx`
- Modify: `Frontend/src/components/billing/BillingPanel.tsx`
- Modify: `Frontend/src/lib/billing.ts`
- Test: `Frontend/src/components/landing/__tests__/pricing.test.tsx`

- [x] Render three selectable pricing cards with monthly `$10`, quarterly `$25`, and annual `$90` in USD.
- [x] Preserve the existing NGN currency control for the annual plan and clearly mark monthly/quarterly as USD-only when NGN is selected.
- [x] Pass each card's `planCode` through `CheckoutButton`.
- [x] Replace annual-only membership copy in billing surfaces with plan-neutral wording.
- [x] Add a focused UI test for the three USD prices and selected plan checkout intent.
- [x] Run the focused UI tests and the frontend build.

### Task 6: Align non-secret provider/deployment documentation

**Files:**
- Modify: `docs/production-readiness/01-PAYMENT-RELIABILITY-LEDGER.md`
- Modify: `docs/production-readiness/03-PRODUCTION-ENV-DOMAINS-SECRETS.md`
- Modify: `docs/production-readiness/evidence/environment-inventory.md`

- [x] Document the three one-time USD product variables and their exact prices.
- [x] Document that NGN currently supports the legacy annual product only.
- [x] Run `npm run lint`, `npm run typecheck`, focused tests, and the relevant release-readiness checks.

## Verification

- `npm test --workspace Frontend -- src/lib/__tests__/billing.test.ts src/lib/__tests__/bachs-client.test.ts src/components/landing/__tests__/pricing.test.tsx`
- `npm run typecheck`
- `npm run lint`
- `npm run build:web`
- `npm run verify:release`
