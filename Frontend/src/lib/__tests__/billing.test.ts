import { describe, it, expect } from "vitest";
import { PLANS, SUPPORTED_CURRENCIES as SERVER_CURRENCIES, resolvePlanAmount } from "../../../../supabase/functions/_shared/billing";
import {
  chargeMatchesPayment,
  decideChargeGrant,
  mapPaystackStatus,
} from "../../../../supabase/functions/_shared/paystack";
import { PLAN_PRICES, PLAN_TERM_YEARS, SUPPORTED_CURRENCIES } from "@/lib/billing";

describe("plan price parity (client mirror ⇄ server source of truth)", () => {
  it("client PLAN_PRICES equals the server PLANS.annual.prices", () => {
    expect(PLAN_PRICES).toEqual(PLANS.annual.prices);
  });

  it("client term matches the server term", () => {
    expect(PLAN_TERM_YEARS).toBe(PLANS.annual.term_years);
  });

  it("both sides support exactly NGN + USD", () => {
    expect(SUPPORTED_CURRENCIES).toEqual(["NGN", "USD"]);
    expect(SERVER_CURRENCIES).toEqual(["NGN", "USD"]);
  });

  it("all amounts are positive integers (subunits, never floats)", () => {
    for (const amount of Object.values(PLANS.annual.prices)) {
      expect(Number.isInteger(amount)).toBe(true);
      expect(amount).toBeGreaterThan(0);
    }
  });
});

describe("resolvePlanAmount (server never trusts a client amount)", () => {
  it("resolves valid plan+currency", () => {
    expect(resolvePlanAmount("annual", "NGN")).toBe(9_500_000);
    expect(resolvePlanAmount("annual", "USD")).toBe(20_000);
  });

  it("rejects unknown plan or currency", () => {
    expect(resolvePlanAmount("monthly", "NGN")).toBeNull();
    expect(resolvePlanAmount("annual", "EUR")).toBeNull();
    expect(resolvePlanAmount("annual", "eu")).toBeNull();
  });
});

describe("chargeMatchesPayment (amount/currency revalidation)", () => {
  const payment = { amount: 20_000, currency: "USD", status: "initialized" };

  it("matches identical amount + currency", () => {
    expect(chargeMatchesPayment({ amount: 20_000, currency: "USD" }, payment)).toBe(true);
    expect(chargeMatchesPayment({ amount: 20_000, currency: "usd" }, payment)).toBe(true); // case-insensitive
  });

  it("rejects a lesser/tampered amount", () => {
    expect(chargeMatchesPayment({ amount: 1, currency: "USD" }, payment)).toBe(false);
  });

  it("rejects a different currency (cross-transaction confusion)", () => {
    expect(chargeMatchesPayment({ amount: 20_000, currency: "NGN" }, payment)).toBe(false);
  });
});

describe("mapPaystackStatus", () => {
  it("maps to success / pending / failed", () => {
    expect(mapPaystackStatus("success")).toBe("success");
    expect(mapPaystackStatus("failed")).toBe("failed");
    expect(mapPaystackStatus("abandoned")).toBe("failed");
    expect(mapPaystackStatus("reversed")).toBe("failed");
    expect(mapPaystackStatus("ongoing")).toBe("pending");
    expect(mapPaystackStatus("send_otp")).toBe("pending");
    expect(mapPaystackStatus(undefined)).toBe("pending");
  });
});

describe("decideChargeGrant (access-flip guard + idempotency)", () => {
  const good = { amount: 20_000, currency: "USD", status: "success" };

  it("grants for a valid, matching, not-yet-successful charge", () => {
    const payment = { amount: 20_000, currency: "USD", status: "initialized" };
    expect(decideChargeGrant("charge.success", good, payment).action).toBe("grant");
  });

  it("is idempotent: an already-success payment is a no-op ('already')", () => {
    const payment = { amount: 20_000, currency: "USD", status: "success" };
    expect(decideChargeGrant("charge.success", good, payment).action).toBe("already");
  });

  it("refuses to grant on an amount mismatch", () => {
    const payment = { amount: 20_000, currency: "USD", status: "initialized" };
    expect(decideChargeGrant("charge.success", { amount: 1, currency: "USD", status: "success" }, payment).action).toBe("mismatch");
  });

  it("refuses to grant on a currency mismatch", () => {
    const payment = { amount: 20_000, currency: "USD", status: "initialized" };
    expect(decideChargeGrant("charge.success", { amount: 20_000, currency: "NGN", status: "success" }, payment).action).toBe("mismatch");
  });

  it("ignores non-charge.success events", () => {
    const payment = { amount: 20_000, currency: "USD", status: "initialized" };
    expect(decideChargeGrant("charge.failed", good, payment).action).toBe("ignore");
    expect(decideChargeGrant("transfer.success", good, payment).action).toBe("ignore");
  });

  it("ignores when there is no matching payment row", () => {
    expect(decideChargeGrant("charge.success", good, null).action).toBe("ignore");
  });

  it("ignores when Paystack status isn't success", () => {
    const payment = { amount: 20_000, currency: "USD", status: "initialized" };
    expect(decideChargeGrant("charge.success", { ...good, status: "pending" }, payment).action).toBe("ignore");
  });
});
