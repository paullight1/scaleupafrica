import { describe, expect, it } from "vitest";
import {
  indexReceiptStatuses,
  reconcileActiveSubscription,
  reconcilePayment,
  settlementEventProcessed,
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

  it("does not assign receipt failures to payments that never succeeded", () => {
    const failedPayment = { ...payment, status: "failed" };

    expect(
      reconcilePayment({
        payment: failedPayment,
        subscription,
        processedSettlementEvent: false,
        receiptStatus: "failed",
        nowMs: NOW,
      }),
    ).toEqual({ issues: [], healthy: true, accessActive: true });
  });

  it("indexes the latest receipt event by payment instead of customer email", () => {
    const statuses = indexReceiptStatuses([
      {
        payment_id: "pay_internal_1",
        status: "failed",
        created_at: "2026-08-20T18:00:00Z",
      },
      {
        payment_id: "pay_internal_1",
        status: "sent",
        created_at: "2026-08-20T17:59:00Z",
      },
      {
        payment_id: null,
        status: "failed",
        created_at: "2026-08-20T19:00:00Z",
      },
    ]);

    expect([...statuses.entries()]).toEqual([["pay_internal_1", "failed"]]);
    expect(statuses.has("pay_internal_2")).toBe(false);
  });

  it("matches recurring Bachs settlement by invoice id when no checkout id exists", () => {
    expect(
      settlementEventProcessed(
        {
          provider: "bachs",
          checkoutId: null,
          providerInvoiceId: "inv_paid_1",
        },
        new Set(),
        new Set(["inv_paid_1"]),
      ),
    ).toBe(true);
  });

  it("flags active access that has no successful payment of any provider", () => {
    expect(reconcileActiveSubscription(subscription, false, NOW)).toEqual(["access_no_paid_payment"]);
    expect(reconcileActiveSubscription(subscription, true, NOW)).toEqual([]);
  });
});
