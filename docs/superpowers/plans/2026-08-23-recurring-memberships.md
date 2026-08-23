# Recurring Memberships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Cresciva membership billing to automatic monthly, quarterly, and annual Bachs subscriptions with lifecycle-safe access synchronization.

**Architecture:** Bachs recurring products create subscriptions through the existing hosted checkout. Cresciva stores the Bachs customer/subscription IDs, mirrors subscription lifecycle events, creates one internal payment row per paid invoice, and grants access only after validated settlement. A new authenticated Edge Function creates short-lived Bachs customer portal sessions for billing management.

**Tech Stack:** Supabase Postgres migrations, Supabase Edge Functions/Deno, Bachs REST API, React/Vite, TanStack Query, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-23-recurring-memberships-design.md`

## Global Constraints

- Recurring plans are USD-only: monthly $10, quarterly $25, annual $90.
- Bachs recurring product IDs are server-only; the browser never supplies product IDs or amounts.
- Fulfillment requires a verified Bachs webhook and exact internal plan/amount/currency agreement.
- Failed renewal invoices never extend access; access is bounded by the paid period end.
- Provider events are at-least-once and must be idempotent.
- Customer portal URLs are short-lived and must never be logged or persisted.
- Sandbox must be used before live keys.

---

### Task 1: Add recurring subscription primitives and tests

**Files:**
- Modify: `supabase/functions/_shared/bachs.ts`
- Create: `Backend/test/bachs-subscription.spec.ts`
- Modify: `Backend/test/bachs-decision.spec.ts`

**Interfaces:**
- Produce `BachsSubscriptionSnapshot`, `BachsInvoiceSnapshot`, `parseBachsSubscriptionSnapshot`, `parseBachsInvoiceSnapshot`, `isRecurringSubscriptionStatus`, and `shouldGrantSubscriptionAccess` pure helpers.
- Keep existing one-time checkout helpers available for callback compatibility, but recurring logic becomes the active path.

- [ ] Write failing tests for subscription payload extraction, status classification, invoice amount validation, and access decisions at period boundaries.
- [ ] Run `npm test --workspace Backend -- test/bachs-subscription.spec.ts test/bachs-decision.spec.ts` and confirm the new tests fail for missing helpers.
- [ ] Implement the minimal pure helpers in `_shared/bachs.ts`.
- [ ] Run the same targeted test command and confirm it passes.

### Task 2: Add the recurring subscription/payment schema

**Files:**
- Create: `supabase/migrations/20260823160000_recurring_memberships.sql`
- Modify: `Shared/src/integrations/supabase/types.ts`
- Modify: `Backend/src/db/payment-schema.ts`
- Modify: `Backend/src/db/schema.ts`

**Interfaces:**
- `subscriptions.bachs_customer_id TEXT`, `subscriptions.bachs_subscription_id TEXT UNIQUE`, `subscriptions.current_period_start TIMESTAMPTZ`, `subscriptions.cancel_at_period_end BOOLEAN`, `subscriptions.last_bachs_event_at TIMESTAMPTZ`.
- `payments.provider_invoice_id TEXT`, `payments.provider_charge_id TEXT`, `payments.provider_subscription_id TEXT`.
- Unique provider invoice index applies only when `provider_invoice_id` is non-null.

- [ ] Add the migration with `IF NOT EXISTS`, indexes, service-role ownership, and no client write grants.
- [ ] Add the same fields to the local generated/type mirrors.
- [ ] Add a database-level helper RPC `sync_bachs_subscription` that updates lifecycle fields and retains access only through the supplied period end.
- [ ] Add a database-level helper RPC `record_bachs_invoice_paid` that inserts one payment row per invoice and atomically updates the subscription period/access state.
- [ ] Run local SQL lint/help checks and inspect the generated diff before remote application.

### Task 3: Implement recurring Bachs webhook reconciliation

**Files:**
- Modify: `supabase/functions/bachs-webhook/index.ts`
- Modify: `supabase/functions/bachs-verify/index.ts`
- Modify: `supabase/functions/bachs-init/index.ts`
- Modify: `supabase/functions/_shared/bachs.ts`
- Modify: `Backend/test/bachs-subscription.spec.ts`

**Interfaces:**
- `bachs-init` sends `cresciva_user_id`, `cresciva_reference`, `internal_payment_id`, and `plan_code` metadata and selects USD recurring product IDs.
- `bachs-webhook` accepts subscription and invoice events listed in the spec, verifies signatures before parsing, and routes each event idempotently.
- `bachs-verify` remains a callback backstop and never grants a recurring period without provider subscription/invoice linkage.

- [ ] Add failing tests for `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed` routing.
- [ ] Run the targeted test and observe expected failures.
- [ ] Implement event normalization, subscription correlation by `sub_...` and Cresciva metadata, exact USD amount/plan validation, and idempotent invoice processing.
- [ ] Preserve access through `current_period_end` for `past_due`, `unpaid`, and scheduled cancellation; clear access when the boundary has passed or immediate cancellation is effective.
- [ ] Run targeted backend tests and Deno type checks/build checks.

### Task 4: Add customer portal management

**Files:**
- Create: `supabase/functions/bachs-portal/index.ts`
- Modify: `supabase/config.toml`
- Modify: `Frontend/src/lib/bachs.ts`
- Create: `Frontend/src/lib/__tests__/bachs-portal.test.ts`

**Interfaces:**
- Authenticated `POST bachs-portal` reads the caller's stored Bachs customer ID, calls `POST /v1/customers/{customer_id}/portal-sessions`, and returns `{ portal_url }` without logging the URL.
- Frontend exposes `createPortalSession()` and opens the returned URL only after a successful response.

- [ ] Write failing client tests for successful portal URL handling and unavailable/missing-customer errors.
- [ ] Run the client test and confirm failure.
- [ ] Implement the Edge Function and client helper.
- [ ] Run the client tests and TypeScript checks.

### Task 5: Update frontend billing UX and legal copy

**Files:**
- Modify: `Frontend/src/lib/subscription.ts`
- Modify: `Frontend/src/components/billing/CurrentPlanCard.tsx`
- Modify: `Frontend/src/components/billing/BillingPanel.tsx`
- Modify: `Frontend/src/components/landing/Pricing.tsx`
- Modify: `Frontend/src/content/faqs.ts`
- Modify: `Frontend/src/pages/Terms.tsx`
- Modify: `Frontend/src/pages/Privacy.tsx`
- Modify: `docs/production-readiness/01-PAYMENT-RELIABILITY-LEDGER.md`
- Modify: `docs/production-readiness/03-PRODUCTION-ENV-DOMAINS-SECRETS.md`
- Modify: `docs/production-readiness/evidence/environment-inventory.md`
- Modify: `docs/production-readiness/evidence/payment-certification.md`

**Interfaces:**
- Subscription query includes plan, billing status, next payment, current period, and cancellation state.
- Billing UI communicates automatic renewal, failed-payment recovery, next billing date, and portal management.
- Pricing displays USD recurring cadence and no NGN recurring option.

- [ ] Add failing component/client tests for recurring copy, next billing date, and portal action states.
- [ ] Run the focused frontend tests and confirm failure.
- [ ] Implement minimal UI/copy changes without changing access loading/error semantics.
- [ ] Run focused tests, frontend typecheck, lint, and production build.

### Task 6: Apply, deploy, and verify

**Files:**
- No additional source files; update the recurring plan documentation checklist after evidence is collected.

- [ ] Apply the migration to Supabase using the safe direct SQL path because remote migration history currently contains versions missing from this checkout; do not run blind `db push`.
- [ ] Deploy `bachs-init`, `bachs-verify`, `bachs-webhook`, `bachs-portal`, and `payment-reconciliation`.
- [ ] Configure Bachs webhook events: checkout, collection, subscription lifecycle, and invoice lifecycle events.
- [ ] Configure sandbox recurring product IDs and signing secret in Supabase Edge Function secrets.
- [ ] Run targeted tests, typechecks, lint, build, and endpoint smoke checks.
- [ ] Verify sandbox scenarios: initial subscription, renewal invoice, duplicate invoice, failed renewal, recovery, scheduled cancellation, immediate cancellation, and portal session.

## Verification Commands

```bash
npm test --workspace Backend -- test/bachs-subscription.spec.ts test/bachs-decision.spec.ts
npm test --workspace Frontend -- src/lib/__tests__/bachs-portal.test.ts
npm run typecheck --workspace Frontend
npm run build:api
npm run build:web
git diff --check
```

## Self-review

- All recurring lifecycle events in the approved spec have an implementation task.
- The plan never grants access from a browser redirect or subscription-created event alone.
- Provider invoice uniqueness and webhook event idempotency are both covered.
- The remote migration-history mismatch is explicitly handled without destructive repair.
