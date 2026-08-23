# Cresciva Recurring Memberships Design

Date: 2026-08-23
Status: approved for implementation by the user

## Goal

Make Cresciva memberships automatic recurring Bachs subscriptions:

- monthly: $10 every 1 month;
- quarterly: $25 every 3 months;
- annual: $90 every 12 months.

There are no existing users to migrate. Every membership checkout will use a
Bachs recurring product and create a Bachs subscription.

## Provider contract

Bachs creates a subscription when a customer completes checkout for a product
with a `billing_cycle`; there is no direct create-subscription call. The
configured product IDs remain server-only. Cresciva uses USD for recurring
plans because Bachs recurring billing currently supports USD card billing.

The webhook endpoint receives and verifies these event types:

- `checkout.completed` and `checkout.expired` for checkout audit;
- `collection.succeeded`, `collection.failed`, and `collection.underpaid` for
  charge settlement;
- `customer.subscription.created`, `customer.subscription.updated`, and
  `customer.subscription.deleted` for subscription state;
- `invoice.created`, `invoice.paid`, and `invoice.payment_failed` for renewal
  billing.

`invoice.paid` is the renewal settlement authority. A subscription lifecycle
event alone never grants access. All events are signature-verified, bounded,
deduplicated, and retained as a safe summary.

## Data model

Extend `subscriptions` with Bachs ownership and lifecycle state:

- `bachs_customer_id`;
- `bachs_subscription_id` (unique when present);
- `current_period_start`;
- `cancel_at_period_end`;
- `last_bachs_event_at`.

Existing `expires_at` becomes the entitlement boundary and mirrors Bachs
`current_period_end`. Existing `billing_status`, `auto_renew`, `plan_code`,
`billing_email`, and `next_payment_at` are populated from Bachs subscription
state.

Extend `payments` with provider reconciliation identifiers:

- `provider_invoice_id` (unique per Bachs invoice when present);
- `provider_charge_id`;
- `provider_subscription_id`.

The initial checkout payment and each paid renewal are separate ledger rows.
The provider invoice uniqueness constraint prevents duplicate renewal rows.

## Access policy

- `active` and `trialing`: access is active through `current_period_end`.
- `past_due` and `unpaid`: retain access only through the already-paid
  `current_period_end`; do not extend access on failed invoices.
- `canceled`: retain access only through the provider-supplied period end;
  immediate cancellation can therefore revoke immediately when that boundary
  is now or past.
- A paid initial checkout or renewal updates the subscription period and
  activates access atomically with its payment ledger row.

No browser redirect, product link, or client-selected amount can grant access.

## Backend flow

1. `bachs-init` authenticates the user, validates the plan, selects the USD
   recurring product, writes an initialized payment row, and sends the
   Cresciva user/payment metadata into a Bachs checkout session.
2. `customer.subscription.created` links the Bachs customer/subscription to
   the Cresciva user and stores the first period, but does not grant access by
   itself.
3. `invoice.paid` resolves the subscription, validates amount/currency/plan,
   creates an idempotent payment row, and updates the subscription entitlement.
4. `customer.subscription.updated` mirrors lifecycle state and period dates.
5. `customer.subscription.deleted` mirrors cancellation and keeps or removes
   access according to the provider period end.
6. `invoice.payment_failed` marks the subscription `past_due` without
   extending access. Bachs remains responsible for retry/dunning.
7. `bachs-portal` authenticates the Cresciva user, creates a short-lived Bachs
   customer portal session using the stored customer ID, and returns only the
   redirect URL.

The existing callback verification remains a status backstop for the initial
checkout. It must not independently extend a recurring period when the
subscription or invoice linkage is unavailable.

## Frontend behavior

- Pricing displays “renews automatically” and USD only.
- Billing displays plan, recurring status, next billing date, current period
  end, and cancellation-at-period-end state.
- A “Manage billing” action opens a fresh Bachs customer portal session.
- Copy, FAQ, Terms, Privacy, and payment certification evidence describe
  automatic renewal, Bachs card handling, cancellation, and failed-payment
  recovery accurately.

## Testing and release gates

Pure tests cover:

- recurring product/plan selection;
- Bachs subscription event extraction;
- plan and amount validation for invoice payloads;
- access decisions for active, past_due, unpaid, canceled, and period-end
  boundaries;
- duplicate invoice/event idempotency;
- invalid signatures and malformed events.

Targeted frontend/backend tests, typecheck, lint, and production build must
pass before deployment. Sandbox certification must exercise initial checkout,
renewal invoice, duplicate invoice, failed renewal, recovery, scheduled
cancellation, immediate cancellation, and portal-session creation.
