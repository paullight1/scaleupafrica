// =============================================================================
// DISPLAY-ONLY mirror of the canonical server price list.
//
// SOURCE OF TRUTH: supabase/functions/_shared/billing.ts (PLANS).
// The client never charges and never supplies an arbitrary amount — it sends
// { plan_code, currency } to bachs-init, and the server resolves the price.
// These constants are only for rendering. Bachs decimal-string conversion lives
// exclusively at the server/provider boundary in _shared/bachs.ts.
// =============================================================================

export type PlanCode = "monthly" | "quarterly" | "annual";
export type Currency = "NGN" | "USD";

/** Display-only mirror of the server's canonical plan metadata. */
export const PLANS: Record<
  PlanCode,
  { term_months: number; prices: Partial<Record<Currency, number>> }
> = {
  monthly: {
    term_months: 1,
    prices: { USD: 1_000 },
  },
  quarterly: {
    term_months: 3,
    prices: { USD: 2_500 },
  },
    annual: { term_months: 12, prices: { USD: 9_000 } },
};

export const PLAN_TERM_MONTHS: Record<PlanCode, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};
export const SUPPORTED_CURRENCIES: Currency[] = ["NGN", "USD"];

export function isPlanCode(value: unknown): value is PlanCode {
  return value === "monthly" || value === "quarterly" || value === "annual";
}

export const CURRENCY_META: Record<Currency, { symbol: string; label: string; subunit: number; locale: string }> = {
  NGN: { symbol: "₦", label: "Nigerian Naira", subunit: 100, locale: "en-NG" },
  USD: { symbol: "$", label: "US Dollar", subunit: 100, locale: "en-US" },
};

export const MEMBERSHIP_FEATURES = [
  "Free profile on the Pan-African SME Directory",
  "Full access to the Funding Radar",
  "Curated grants, fellowships and opportunities",
  "Search funding by your business keywords",
  "Member resources and playbooks",
];

/** Return a plan's integer price for a currency, or null when not offered. */
export function getPlanPrice(plan: PlanCode, currency: Currency): number | null {
  return PLANS[plan].prices[currency] ?? null;
}

/** Format a plan price for a charge currency, e.g. "₦95,000" / "$90". */
export function formatPlanPrice(plan: PlanCode, currency: Currency): string | null {
  const amount = getPlanPrice(plan, currency);
  return amount === null ? null : formatMoney(amount, currency);
}

/** Format an arbitrary internal subunit amount (used by Payment History). */
export function formatMoney(subunits: number, currency: string): string {
  const meta = CURRENCY_META[currency as Currency];
  const divisor = meta?.subunit ?? 100;
  const major = subunits / divisor;
  try {
    return new Intl.NumberFormat(meta?.locale ?? "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${major.toLocaleString()} ${currency}`;
  }
}

/** Recurring Bachs memberships currently settle in USD. */
export function defaultCurrency(): Currency {
  return "USD";
}

/** Where upgrade / renew CTAs point — the Membership section of the account page. */
export const BILLING_ROUTE = "/dashboard/account/membership";

// --- Concierge ---------------------------------------------------------------
// TODO(HANDOFF): replace with the real staffed WhatsApp business number before launch.
const WHATSAPP_CONCIERGE_NUMBER = "2340000000000";

export function conciergeWhatsappUrl(email?: string): string {
  const message =
    "Hi Cresciva — I'd like help with my membership payment." +
    (email ? ` My account email is ${email}.` : "");
  return `https://wa.me/${WHATSAPP_CONCIERGE_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_CONCIERGE_URL = conciergeWhatsappUrl();
