// =============================================================================
// Frontend Bachs hosted-checkout client.
//
// No Bachs secret or SDK is shipped to the browser. The client only asks
// authenticated Supabase Edge Functions to create/retrieve provider state and
// redirects to the hosted checkout URL returned by bachs-init.
// =============================================================================
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { type Currency, type PlanCode } from "@/lib/billing";

export type VerifyStatus = "success" | "pending" | "failed";

export interface CheckoutParams {
  plan_code?: PlanCode;
  currency?: Currency;
  /** Where to return the user after auth if they are not signed in yet. */
  next?: string;
}

interface InitResponse {
  checkout_url?: string;
  checkout_id?: string;
  reference?: string;
  error?: string;
  code?: string;
  expires_at?: string;
  recurring?: boolean;
}

export interface PortalResponse {
  portal_url?: string;
  error?: string;
  code?: string;
}

export async function initCheckout(params: {
  plan_code: PlanCode;
  currency: Currency;
}): Promise<InitResponse> {
  const { data, error } = await supabase.functions.invoke<InitResponse>(
    "bachs-init",
    {
      body: params,
    },
  );
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        return await context.json();
      } catch {
        // Fall through to the generic Supabase function error below.
      }
    }
    return { error: error.message };
  }
  return data ?? {};
}

/**
 * Callback-page verification backstop. The browser sends only Cresciva's random
 * internal payment reference; the edge function resolves the linked Bachs
 * checkout server-side before deciding whether access can be granted.
 */
export async function verifyPayment(reference: string): Promise<VerifyStatus> {
  const { data, error } = await supabase.functions.invoke<{
    status?: VerifyStatus;
  }>("bachs-verify", { body: { reference } });
  if (error || !data?.status) return "pending";
  return data.status;
}

/**
 * Fast callback status read. The payments table is RLS-scoped to the signed-in
 * owner, and the signed webhook updates this row in the same transaction that
 * activates the subscription. This keeps provider API latency off the polling
 * loop without trusting the browser to grant access.
 */
export async function readPaymentStatus(
  reference: string,
): Promise<VerifyStatus> {
  const { data, error } = await supabase
    .from("payments" as never)
    .select("status")
    .eq("provider", "bachs")
    .eq("reference", reference)
    .maybeSingle();
  if (error || !data) return "pending";

  const status = (data as unknown as { status?: string }).status;
  if (status === "success") return "success";
  if (status === "failed" || status === "abandoned") return "failed";
  return "pending";
}

export async function createPortalSession(): Promise<PortalResponse> {
  const { data, error } = await supabase.functions.invoke<PortalResponse>(
    "bachs-portal",
    { body: {} },
  );
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        return await context.json();
      } catch {
        /* use generic error below */
      }
    }
    return { error: error.message };
  }
  return data ?? {};
}

export function useBachsCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const startCheckout = useCallback(
    async ({
      plan_code = "annual",
      currency,
      next = "/dashboard/funding",
    }: CheckoutParams = {}) => {
      if (!user) {
        navigate(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }

      const chargeCurrency = "USD" as const;
      setIsPending(true);
      try {
        const result = await initCheckout({
          plan_code,
          currency: chargeCurrency,
        });
        if (result.checkout_url) {
          window.location.assign(result.checkout_url);
          return; // full-page redirect; keep pending state until unload
        }

        if (result.code === "ALREADY_ACTIVE") {
          toast.info(
            result.expires_at
              ? `You're already a member until ${new Date(result.expires_at).toLocaleDateString()}.`
              : "You already have an active membership.",
          );
        } else if (result.code === "RATE_LIMITED") {
          toast.error(
            "Checkout is temporarily busy. Please try again shortly.",
          );
        } else if (result.code === "NOT_CONFIGURED") {
          toast.error(
            "Online payment is temporarily unavailable. Please contact support.",
          );
        } else {
          toast.error(
            result.error || "Could not start checkout. Please try again.",
          );
        }
      } catch {
        toast.error("Network error. Check your connection and try again.");
      } finally {
        // The redirect path unloads the page; this matters only when no redirect happened.
        setIsPending(false);
      }
    },
    [navigate, user],
  );

  return { startCheckout, isPending };
}
