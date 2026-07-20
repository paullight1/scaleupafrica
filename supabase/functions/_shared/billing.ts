// =============================================================================
// CANONICAL server-side price list (Plan 06 §5.1). SOURCE OF TRUTH.
//
// Pure TypeScript — NO Deno globals — so it runs both on the Deno edge runtime
// and under Vitest (Node). The client mirror in src/lib/billing.ts must stay in
// lockstep; src/lib/__tests__/billing.test.ts asserts the two agree.
//
// Amounts are integer subunits only (kobo for NGN, cents for USD) — never floats.
// The client NEVER sends an amount; it sends { plan_code, currency } and the
// server resolves the amount from this table.
// =============================================================================

export type PlanCode = "annual";
export type Currency = "NGN" | "USD";

export const PLANS: Record<
  PlanCode,
  { term_years: number; prices: Record<Currency, number> }
> = {
  annual: {
    term_years: 1,
    prices: {
      NGN: 9_500_000, // ₦95,000 in kobo
      USD: 20_000, //    $200 in cents
    },
  },
};

export const SUPPORTED_CURRENCIES: Currency[] = ["NGN", "USD"];

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PLANS, value);
}

export function isCurrency(value: unknown): value is Currency {
  return value === "NGN" || value === "USD";
}

/** Resolve the integer subunit amount for a plan+currency, or null if invalid. */
export function resolvePlanAmount(plan: unknown, currency: unknown): number | null {
  if (!isPlanCode(plan) || !isCurrency(currency)) return null;
  return PLANS[plan].prices[currency];
}
