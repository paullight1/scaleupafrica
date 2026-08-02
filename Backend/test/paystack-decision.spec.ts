import { describe, it, expect } from "vitest";
// The security-critical decision helpers live in the edge shared module, which is
// pure TS (Web Crypto + fetch only) and by design unit-testable under Node/Vitest.
import {
  chargeMatchesPayment,
  decideChargeGrant,
  type PaymentRowLite,
  type PaystackChargeData,
} from "../../supabase/functions/_shared/paystack.ts";

const payment: PaymentRowLite = { amount: 5000, currency: "NGN", status: "initialized" };
const goodData: PaystackChargeData = { amount: 5000, currency: "NGN", status: "success" };

describe("chargeMatchesPayment (I2)", () => {
  it("matches on equal amount + currency (case-insensitive)", () => {
    expect(chargeMatchesPayment({ amount: 5000, currency: "ngn" }, payment)).toBe(true);
  });
  it("rejects an amount mismatch", () => {
    expect(chargeMatchesPayment({ amount: 100, currency: "NGN" }, payment)).toBe(false);
  });
  it("rejects a currency mismatch", () => {
    expect(chargeMatchesPayment({ amount: 5000, currency: "USD" }, payment)).toBe(false);
  });
  it("rejects a non-numeric amount", () => {
    expect(chargeMatchesPayment({ amount: "x", currency: "NGN" }, payment)).toBe(false);
  });
});

describe("decideChargeGrant (I2)", () => {
  it("grants on the happy path", () => {
    expect(decideChargeGrant("charge.success", goodData, payment).action).toBe("grant");
  });
  it("mismatch on amount tampering", () => {
    expect(
      decideChargeGrant("charge.success", { ...goodData, amount: 1 }, payment).action,
    ).toBe("mismatch");
  });
  it("mismatch on currency confusion", () => {
    expect(
      decideChargeGrant("charge.success", { ...goodData, currency: "USD" }, payment).action,
    ).toBe("mismatch");
  });
  it("already when the row is already 'success' (idempotent)", () => {
    expect(
      decideChargeGrant("charge.success", goodData, { ...payment, status: "success" }).action,
    ).toBe("already");
  });
  it("ignores a non-'charge.success' event", () => {
    expect(decideChargeGrant("charge.failed", goodData, payment).action).toBe("ignore");
  });
});
