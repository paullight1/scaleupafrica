# Payment Support Runbook

Use this runbook for “I paid but have no access”, duplicate-charge questions, missing receipts and Bachs settlement disputes.

## Evidence to collect

Ask for the Cresciva payment/reference visible in the member account or support context. Do **not** ask the member to send full card/bank credentials, OTPs, PINs or provider secrets.

Review, in order:

1. `payments` row — provider, amount, currency, status, paid_at.
2. `payment_webhook_events` — valid Bachs settlement event, processed state and retry history.
3. `subscriptions` — has_access and expires_at.
4. `email_events` — payment-receipt delivery state.
5. Admin payment reconciliation view for `paid_no_access`, access/payment mismatch or receipt failure.

## Paid but no access

1. Confirm Bachs settlement independently of the browser callback.
2. Confirm amount/currency/reference match the Cresciva ledger.
3. If payment is successful but access is absent, treat as P0 payment-integrity incident.
4. Do not manually toggle `has_access` in the browser/admin UI to hide the incident. Repair/replay the verified grant path and preserve evidence.
5. Record the affected reference and root cause.

## Pending or failed payment

Never grant access from a screenshot, redirect query string or member statement alone. A successful provider settlement must be verified server-side before entitlement changes.

## Duplicate payment

Compare provider/reference/timestamps and determine whether there are multiple genuine successful ledger rows. Escalate refunds according to the current operator/refund policy and applicable law; do not delete successful payment history to make the duplicate disappear.

## Receipt missing

A missing receipt is not proof that payment failed. Check the payment ledger and `email_events` separately. Retry receipt delivery only through the idempotent receipt path.

## Data deletion

Account deletion detaches the minimum payment ledger and removes raw gateway payloads/account identifiers where configured. Do not reattach a deleted account merely to investigate a historical payment; use the retained reference/ledger evidence.
