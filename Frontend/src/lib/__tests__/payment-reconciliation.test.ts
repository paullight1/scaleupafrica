import { describe, expect, it } from "vitest";
import {
  reconcileActiveSubscription,
  reconcilePayment,
} from "../../../../supabase/functions/_shared/paymentReconciliation";

const NOW = Date.parse("2026-08-20T18:00:00Z");
const payment = {
  id: "pay_internal_1",
  user_id: "user_1",
  provider: "bachs",
  reference: "crv_1",
  status: "success",
  amount: 20_000,
  currency: "USD",
  paid_at: "2026-08-20T17:00:00Z",
};
const subscription = {
  user_id: "user_1",
  has_access: true,
  expires_at: "2027-08-20T17:00:00Z",
};

describe("payment reconciliation invariants", () => {
  it("is healthy when successful payment, access, settlement event, and receipt agree", () => {
    expect(
      reconcilePayment({
        payment,
        subscription,
        processedSettlementEvent: true,
        receiptStatus: "sent",
        nowMs: NOW,
      }),
    ).toEqual({ issues: [], healthy: true, accessActive: true });
  });

  it("flags successful payment without active access", () => {
    const result = reconcilePayment({
      payment,
      subscription: { ...subscription, has_access: false },
      processedSettlementEvent: true,
      receiptStatus: "sent",
      nowMs: NOW,
    });
    expect(result.issues).toContain("paid_no_access");
  });

  it("flags successful payment without a processed settlement event", () => {
    const result = reconcilePayment({
      payment,
      subscription,
      processedSettlementEvent: false,
      receiptStatus: "sent",
      nowMs: NOW,
    });
    expect(result.issues).toContain("success_no_processed_event");
  });

  it("surfaces receipt failures and skipped receipt configuration", () => {
    expect(
      reconcilePayment({ payment, subscription, processedSettlementEvent: true, receiptStatus: "failed", nowMs: NOW }).issues,
    ).toContain("receipt_failed");
    expect(
      reconcilePayment({ payment, subscription, processedSettlementEvent: true, receiptStatus: "skipped", nowMs: NOW }).issues,
    ).toContain("receipt_skipped");
  });

  it("flags active access that has no successful payment of any provider", () => {
    expect(reconcileActiveSubscription(subscription, false, NOW)).toEqual(["access_no_paid_payment"]);
    expect(reconcileActiveSubscription(subscription, true, NOW)).toEqual([]);
  });
});
