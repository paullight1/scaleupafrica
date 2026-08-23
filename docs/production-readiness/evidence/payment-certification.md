# Cresciva Phase 1 — Payment Certification Evidence

Date: 2026-08-20
Branch: `docs/cresciva-production-readiness`
Provider: **Bachs**
Membership model: one-time annual entitlement purchase; no automatic renewal.

## Repository implementation evidence

- [x] Active frontend checkout uses `bachs-init` and Bachs hosted checkout.
- [x] Checkout creation uses the current **product-based** Bachs session contract (`product_cart` + `billing_currency`).
- [x] NGN/USD each map to a configured one-time Bachs product ID.
- [x] Bachs product IDs are server-only environment configuration; the browser never selects an arbitrary product.
- [x] Browser return URL carries Cresciva's random internal `reference`; redirect state is never treated as proof of payment.
- [x] `bachs-verify` loads the caller-owned internal payment, recovers its persisted `checkout_id`, re-fetches Bachs state and validates exact amount/currency.
- [x] `bachs-webhook` verifies `X-Bachs-Timestamp` + `X-Bachs-Signature` using HMAC-SHA256 over `timestamp.raw_body` with a 300-second replay window.
- [x] Webhook body is bounded to 256 KiB before parsing.
- [x] `collection.succeeded` is the fulfillment event; `checkout.completed` is audit-only and cannot grant access.
- [x] Provider state is re-fetched before grant; `SUCCEEDED` and alternative terminal `ACCEPTED` charge states are supported.
- [x] Internal ledger keeps integer subunits; Bachs money values are converted at the provider boundary without floating-point arithmetic.
- [x] Amount and currency must exactly match the server-created Cresciva payment row.
- [x] Only `grant_annual_access(_payment_id)` grants membership access.
- [x] Bachs event IDs provide idempotency through the existing webhook-event table.
- [x] Duplicate events with `processed=true` are acknowledged; duplicates with `processed=false` resume settlement.
- [x] Non-duplicate persistence/infrastructure failures return 5xx so Bachs can retry.
- [x] Invalid-signature traffic stores only bounded metadata, never hostile raw payload.
- [x] Payment receipts remain best-effort and idempotent; email failure cannot reverse a successful grant.
- [x] Legacy Paystack frontend, Edge Function, helper, test, NestJS webhook and service paths are removed from the active branch.
- [x] `payment-reconciliation` is JWT-protected and performs an explicit administrator-role check.
- [x] Admin `/admin/payments` is read-only and reports `paid_no_access`, `success_no_processed_event`, `receipt_failed`, `receipt_skipped`, and `access_no_paid_payment` discrepancies.
- [x] Reconciliation cannot directly set `subscriptions.has_access`.

## Provider contract verified against current Bachs documentation

The current Bachs documentation index states that:

- money is represented as decimal strings at currency precision, never minor units;
- sandbox uses `https://sandbox-api.bachs.io` with `sk_sandbox_…` keys;
- production uses `https://api.bachs.io` with `sk_live_…` keys;
- checkout sessions are product-based;
- products become recurring only when a `billing_cycle` is configured, so Cresciva annual-entitlement products must omit it;
- webhooks such as `collection.succeeded` are the source of truth for fulfillment;
- IDs use resource prefixes including `prod_` and `chk_`;
- POST idempotency is supported through `Idempotency-Key`.

Repository code is aligned to those boundaries.

## Required Bachs product configuration

Before sandbox certification, the Bachs merchant account must expose two one-time membership products:

| Variable | Expected price | Required recurrence |
| --- | ---: | --- |
| `BACHS_ANNUAL_PRODUCT_NGN` | exact Cresciva NGN annual price | none |
| `BACHS_ANNUAL_PRODUCT_USD` | exact Cresciva USD annual price | none |

A product with a billing cycle would create subscription semantics Cresciva does not currently offer and therefore fails certification.

## Automated coverage added

- Bachs decimal-string ↔ integer-subunit conversion.
- Bachs one-time product-ID mapping/validation.
- HMAC-SHA256 webhook signature verification.
- stale webhook timestamp rejection.
- tampered-body and wrong-key rejection.
- PostgreSQL `23505` duplicate classification vs retryable failures.
- settlement amount/currency mismatch rejection.
- idempotent already-successful payment handling.
- non-settled checkout rejection.
- alternative terminal `ACCEPTED` charge state.
- bounded webhook request-body limits.
- payment reconciliation invariants.
- single public-origin contract used by payment return URLs.

The Phase 2 GitHub Actions gate is the intended fresh execution proof for these tests/builds.

## External sandbox certification

The following proof requires access not connected in this ChatGPT session:

- Cresciva Supabase project `dwyglydswegyvjowzdot` deployment access;
- Bachs sandbox API key (`sk_sandbox_…`);
- Bachs webhook signing secret;
- Bachs sandbox product IDs for NGN and USD;
- Bachs organization identifier where organization pinning is enabled;
- a staging `APP_URL` reachable by Bachs.

Required sandbox matrix once those credentials are available:

1. normal successful checkout → one annual access extension;
2. callback before webhook → pending or success after server verification, never redirect trust;
3. duplicate `collection.succeeded` → one grant only;
4. retry after event row inserted but before grant → resumes and grants exactly once;
5. malformed body → rejected;
6. invalid signature → rejected;
7. stale timestamp → rejected;
8. oversized body → 413;
9. artificial event-log failure → 5xx;
10. amount mismatch → no access;
11. currency mismatch → no access;
12. `collection.underpaid` → no access;
13. grant RPC failure → 5xx/pending, never false success;
14. receipt failure → membership remains successful;
15. reconciliation after success → healthy ledger/access/event state;
16. intentionally recurring test product → rejected as launch configuration; Cresciva products must be one-time.

## Gate

Repository/code gate: **implemented; final proof is the Phase 2 CI run**
External sandbox/deployment gate: **BLOCKED — Bachs/Supabase credentials and product configuration are not connected**

`PHASE 1 RELEASE GATE: BLOCKED_EXTERNAL`
