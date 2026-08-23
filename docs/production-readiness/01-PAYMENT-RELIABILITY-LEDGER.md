# Payment Reliability & Ledger Integrity Implementation Plan — Bachs

> **For agentic workers:** use the Superpowers executing-plans/TDD workflow for further payment changes.

**Goal:** Run Cresciva monthly, quarterly, and annual membership checkout on Bachs while keeping settlement retry-safe, idempotent, reconcilable, bounded against hostile input, and incapable of silently losing a paid-access grant.

**Architecture:** Cresciva owns pricing expectations, the `payments` ledger, and entitlement state. Bachs provides product-based recurring checkout and signed subscription/invoice events. Each supported plan maps to a preconfigured recurring USD Bachs product whose configured price must equal Cresciva's canonical price. Bachs is never trusted to grant membership directly: `invoice.paid` is revalidated against the internal price ledger and only the atomic invoice settlement routine can extend paid access.

**Tech Stack:** Supabase Edge Functions (Deno), Supabase Postgres/RLS, Bachs Checkout/API/webhooks, TypeScript, Vitest, Resend.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Current Bachs contract

- Sandbox: `https://sandbox-api.bachs.io` with `sk_sandbox_…` keys.
- Production: `https://api.bachs.io` with `sk_live_…` keys.
- Checkout Session creation is product-based using `product_cart` + `billing_currency`.
- Cresciva uses recurring products: monthly $10, quarterly $25, and annual $90, all in USD.
- Required product env mapping:
  - `BACHS_MONTHLY_PRODUCT_USD`
  - `BACHS_QUARTERLY_PRODUCT_USD`
  - `BACHS_ANNUAL_PRODUCT_USD`
- Bachs money values are decimal strings at currency precision; Cresciva keeps integer subunits internally.
- `Idempotency-Key` is stable across retries of the same checkout initialization.
- `return_url` carries Cresciva's random internal `reference`; the browser redirect is not payment proof.
- Checkout metadata also carries `cresciva_reference` as a server-side correlation backstop.
- Fulfillment signal is `invoice.paid`. `checkout.completed` and subscription-created events explicitly do not prove a settled invoice.
- Webhook authenticity is timestamped HMAC-SHA256 over `${timestamp}.${raw_body}` using `X-Bachs-Timestamp` + `X-Bachs-Signature`.
- Webhook delivery is at-least-once; top-level Bachs event `id` is the idempotency key.
- Cresciva membership renews automatically at the selected Bachs billing interval until canceled.

## Global constraints

- [x] Browser cannot supply or override a charge amount.
- [x] `BACHS_SECRET_KEY` and `BACHS_WEBHOOK_SIGNING_SECRET` are server-only.
- [x] Bachs API host is restricted to official sandbox/live origins and key environment must match origin.
- [x] Only `grant_membership_access(_payment_id)` may grant paid access.
- [x] Redirect/callback state never grants access by itself.
- [x] Successful provider state must match Cresciva amount/currency before access is granted.
- [x] Only PostgreSQL `23505` is classified as a duplicate event insert; other persistence failures are retryable.
- [x] Invalid-signature traffic never stores unbounded hostile raw payloads.
- [x] Payment audit data stored by Cresciva is bounded and omits provider secrets/customer payloads.

---

## Task 1 — Bachs security/payment primitives

**Files:**
- `supabase/functions/_shared/bachs.ts`
- `supabase/functions/_shared/requestBody.ts`
- `Frontend/src/lib/__tests__/bachs-signature.test.ts`
- `Frontend/src/lib/__tests__/request-body.test.ts`
- `Backend/test/bachs-decision.spec.ts`

- [x] Exact integer-subunit ↔ decimal-string conversion.
- [x] Sandbox/live base-URL and key matching.
- [x] HMAC-SHA256 webhook verification with a 300-second freshness window.
- [x] Timing-safe signature comparison.
- [x] `23505` duplicate-vs-retry classification.
- [x] `SUCCEEDED` and alternative terminal `ACCEPTED` settlement handling.
- [x] Product ID validation/mapping per currency.
- [x] Cresciva reference recovery from checkout metadata with legacy provider-reference fallback.
- [x] 256 KiB streaming webhook-body limit.

## Task 2 — Product-based Bachs checkout initialization

**Files:**
- `supabase/functions/bachs-init/index.ts`
- `supabase/functions/_shared/billing.ts`
- `supabase/config.toml`

Required flow and state:

1. [x] Require authenticated Supabase user with email.
2. [x] Validate `{ plan_code, currency }` against canonical server pricing.
3. [x] Select the configured recurring Bachs product for the requested plan.
4. [x] Reject accidental double-purchase while >30 days of active membership remain.
5. [x] Create internal `payments` row first with `provider='bachs'`, `reference='crv_<uuid>'`, canonical integer amount and `initialized` status.
6. [x] POST `/v1/checkout-sessions` with `product_cart`, `billing_currency`, customer, return/cancel URLs and minimal metadata.
7. [x] Use stable `Idempotency-Key` derived from the Cresciva payment reference.
8. [x] Persist only safe checkout linkage/summary (`checkout_id`, provider status, expiry, product ID).
9. [x] Redirect return URL contains Cresciva's `reference`, not a trusted payment-success flag.
10. [x] Provider/API failure marks the internal attempt failed where persistence succeeds and returns a typed error.

### Required external product setup

Before sandbox/live certification, create or identify three Bachs **recurring USD** products:

| Environment variable | Required product price | Billing cycle |
| --- | ---: | --- |
| `BACHS_MONTHLY_PRODUCT_USD` | must equal $10 / `PLANS.monthly.prices.USD` | monthly |
| `BACHS_QUARTERLY_PRODUCT_USD` | must equal $25 / `PLANS.quarterly.prices.USD` | every 3 months |
| `BACHS_ANNUAL_PRODUCT_USD` | must equal $90 / `PLANS.annual.prices.USD` | yearly |

The sandbox and live environments may have different product IDs; deploy the IDs appropriate to that Bachs environment.

## Task 3 — Signed webhook settlement

**Files:**
- `supabase/functions/bachs-webhook/index.ts`
- `supabase/functions/_shared/requestBody.ts`
- `supabase/config.toml`

- [x] `verify_jwt=false`; Bachs authenticates with signed raw-body webhook.
- [x] Reject body >256 KiB before JSON parse.
- [x] Verify timestamp/signature before actionable parsing.
- [x] Reject stale, missing or invalid signature.
- [x] Optional `BACHS_ORGANIZATION_ID` pins deliveries to the expected merchant organization.
- [x] Deduplicate by Bachs event ID using the existing webhook-event uniqueness seam.
- [x] Processed duplicate -> 200.
- [x] Duplicate with `processed=false` -> resume processing instead of falsely acknowledging.
- [x] Non-duplicate database/infrastructure failure -> 5xx.
- [x] `checkout.completed` -> audit only, no grant.
- [x] `invoice.paid` -> resolve the subscription, validate the invoice and extend access atomically.
- [x] `collection.failed`, `collection.underpaid`, `checkout.expired` -> never grant.
- [x] Every critical settlement write inspects errors.
- [x] Receipt delivery remains best-effort/idempotent and cannot reverse payment success.

## Task 4 — Callback verification and frontend migration

**Files:**
- `supabase/functions/bachs-verify/index.ts`
- `Frontend/src/lib/bachs.ts`
- `Frontend/src/components/billing/CheckoutButton.tsx`
- `Frontend/src/pages/PaymentCallback.tsx`
- `Frontend/src/lib/billing.ts`

- [x] Active checkout UI uses Bachs only.
- [x] Bachs return URL carries `?reference=<crv_…>`.
- [x] Callback page reads Cresciva `reference`.
- [x] Browser posts `{ reference }` to `bachs-verify`.
- [x] Verification loads only a caller-owned Bachs payment row.
- [x] Verification recovers the server-persisted `checkout_id` from the ledger and retrieves Bachs server-side.
- [x] Provider metadata reference is compared to the callback/internal reference when present.
- [x] Exact amount/currency and terminal settlement status are revalidated before grant.
- [x] Database/provider/grant failures cannot return a false success.
- [x] User-facing payment copy references Bachs/Cresciva rather than Paystack.
- [x] Legacy Paystack frontend, helper, Edge Functions and dormant NestJS webhook path are removed.

## Task 5 — Provider-neutral reconciliation

**Files:**
- `supabase/functions/payment-reconciliation/index.ts`
- `supabase/functions/_shared/paymentReconciliation.ts`
- `AdminPanel/src/hooks/queries/paymentReconciliation.ts`
- `AdminPanel/src/pages/AdminPayments.tsx`
- admin navigation/router
- `docs/production-readiness/evidence/payment-certification.md`

- [x] Reconciliation endpoint requires JWT plus explicit administrator role.
- [x] Admin surface is read-only.
- [x] `paid_no_access` is visible.
- [x] `access_no_paid_payment` is visible.
- [x] `success_no_processed_event` is visible.
- [x] Receipt `failed` / `skipped` states are visible.
- [x] No reconciliation control can directly set `subscriptions.has_access`.

## Task 6 — Bachs sandbox certification

**External prerequisites not available through the current connected apps:**

- Bachs sandbox key and webhook signing secret.
- Bachs sandbox product IDs for NGN/USD.
- Access to Cresciva Supabase project `fqragjhmunphhdnmvpgs` or a safe staging branch.
- Reachable staging `APP_URL`.

Required failure matrix:

1. successful hosted checkout -> exactly one annual extension;
2. callback before webhook -> pending/server-verified state, never redirect trust;
3. duplicate `collection.succeeded` -> one grant;
4. retry after event insert but before grant -> resumes exactly once;
5. malformed event -> rejected;
6. invalid signature -> 401;
7. stale timestamp -> rejected;
8. oversized body -> 413;
9. artificial event-log failure -> 5xx;
10. amount mismatch -> no access;
11. currency mismatch -> no access;
12. `collection.underpaid` -> no access;
13. grant RPC failure -> no false success;
14. receipt failure -> membership remains granted;
15. reconciliation after success -> healthy ledger/access/event state;
16. non-recurring Bachs product accidentally configured -> sandbox certification fails; products must have the required billing cycle.

## Phase 1 release state

Repository implementation gate: **PASS pending repository CI evidence from Phase 2**.

External Bachs/Supabase sandbox deployment gate: **BLOCKED_EXTERNAL** until the above merchant/project credentials and staging environment are connected.

The phase must not be called production-certified until the sandbox matrix is executed against the actual configured Bachs products.

`PHASE 1 RELEASE GATE: BLOCKED_EXTERNAL`
