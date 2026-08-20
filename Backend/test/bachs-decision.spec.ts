import { describe, expect, it } from "vitest";
import {
  checkoutMatchesPayment,
  decideBachsGrant,
  type BachsCheckout,
  type CrescivaPaymentLite,
} from "../../supabase/functions/_shared/bachs";

const payment: CrescivaPaymentLite = {
  amount: 20_000,
  currency: "USD",
  status: "initialized",
};

const checkout: BachsCheckout = {
  checkout_id: "chk_api_test",
  status: "completed",
  payment_status: "succeeded",
  amount: "200.00",
  currency: "USD",
  reference: "crv_api_test",
  charge: {
    payment_id: "pay_api_test",
    status: "succeeded",
    amount: "200.00",
    currency: "USD",
  },
};

describe("Bachs settlement invariants", () => {
  it("matches exact provider amount + currency", () => {
    expect(checkoutMatchesPayment(checkout, payment)).toBe(true);
  });

  it("rejects amount or currency confusion", () => {
    expect(checkoutMatchesPayment({ ...checkout, amount: "199.00" }, payment)).toBe(false);
    expect(checkoutMatchesPayment({ ...checkout, currency: "NGN" }, payment)).toBe(false);
  });

  it("grants a settled matching checkout", () => {
    expect(decideBachsGrant(checkout, payment)).toEqual({ action: "grant" });
  });

  it("accepts the Bachs ACCEPTED alternative terminal charge status", () => {
    expect(
      decideBachsGrant(
        { ...checkout, charge: { ...checkout.charge!, status: "accepted" } },
        payment,
      ),
    ).toEqual({ action: "grant" });
  });

  it("does not grant when payment_status is still processing", () => {
    expect(decideBachsGrant({ ...checkout, payment_status: "processing" }, payment)).toEqual({
      action: "ignore",
    });
  });

  it("is idempotent after the internal payment is successful", () => {
    expect(decideBachsGrant(checkout, { ...payment, status: "success" })).toEqual({
      action: "already",
    });
  });
});
