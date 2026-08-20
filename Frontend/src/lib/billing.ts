// =============================================================================
// DISPLAY-ONLY mirror of the canonical server price list.
//
// SOURCE OF TRUTH: supabase/functions/_shared/billing.ts (PLANS).
// The client never charges and never supplies an arbitrary amount — it sends
// { plan_code, currency } to bachs-init, and the server resolves the price.
// These constants are only for rendering. Bachs decimal-string conversion lives
// exclusively at the server/provider boundary in _shared/bachs.ts.
// =============================================================================

export type PlanCode = "annual";
export type Currency = "NGN" | "USD";

/** Integer subunits (kobo / cents) — mirror of PLANS.annual.prices on the server. */
export const PLAN_PRICES: Record<Currency, number> = {
  NGN: 9_500_000, // ₦95,000
  USD: 20_000, //    $200
};

export const PLAN_TERM_YEARS = 1;
export const SUPPORTED_CURRENCIES: Currency[] = ["NGN", "USD"];

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

/** Format a whole plan price for a charge currency, e.g. "₦95,000" / "$200". */
export function formatPlanPrice(currency: Currency): string {
  return formatMoney(PLAN_PRICES[currency], currency);
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

/** Default charge currency by the browser region: NG → NGN, everything else → USD. */
export function defaultCurrency(): Currency {
  try {
    const lang = typeof navigator !== "undefined" ? navigator.language : "";
    const region = lang.includes("-") ? lang.split("-")[1] : lang;
    return region.toUpperCase() === "NG" ? "NGN" : "USD";
  } catch {
    return "USD";
  }
}

/** Where upgrade / renew CTAs point — the Membership section of the account page. */
export const BILLING_ROUTE = "/dashboard/account#billing";

// --- Concierge ---------------------------------------------------------------
// TODO(HANDOFF): replace with the real staffed WhatsApp business number before launch.
const WHATSAPP_CONCIERGE_NUMBER = "2340000000000";

export function conciergeWhatsappUrl(email?: string): string {
  const message =
    "Hi Cresciva — I'd like help with my annual membership payment." +
    (email ? ` My account email is ${email}.` : "");
  return `https://wa.me/${WHATSAPP_CONCIERGE_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_CONCIERGE_URL = conciergeWhatsappUrl();
