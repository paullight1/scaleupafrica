// =============================================================================
// CANONICAL server-side membership price list. SOURCE OF TRUTH.
//
// Pure TypeScript — NO Deno globals — so it runs both on the Deno edge runtime
// and under Vitest (Node). The client mirror in Frontend/src/lib/billing.ts must
// stay in lockstep; billing tests assert the two agree.
//
// Cresciva stores money internally as integer subunits (kobo/cents), never
// floats. The browser NEVER sends an amount; it sends { plan_code, currency }
// and the server resolves the amount here. Bachs expects decimal strings, so
// conversion happens only in _shared/bachs.ts at the provider boundary.
// =============================================================================

export type PlanCode = "monthly" | "quarterly" | "annual";
export type Currency = "NGN" | "USD";

export const PLANS: Record<
  PlanCode,
  { term_months: number; prices: Partial<Record<Currency, number>> }
> = {
  monthly: {
    term_months: 1,
    prices: {
      USD: 1_000, // $10 in cents
    },
  },
  quarterly: {
    term_months: 3,
    prices: {
      USD: 2_500, // $25 in cents
    },
  },
  annual: {
    term_months: 12,
    prices: {
      USD: 9_000, //     $90 in cents
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
  return PLANS[plan].prices[currency] ?? null;
}
