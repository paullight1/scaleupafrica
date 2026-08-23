import { describe, it, expect } from "vitest";
import {
  PLANS,
  SUPPORTED_CURRENCIES as SERVER_CURRENCIES,
  resolvePlanAmount,
} from "../../../../supabase/functions/_shared/billing";
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

  it("all canonical amounts are positive integer subunits, never floats", () => {
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
