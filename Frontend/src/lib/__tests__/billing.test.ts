import { describe, it, expect } from "vitest";
import {
  PLANS,
  SUPPORTED_CURRENCIES as SERVER_CURRENCIES,
  resolvePlanAmount,
} from "../../../../supabase/functions/_shared/billing";
import {
  PLANS as CLIENT_PLANS,
  PLAN_TERM_MONTHS,
  SUPPORTED_CURRENCIES,
} from "@/lib/billing";

describe("plan price parity (client mirror ⇄ server source of truth)", () => {
  it("client plan metadata equals the server plan metadata", () => {
    expect(CLIENT_PLANS).toEqual(PLANS);
  });

  it("exposes monthly, quarterly, and annual terms in months", () => {
    expect(PLAN_TERM_MONTHS).toEqual({ monthly: 1, quarterly: 3, annual: 12 });
  });

  it("both sides support exactly NGN + USD", () => {
    expect(SUPPORTED_CURRENCIES).toEqual(["NGN", "USD"]);
    expect(SERVER_CURRENCIES).toEqual(["NGN", "USD"]);
  });

  it("all canonical amounts are positive integer subunits, never floats", () => {
    for (const plan of Object.values(PLANS)) {
      for (const amount of Object.values(plan.prices)) {
        expect(Number.isInteger(amount)).toBe(true);
        expect(amount).toBeGreaterThan(0);
      }
    }
  });
});

describe("resolvePlanAmount (server never trusts a client amount)", () => {
  it("resolves the requested USD tier", () => {
    expect(resolvePlanAmount("monthly", "USD")).toBe(1_000);
    expect(resolvePlanAmount("quarterly", "USD")).toBe(2_500);
    expect(resolvePlanAmount("annual", "USD")).toBe(9_000);
  });

  it("rejects NGN because recurring memberships settle in USD", () => {
    expect(resolvePlanAmount("annual", "NGN")).toBeNull();
    expect(resolvePlanAmount("monthly", "NGN")).toBeNull();
    expect(resolvePlanAmount("quarterly", "NGN")).toBeNull();
  });

  it("rejects unknown plan or currency", () => {
    expect(resolvePlanAmount("annual", "EUR")).toBeNull();
    expect(resolvePlanAmount("annual", "eu")).toBeNull();
  });
});
