# Payment Reliability & Ledger Integrity Implementation Plan — Bachs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Cresciva’s annual membership checkout from Paystack to Bachs and make every settlement retry-safe, idempotent, reconcilable, bounded against hostile input, and incapable of silently losing a paid-access grant.

**Architecture:** Keep Cresciva’s existing internal `payments` ledger and atomic `grant_annual_access(_payment_id)` entitlement routine. Bachs is the hosted payment processor, not the system of record for membership access. Use Bachs one-time hosted checkout with raw `pricing`; keep money internally as integer subunits and convert to Bachs decimal strings only at the provider boundary. Treat signed `collection.succeeded` webhooks as the fulfillment source of truth and use callback verification only as a user-facing backstop.

**Tech Stack:** Supabase Edge Functions (Deno), Supabase Postgres/RLS, Bachs hosted Checkout/API/webhooks, TypeScript, Vitest, Resend receipt subsystem.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Bachs contract used by this phase

- Sandbox base URL: `https://sandbox-api.bachs.io`; production: `https://api.bachs.io`.
- Bachs money values are decimal strings at currency precision. Never send minor units to Bachs.
- `POST /v1/checkout-sessions` accepts product-less raw `pricing`, returns `checkout_id` + `checkout_url`, and appends `?checkout_id=<id>` to `success_url`.
- `reference` is Cresciva-controlled, unique per Bachs organization, and is echoed back unchanged on checkout retrieval.
- `Idempotency-Key` is supported on POST requests and must be stable across retries of the same checkout initialization.
- Fulfillment signal: `collection.succeeded`. `checkout.completed` explicitly does not prove payment.
- Webhook signature: HMAC-SHA256 of `${timestamp}.${raw_body}` with headers `X-Bachs-Timestamp` and `X-Bachs-Signature`; stale timestamps are rejected with a 300-second tolerance.
- Webhook delivery is at-least-once. Deduplicate by the top-level Bachs event `id`.
- Current Cresciva membership remains a one-time one-year entitlement. Do not silently convert it into an auto-renewing Bachs subscription.

## Global constraints

- Client never supplies or overrides a charge amount.
- `BACHS_SECRET_KEY` and `BACHS_WEBHOOK_SIGNING_SECRET` remain server-only.
- Bachs API host is allowlisted to sandbox/live official hosts only.
- Only `grant_annual_access(_payment_id)` may grant paid access.
- Provider callback/redirect never grants access by itself.
- Every successful provider result must match Cresciva’s stored reference, amount, currency and owning user before access is granted.
- Only PostgreSQL `23505` on the webhook-event uniqueness key is acknowledged as a duplicate; other persistence failures return 5xx.
- Invalid-signature traffic never stores an unbounded raw payload.
- Payment logs committed to git must not contain API keys, signing secrets, customer PII or full gateway payloads.

---

### Task 1: Add tested Bachs security/payment primitives

**Files:**
- Create: `supabase/functions/_shared/bachs.ts`
- Create: `Frontend/src/lib/__tests__/bachs-signature.test.ts`

**Interfaces:**
- `subunitsToDecimal(amount, currency): string`
- `decimalToSubunits(value, currency): number | null`
- `verifyBachsSignature(rawBody, timestampHeader, signatureHeader, secret, nowSeconds?, toleranceSeconds?): Promise<boolean>`
- `classifyWebhookInsertError(error): "duplicate" | "retry" | "none"`
- `decideBachsGrant(checkout, payment): { action: "grant" | "already" | "mismatch" | "ignore" }`
- `bachsFetch(path, secretKey, baseUrl, init): Promise<BachsResult>`

- [x] Write a failing test first for amount conversion, stale/tampered signatures, duplicate classification and grant decisions.
- [x] Confirm the test fails because the Bachs helper does not yet exist.
- [ ] Implement the minimal pure helper and run the tests green.

### Task 2: Implement Bachs checkout initialization

**Files:**
- Create: `supabase/functions/bachs-init/index.ts`
- Modify: `supabase/config.toml`
- Modify: `supabase/functions/_shared/billing.ts`

**Required flow:**
1. Require authenticated Supabase user with email.
2. Validate `{ plan_code, currency }` against canonical server pricing.
3. Reject accidental double-purchase when membership has >30 days remaining.
4. Create Cresciva payment row with `provider='bachs'`, `reference='crv_<uuid>'`, integer subunit amount and `initialized` status.
5. Convert the internal integer amount to Bachs decimal format without floating-point arithmetic.
6. POST `/v1/checkout-sessions` with raw `pricing`, customer email, `success_url`, `cancel_url`, `reference`, minimal metadata, and an `Idempotency-Key` derived from the internal payment reference.
7. Persist only a safe provider summary in `gateway_response` (`checkout_id`, status, expiry); do not store checkout credentials/secrets.
8. Return `{ checkout_url, checkout_id, reference }` to the browser.
9. If checkout creation fails, mark the internal payment failed and return a typed error.

### Task 3: Implement signed Bachs webhook settlement

**Files:**
- Create: `supabase/functions/bachs-webhook/index.ts`
- Create: `supabase/functions/_shared/requestBody.ts`
- Create: request-body tests in the existing frontend/shared test harness
- Modify: `supabase/config.toml`

**Required behavior:**
- `verify_jwt=false` because Bachs is server-to-server.
- Enforce max raw body **256 KiB** before JSON parsing.
- Verify `X-Bachs-Timestamp` + `X-Bachs-Signature` over the exact raw body with 300-second tolerance.
- Invalid signatures return `401` and store only bounded metadata, never the attacker-controlled raw payload.
- Parse the top-level Bachs event envelope only after signature verification.
- Deduplicate using Bachs event `id`. Reuse the existing event-log uniqueness mechanism by storing the Bachs event ID in the event-log reference/idempotency slot until a dedicated provider event-id column is introduced.
- `23505` duplicate -> `200`.
- Any other event-log persistence failure -> `500` so Bachs retries.
- `checkout.completed` is audit-only and must never grant access.
- `collection.succeeded` retrieves the authoritative checkout session by `checkout_id`, resolves its Cresciva `reference`, checks `payment_status='succeeded'`, checks the charge status, amount and currency, then invokes `grant_annual_access`.
- `collection.failed`, `collection.underpaid`, and `checkout.expired` never grant access and update the internal payment state when a Cresciva reference can be resolved.
- Every critical database write checks `error`; settlement state persistence failures return `5xx`.
- Receipt sending remains best-effort/idempotent and does not change the payment acknowledgement status.

### Task 4: Implement callback verification and migrate the frontend

**Files:**
- Create: `supabase/functions/bachs-verify/index.ts`
- Create: `Frontend/src/lib/bachs.ts`
- Modify: `Frontend/src/components/billing/CheckoutButton.tsx`
- Modify: `Frontend/src/pages/PaymentCallback.tsx`
- Modify: `Frontend/src/lib/billing.ts`
- Modify any remaining active Paystack imports/copy found during implementation.

**Required behavior:**
- Callback reads `checkout_id`, not Paystack `reference`/`trxref`.
- Browser calls `bachs-verify` with that checkout ID.
- Verification retrieves checkout from Bachs, then uses the returned Cresciva `reference` to find the internal payment.
- User can verify only their own payment.
- Success requires Bachs `payment_status='succeeded'`, successful charge state and exact amount/currency match before `grant_annual_access`.
- Pending/processing returns `pending`; failed/canceled/expired returns `failed`.
- Database or grant failures return `pending`, never a false success.
- UI copy says Bachs, not Paystack.
- `CheckoutButton` defaults to `Pay with Bachs`.

### Task 5: Provider-neutral ledger/reconciliation hardening

**Files:**
- Reuse existing `payments`, `payment_webhook_events`, `subscriptions`, `email_events` structures where possible.
- If a new schema field is genuinely required, create the migration with `supabase migration new ...` in a connected/local environment; do not invent a migration timestamp in this connector-only session.
- Add/update admin reconciliation surface and `docs/production-readiness/evidence/payment-certification.md`.

**Minimum discrepancy states:**
- `paid_no_access`
- `access_no_paid_payment`
- `success_no_processed_event`
- `receipt_failed`

No admin “fix” may directly flip `subscriptions.has_access`; remediation must re-run a verified grant/reconciliation path.

### Task 6: Certify Bachs sandbox behavior end-to-end

**External prerequisites:**
- Bachs sandbox secret key.
- Bachs webhook signing secret.
- Access to Cresciva’s actual Supabase project (`dwyglydswegyvjowzdot`) or a safe branch/staging project.

**Failure matrix:**
1. normal card success;
2. bank-transfer/mobile-money pending then success where supported;
3. duplicate event ID;
4. malformed JSON after valid signature;
5. invalid signature;
6. stale timestamp;
7. oversized body;
8. artificial event-log insert failure -> webhook 5xx;
9. amount mismatch -> no access;
10. currency mismatch -> no access;
11. grant RPC failure -> no false success;
12. callback/webhook race -> exactly one annual extension;
13. retry after temporary database/provider failure -> eventual correct access;
14. `checkout.completed` without successful collection -> no access;
15. `collection.underpaid` -> no access.

`payment-certification.md` ends with exactly one of:

```text
PHASE 1 RELEASE GATE: PASS
```

or

```text
PHASE 1 RELEASE GATE: FAIL — external sandbox/deployment evidence incomplete
```

## Phase 1 Definition of Done

- Active Cresciva checkout path uses Bachs, not Paystack.
- Server-resolved amount is converted to Bachs decimal format only at the provider boundary.
- Bachs checkout initialization uses stable idempotency keys.
- Signed webhook timestamp/HMAC is verified over the exact raw body.
- Webhook event ID drives dedupe.
- Only `collection.succeeded` plus server-side revalidation can grant access.
- Callback is a verification/backstop path, not the authority.
- Non-duplicate persistence failures return 5xx.
- Webhook body is bounded to 256 KiB.
- Existing one-year entitlement semantics are preserved.
- Bachs sandbox failure matrix is recorded before the phase is marked PASS.
