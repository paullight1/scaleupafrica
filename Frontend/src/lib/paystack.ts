// =============================================================================
// Frontend Paystack checkout client (Plan 06 §5.5).
//
// Redirect flow — NO Paystack JS / public key in the bundle. The client only:
//   1. asks paystack-init for a hosted-checkout URL (server resolves the amount),
//   2. redirects the browser to it,
//   3. after the callback, asks paystack-verify to confirm.
//
// Plan 05's Funding paywall CTA imports `usePaystackCheckout`.
// =============================================================================
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { defaultCurrency, type Currency, type PlanCode } from "@/lib/billing";

export type VerifyStatus = "success" | "pending" | "failed";

export interface CheckoutParams {
  plan_code?: PlanCode;
  /** Charge currency. Omitted by the paywall CTA → defaults by browser region. */
  currency?: Currency;
  /** Where to return the user after auth if they aren't signed in yet. */
  next?: string;
}

interface InitResponse {
  authorization_url?: string;
  reference?: string;
  error?: string;
  code?: string;
  expires_at?: string;
}

/**
 * Call paystack-init. Supabase wraps non-2xx as a FunctionsHttpError whose
 * `.context` is the raw Response — we read the typed error body from it so the
 * caller can branch on ALREADY_ACTIVE / CURRENCY_UNAVAILABLE, etc.
 */
export async function initCheckout(params: { plan_code: PlanCode; currency: Currency }): Promise<InitResponse> {
  const { data, error } = await supabase.functions.invoke<InitResponse>("paystack-init", { body: params });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        return await ctx.json();
      } catch {
        /* fall through to the generic error below */
      }
    }
    return { error: error.message };
  }
  return data ?? {};
}

/** Confirm a transaction from the callback page. Never throws — returns a status. */
export async function verifyPayment(reference: string): Promise<VerifyStatus> {
  const { data, error } = await supabase.functions.invoke<{ status?: VerifyStatus }>("paystack-verify", {
    body: { reference },
  });
  if (error || !data?.status) return "pending";
  return data.status;
}

/**
 * Checkout hook. Returns `{ startCheckout, isPending }`.
 * - Not signed in → routes to /auth?next=… (never a dead end).
 * - Success → redirects the browser to the Paystack hosted page.
 * - Typed errors → honest toast; the user stays put and can retry.
 */
export function usePaystackCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const startCheckout = useCallback(
    async ({ plan_code = "annual", currency, next = "/dashboard/funding" }: CheckoutParams = { currency: undefined }) => {
      if (!user) {
        navigate(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }
      const chargeCurrency = currency ?? defaultCurrency();
      setIsPending(true);
      try {
        const res = await initCheckout({ plan_code, currency: chargeCurrency });
        if (res.authorization_url) {
          window.location.assign(res.authorization_url);
          return; // full-page redirect; keep isPending true until unload
        }
        if (res.code === "ALREADY_ACTIVE") {
          toast.info(
            res.expires_at
              ? `You're already a member until ${new Date(res.expires_at).toLocaleDateString()}.`
              : "You already have an active membership.",
          );
        } else if (res.code === "CURRENCY_UNAVAILABLE") {
          toast.error("Card payment in this currency isn't available yet. Try NGN, or message the concierge.");
        } else {
          toast.error(res.error || "Could not start checkout. Please try again.");
        }
        setIsPending(false);
      } catch {
        toast.error("Network error. Check your connection and try again.");
        setIsPending(false);
      }
    },
    [user, navigate],
  );

  return { startCheckout, isPending };
}
