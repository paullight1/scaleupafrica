# Membership coupons

Admins open **System → Coupons** (`/admin/coupons`). Generate 1–500 codes per batch; there is no total batch limit. Choose **Single use** for one redemption across all accounts, or **Unlimited uses** for a shared code that each account can redeem once. A single-code batch can have a custom code (4–32 letters, digits, or hyphens).

The redemption deadline is **1 day**, **1 week**, or **1 calendar month** after generation. This is separate from the benefit: every successful redemption adds **seven days** of membership. Existing active paid membership is extended from its expiry; inactive membership starts from redemption. Existing unlimited membership is preserved. Coupons never start checkout, charge a card, change billing-provider settings, or create a payment receipt.

Each saved coupon can be copied, previewed, or downloaded as a branded **1200 × 760 PNG** or **SVG**. The card includes the code, UTC deadline, and membership redemption address. All codes in the latest batch can be copied together. The library supports search and pagination. **Revoke** blocks future redemptions and preserves access already granted.

Members redeem on **Dashboard → Account → Membership** (`/dashboard/account/membership`), in the membership plan picker, or at the Funding Radar membership gate. A `?coupon=CODE` link prefills the form; redemption always requires an explicit submit. Success refreshes the canonical membership query. An identical retry returns the original receipt without adding days twice.

Database writes are RPC-only. Generation/revocation recheck the administrator role and enrolled MFA; coupon lists are admin-only. Members can read their own redemption receipts. Coupon-row and subscription-row locks serialize competing redemptions; the receipt uniqueness constraint prevents duplicate grants. Generated types come from the deployed schema. The NestJS schema mirrors the new tables; all access decisions still use the existing subscription rule.

Payment reconciliation recognizes unexpired coupon grants covering the member's entitlement without inventing successful payments.

## Verification

- `node scripts/test-coupons.mjs` creates and drops a disposable local PostgreSQL database. Requires local PostgreSQL tools and permission to create databases. It tests permissions/RLS/MFA, batch generation, expiry, revocation, retries, concurrent single-use redemption, shared codes, paid/unlimited access, real billing-status constraints, and rollback.
- `supabase/tests/membership_coupons_smoke.sql` exercises real generation, redemption, the canonical access function, preservation of billing settings, retry, and revocation in one transaction, then **rolls back every test write**. It needs an existing administrator and member.
- UI tests cover selected generator options, code copying, redemption confirmation, errors, and membership refresh. Browser checks cover desktop/mobile layout, PNG export, batch generation, and redemption with mocked HTTP responses. The live SQL smoke test covers actual backend behavior.

## Migration notes

`20261104064132_membership_coupons.sql` creates the tables/RPCs. `20261104150445_coupon_preserve_billing_state.sql` preserves payment-provider billing state during redemption, accommodating the existing production constraint. Both must be applied in order.

The linked project has older remote migration versions absent from this checkout. Coupon migrations were applied individually and only their own versions recorded as applied; older migration history was preserved. The `payment-reconciliation` edge function must be deployed after the coupon tables exist. Build/deploy both web bundles to expose the new routes.

## Delivery status (4 November 2026)

Both coupon migrations and the updated reconciliation function are deployed to the linked Cresciva project. The live rollback smoke test passed, including the canonical access function. It left no test coupons or changed memberships. PostgreSQL concurrency/regression tests and all 24 coupon-related UI/presentation/reconciliation/dashboard integration tests pass. Desktop/mobile browser checks verified generator settings, redemption, and both PNG/SVG downloads. Typechecks, lint, both web builds, and the API build pass. Independent code review found no critical or important blockers in the current Paystack runtime. The security advisor's authenticated `SECURITY DEFINER` notices are intentional for these RPCs: internal admin/MFA checks and caller-bound redemption enforce authorization; anonymous execution is revoked.

The web app changes are prepared in this checkout; they have not been published. This checkout also contains independent directory and funding work, so publishing the whole checkout would release those changes too.

The full workspace test run also reported unrelated failures: the shared anti-pattern scan finds `Sparkles` in `AdminFundingEngine.tsx`; seven landing-page tests in `Index.test.tsx` have a directory mock missing `useOwnProfile`; and `AdminFinanceStudio.test.tsx` expects August 2026 while using the real current date. These files were not changed as part of the coupon work.
