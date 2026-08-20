# Payment Reliability & Ledger Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Cresciva payment settlement retry-safe, idempotent, reconcilable, bounded against hostile input, and incapable of silently losing a paid-access grant.

**Architecture:** Keep Paystack hosted checkout and the existing `payments` / `payment_webhook_events` / `grant_annual_access()` design. Harden the webhook boundary, make database-error classification explicit, keep access grants atomic, and add a reconciliation path that proves Paystack, payment ledger, subscription, webhook log, and receipt state agree.

**Tech Stack:** Supabase Edge Functions (Deno), Supabase Postgres/RLS, Paystack, TypeScript, Vitest/Deno tests, Resend receipt subsystem.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Global Constraints

- Client never supplies or overrides a payment amount.
- Paystack secret key remains server-only.
- HMAC-SHA512 is verified over the exact raw request body before actionable parsing.
- Only `grant_annual_access(_payment_id)` may grant paid access.
- Only PostgreSQL `23505` on the webhook-event uniqueness key is acknowledged as a duplicate.
- Non-duplicate infrastructure/database failures return 5xx so Paystack can retry.
- Invalid-signature traffic never stores an unbounded raw payload.
- Payment/receipt logs committed to git must never contain secrets, full gateway payloads, card data, email addresses, phone numbers, or other user PII.

---

### Task 1: Reproduce and fix false duplicate acknowledgement

**Files:**
- Modify: `supabase/functions/paystack-webhook/index.ts`
- Modify: `supabase/functions/_shared/paystack.ts`
- Create: `supabase/functions/_shared/paystack_test.ts`

**Interfaces:**
- Produces: `classifyWebhookInsertError(error: { code?: string | null } | null): "duplicate" | "retry" | "none"`
- Consumes: Supabase/PostgREST error `code`, where PostgreSQL unique violation is `23505`.

- [ ] **Step 1: Add failing classification tests**

```ts
Deno.test("webhook insert 23505 is duplicate", () => {
  if (classifyWebhookInsertError({ code: "23505" }) !== "duplicate") throw new Error("expected duplicate");
});

Deno.test("webhook insert infrastructure error must retry", () => {
  if (classifyWebhookInsertError({ code: "08006" }) !== "retry") throw new Error("expected retry");
});

Deno.test("no insert error is none", () => {
  if (classifyWebhookInsertError(null) !== "none") throw new Error("expected none");
});
```

- [ ] **Step 2: Run the test and confirm it fails before implementation**

```bash
deno test supabase/functions/_shared/paystack_test.ts
```

Expected: failure because `classifyWebhookInsertError` does not exist.

- [ ] **Step 3: Implement the narrow classifier**

```ts
export function classifyWebhookInsertError(
  error: { code?: string | null } | null,
): "duplicate" | "retry" | "none" {
  if (!error) return "none";
  return error.code === "23505" ? "duplicate" : "retry";
}
```

- [ ] **Step 4: Replace `if (insErr || !inserted) return 200`**

Required behavior:

```ts
const insertOutcome = classifyWebhookInsertError(insErr);
if (insertOutcome === "duplicate") return jsonOk("duplicate");
if (insertOutcome === "retry" || !inserted) {
  console.error("paystack-webhook: event insert failed", reference, insErr?.code, insErr?.message);
  return new Response("", { status: 500 });
}
```

A missing `inserted` row without a duplicate error is an invariant failure and must be retried, not acknowledged.

- [ ] **Step 5: Run tests**

```bash
deno test supabase/functions/_shared/paystack_test.ts
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -- supabase/functions/paystack-webhook/index.ts supabase/functions/_shared/paystack.ts supabase/functions/_shared/paystack_test.ts
git commit -m "fix(payments): retry webhook database failures"
```

### Task 2: Bound hostile webhook requests and rejected-signature storage

**Files:**
- Modify: `supabase/functions/paystack-webhook/index.ts`
- Create: `supabase/functions/_shared/requestBody.ts`
- Create: `supabase/functions/_shared/requestBody_test.ts`

**Interfaces:**
- Produces: `readBoundedText(req: Request, maxBytes: number): Promise<{ ok: true; body: string } | { ok: false; status: 413 }>`
- Webhook maximum raw body: **256 KiB**.

- [ ] **Step 1: Add tests for 256 KiB boundary**

Cover a 1 KiB request (accepted), exactly 256 KiB (accepted), and 256 KiB + 1 byte (413).

- [ ] **Step 2: Implement bounded body reading**

Reject immediately when a trustworthy `Content-Length` exceeds the limit, and still enforce the byte limit while reading when the header is absent or wrong. Do not call unbounded `req.text()` first.

- [ ] **Step 3: Change invalid-signature logging**

For invalid HMAC, store only:

```ts
{
  provider: "paystack",
  event_type: "invalid_signature",
  reference: null,
  signature_valid: false,
  payload: {
    body_bytes: rawByteLength,
    content_type: req.headers.get("content-type") ?? null,
  },
  processed: false,
}
```

Do not JSON-parse and persist attacker-provided raw payloads after signature failure.

- [ ] **Step 4: Return 413 for oversized requests before database writes**

No webhook audit row is required for deliberately oversized rejected traffic; observability counters/logs are sufficient.

- [ ] **Step 5: Verify**

```bash
deno test supabase/functions/_shared/requestBody_test.ts supabase/functions/_shared/paystack_test.ts
npm test
```

- [ ] **Step 6: Commit**

```bash
git add -- supabase/functions/paystack-webhook/index.ts supabase/functions/_shared/requestBody.ts supabase/functions/_shared/requestBody_test.ts
git commit -m "fix(payments): bound webhook request payloads"
```

### Task 3: Stop ignoring settlement-state database failures

**Files:**
- Modify: `supabase/functions/paystack-webhook/index.ts`
- Modify: `supabase/functions/paystack-verify/index.ts`

**Interfaces:**
- No new public API. Existing HTTP semantics remain compatible.

- [ ] **Step 1: Audit every write on the settlement path**

The following writes must inspect `error`:

- `payment_webhook_events.update({ processed: true })`
- `payments.update({ channel, gateway_response, paid_at })`
- poison-event status/audit update
- any payment status update performed before/after grant

- [ ] **Step 2: Define failure semantics**

- State required for correct retry/reconciliation fails to persist -> return 500 from webhook.
- Receipt email fails -> keep 200; receipt delivery is best-effort/idempotent and must not cause Paystack settlement retry.
- Non-actionable ignored event audit update fails -> log error; return 500 so the event can be retried and audited.
- Callback verify persistence failure -> return `pending`, never `success`.

- [ ] **Step 3: Add regression tests around the extracted settlement decision helpers**

Keep HTTP handlers thin enough that database/provider adapters can be mocked. Test the error-to-response mapping instead of relying only on happy-path helper tests.

- [ ] **Step 4: Verify**

```bash
deno test supabase/functions/_shared/*_test.ts
npm test
```

- [ ] **Step 5: Commit**

```bash
git add -- supabase/functions/paystack-webhook/index.ts supabase/functions/paystack-verify/index.ts supabase/functions/_shared
git commit -m "fix(payments): fail safely on settlement persistence errors"
```

### Task 4: Add payment reconciliation query and staff workflow

**Files:**
- Create: new Supabase migration generated with `supabase migration new payment_reconciliation`
- Modify: `AdminPanel/src/hooks/queries/dashboard.ts` or the existing payment-admin query module discovered during implementation
- Modify/Create: the existing admin payment/support surface under `AdminPanel/src/pages/`
- Create: `docs/production-readiness/evidence/payment-certification.md`

**Interfaces:**
- Produce a staff-only reconciliation view/RPC returning payment reference, payment status, subscription expiry/access state, latest valid webhook processing state, and receipt-delivery state without exposing gateway secrets.

- [ ] **Step 1: Create the migration using the Supabase CLI**

```bash
supabase migration new payment_reconciliation
```

Do not invent the migration timestamp manually.

- [ ] **Step 2: Build a service-role/admin-only reconciliation query**

The query must answer for each successful Paystack reference:

- does a `payments` row exist and say `success`?
- does the corresponding subscription have access with a future expiry?
- was at least one valid webhook or verify path processed?
- was a receipt recorded/sent or explicitly failed?

- [ ] **Step 3: Add an admin view with explicit discrepancy states**

Minimum discrepancies:

- `paid_no_access`
- `access_no_paid_payment`
- `success_no_processed_event`
- `receipt_failed`

No “fix” button may directly set `subscriptions.has_access`; remediation must re-run a verified payment reconciliation/grant path.

- [ ] **Step 4: Add authorization tests**

Anonymous and ordinary authenticated users must not access the reconciliation dataset. Admin/service role can.

- [ ] **Step 5: Verify migration/security**

```bash
supabase db advisors
supabase migration list --local
npm run test --workspace AdminPanel
```

- [ ] **Step 6: Commit**

Stage only the generated migration, admin query/view, tests, and evidence file.

### Task 5: Certify Paystack sandbox behavior end-to-end

**Files:**
- Update: `docs/production-readiness/evidence/payment-certification.md`

- [ ] **Step 1: Deploy the hardened payment functions to the non-production/test configuration**

Deploy `paystack-init`, `paystack-verify`, and `paystack-webhook` with the same JWT flags already defined in `supabase/config.toml`.

- [ ] **Step 2: Execute the failure matrix**

Record PASS/FAIL for:

1. normal card success;
2. delayed/pending settlement;
3. duplicate webhook;
4. malformed body;
5. invalid signature;
6. oversized body;
7. artificial event-log insert failure -> webhook returns 5xx;
8. amount mismatch -> no access;
9. currency mismatch -> no access;
10. grant RPC failure -> no false success;
11. receipt send failure -> payment remains successful;
12. callback and webhook racing -> one membership extension;
13. retry after temporary DB/provider failure -> eventual correct access.

- [ ] **Step 3: Reconcile each successful payment**

For every test reference, confirm the payment, entitlement, event log, and receipt state agree.

- [ ] **Step 4: Mark phase gate**

`payment-certification.md` ends with exactly one of:

```text
PHASE 1 RELEASE GATE: PASS
```

or

```text
PHASE 1 RELEASE GATE: FAIL
```

## Phase 1 Definition of Done

- Only proven duplicate webhook inserts return duplicate/200.
- Non-duplicate DB failures return 5xx.
- Webhook request body is bounded to 256 KiB.
- Invalid-signature audit does not store hostile raw payload.
- Critical state writes are checked.
- Payment reconciliation exists and is staff-restricted.
- Sandbox failure matrix passes.
- A payment can be traced end-to-end without using secrets or PII in git.
- `PHASE 1 RELEASE GATE: PASS` is recorded.