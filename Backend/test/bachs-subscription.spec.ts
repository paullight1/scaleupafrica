import { describe, expect, it } from "vitest";
import {
  invoiceMatchesExpected,
  isSubscriptionAccessValid,
  parseBachsInvoiceSnapshot,
  parseBachsSubscriptionSnapshot,
} from "../../supabase/functions/_shared/bachs";

const PERIOD_END = "2026-09-23T00:00:00.000Z";

describe("Bachs recurring subscription snapshots", () => {
  it("extracts a subscription lifecycle payload", () => {
    expect(
      parseBachsSubscriptionSnapshot({
        subscription_id: "sub_monthly_123",
        customer: { customer_id: "cust_123", email: "member@example.com" },
        product_id: "prod_monthly_123",
        status: "active",
        collection_method: "charge_automatically",
        currency: "USD",
        amount: "10.00",
        billing_cycle: { interval: "month", frequency: 1 },
        current_period_start: "2026-08-23T00:00:00.000Z",
        current_period_end: PERIOD_END,
        next_billed_at: PERIOD_END,
        cancel_at_period_end: false,
        metadata: { cresciva_user_id: "user_123" },
      }),
    ).toMatchObject({
      subscription_id: "sub_monthly_123",
      customer_id: "cust_123",
      status: "active",
      amount: "10.00",
      currency: "USD",
      current_period_end: PERIOD_END,
      cancel_at_period_end: false,
    });
  });

  it("extracts the subscription from a paid invoice payload", () => {
    expect(
      parseBachsInvoiceSnapshot({
        invoice_id: "inv_1234",
        subscription: { subscription_id: "sub_monthly_123" },
        customer: { customer_id: "cust_123" },
        status: "paid",
        currency: "USD",
        total: "10.00",
        amount_paid: "10.00",
        period_start: "2026-08-23T00:00:00.000Z",
        period_end: PERIOD_END,
        metadata: { cresciva_reference: "crv_12345678" },
      }),
    ).toEqual({
      invoice_id: "inv_1234",
      subscription_id: "sub_monthly_123",
      customer_id: "cust_123",
      status: "paid",
      currency: "USD",
      total: "10.00",
      amount_paid: "10.00",
      period_start: "2026-08-23T00:00:00.000Z",
      period_end: PERIOD_END,
      metadata: { cresciva_reference: "crv_12345678" },
    });
  });

  it("accepts an exact recurring invoice amount and currency", () => {
    const invoice = parseBachsInvoiceSnapshot({
      invoice_id: "inv_1234",
      subscription: { subscription_id: "sub_monthly_123" },
      status: "paid",
      currency: "USD",
      total: "10.00",
      amount_paid: "10.00",
      period_start: "2026-08-23T00:00:00.000Z",
      period_end: PERIOD_END,
      metadata: {},
    });

    expect(invoice).not.toBeNull();
    expect(invoiceMatchesExpected(invoice!, 1_000, "USD")).toBe(true);
    expect(invoiceMatchesExpected({ ...invoice!, total: "9.00" }, 1_000, "USD")).toBe(false);
    expect(invoiceMatchesExpected({ ...invoice!, currency: "NGN" }, 1_000, "USD")).toBe(false);
  });

  it("keeps access during Bachs recovery only until the paid period ends", () => {
    const beforeExpiry = new Date("2026-09-01T00:00:00.000Z").getTime();
    const afterExpiry = new Date("2026-10-01T00:00:00.000Z").getTime();

    expect(isSubscriptionAccessValid("past_due", PERIOD_END, beforeExpiry)).toBe(true);
    expect(isSubscriptionAccessValid("unpaid", PERIOD_END, beforeExpiry)).toBe(true);
    expect(isSubscriptionAccessValid("past_due", PERIOD_END, afterExpiry)).toBe(false);
    expect(isSubscriptionAccessValid("canceled", PERIOD_END, beforeExpiry)).toBe(false);
  });
});
