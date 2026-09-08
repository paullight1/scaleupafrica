import { useSyncExternalStore } from "react";
import { useAuth } from "@shared/hooks/useAuth";
import { useOwnProfile } from "@/hooks/queries/directory";
import { currencyForCountry, defaultCurrency, type Currency } from "@/lib/billing";

const KEY = "cresciva:pricing-currency";
const EVENT = "cresciva:pricing-currency-changed";
let preference: Currency | null = null;
function snapshot(): Currency | null {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "NGN" || stored === "USD" ? stored : preference;
  } catch { return preference; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}
function setCurrency(currency: Currency) {
  preference = currency;
  try { localStorage.setItem(KEY, currency); } catch { /* Selection works without storage. */ }
  window.dispatchEvent(new Event(EVENT));
}
export function usePricingCurrency() {
  const { user } = useAuth();
  const { data: profile } = useOwnProfile(user?.id);
  const selected = useSyncExternalStore(subscribe, snapshot, () => null);
  const currency = selected ?? currencyForCountry(profile?.country) ?? defaultCurrency();
  return { currency, setCurrency };
}
