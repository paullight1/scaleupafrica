// Payments-owned checkout hook entry point that sibling plans import
// (Plan 05's FundingPaywall imports `usePaystackCheckout` from "@/hooks/usePaystack").
//
// The implementation lives in src/lib/paystack.ts (Plan 06 §5.5 scoped file); this
// is the stable hook import path. `startCheckout({ next })` works with no currency —
// it defaults by browser region (NG → NGN, else USD).
export { usePaystackCheckout, initCheckout, verifyPayment } from "@/lib/paystack";
export type { CheckoutParams, VerifyStatus } from "@/lib/paystack";
