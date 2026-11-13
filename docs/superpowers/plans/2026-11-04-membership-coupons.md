# Seven-day membership coupons

Implement in the existing Supabase membership flow. Admin-only generation supports repeat batches of 1–500 unique codes or a shared code with unlimited redemptions. Redemption deadlines are one day, one week, or one calendar month from generation. Each code grants exactly seven days and can be redeemed once per account. Paid membership is extended without changing its billing settings; unlimited membership is never shortened.

Use database RPCs rather than a payment-provider discount: the benefit is free access, with no card or automatic charge. A provider discount would still require checkout and would not directly grant a seven-day entitlement. Generation, revocation, and redemption are authenticated and audited. Row locks and uniqueness enforce limits under concurrent requests. Coupon records are admin-readable only; members can read their own redemption receipts.

1. Add a SQL migration and executable PostgreSQL integration tests for admin permissions, expiry, single-use contention, unlimited sharing, repeat redemption, paid-access preservation, and rollback.
2. Add typed coupon contracts and data hooks; regenerate Supabase types if project access is available, otherwise isolate the new RPC boundary in a typed adapter.
3. Add an admin Coupons route: batch generation, optional custom code, usage/expiry list, pagination, revoke, copy, and downloadable navy/orange SVG and PNG cards. No total generation limit.
4. Add redemption to membership billing and the plan-selection dialog. Invalidate subscription queries after success and show the confirmed expiry. Card links lead to membership billing through the existing authenticated dashboard.
5. Exclude active coupon grants from missing-payment reconciliation. Run PostgreSQL tests, UI tests, typechecks, builds, lint, and inspect the card and responsive UI.

Review focus: simultaneous single-use redemption; retry after a lost response; inactive rows with stale future expiry; active paid and unlimited access; expired/revoked codes; non-admin direct RPC calls; downloadable card content matching the saved code.
