// Stable payments hook entry point for funding/member surfaces.
// The implementation lives in src/lib/bachs.ts; callers do not need provider
// request details and can start checkout with only the return destination.
export {
  useBachsCheckout,
  initCheckout,
  readPaymentStatus,
  verifyPayment,
} from "@/lib/bachs";
export type { CheckoutParams, VerifyStatus } from "@/lib/bachs";
