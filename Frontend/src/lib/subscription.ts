import { useQuery } from "@tanstack/react-query";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";

/**
 * CANONICAL client-side active-subscription rule.
 *
 * This is one of exactly TWO homes for the subscription rule (FOUNDATION §8.3):
 *   - DB / all server checks: has_active_subscription() SQL fn (edge fn via RPC).
 *   - Frontend / all display logic: this file.
 * Keep the two in lockstep — a row is "active" when has_access is true AND
 * expires_at is null or strictly in the future (see 20260713035330…sql:67).
 *
 * Plans 03 (dashboard) and 06 (billing) MUST import `useSubscription` /
 * `isSubscriptionActive` from here — do NOT reimplement the rule.
 */

export type SubscriptionRow = {
  has_access: boolean;
  expires_at: string | null;
  plan_code?: "monthly" | "quarterly" | "annual" | null;
  billing_status?: string | null;
  auto_renew?: boolean;
  billing_email?: string | null;
  next_payment_at?: string | null;
  bachs_subscription_id?: string | null;
  current_period_start?: string | null;
  cancel_at_period_end?: boolean;
} | null;

export function isSubscriptionActive(sub: SubscriptionRow, now: Date = new Date()): boolean {
  return !!sub?.has_access && (!sub.expires_at || new Date(sub.expires_at) > now);
}

export type SubscriptionStatus = "loading" | "error" | "active" | "inactive";

export interface UseSubscriptionResult {
  status: SubscriptionStatus;
  active: boolean;
  data: SubscriptionRow;
  refetch: () => void;
  isFetching: boolean;
}

/**
 * The ONLY place the client reads `subscriptions`.
 *
 * TRUST-CRITICAL (IMPROVEMENTS §2.1): the queryFn THROWS on fetch error, so a
 * failed read surfaces as `status: "error"` — callers render ErrorState + Retry
 * and MUST NOT fall back to the paywall. A subscriber on a flaky connection is
 * never told "members only".
 */
export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    retry: 2,
    staleTime: 60_000,
    queryFn: async (): Promise<SubscriptionRow> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("has_access, expires_at, plan_code, billing_status, auto_renew, billing_email, next_payment_at, bachs_subscription_id, current_period_start, cancel_at_period_end")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error; // <-- errors become status:"error", never "no access"
      return (data ?? null) as SubscriptionRow; // null row (trigger should create one) = inactive
    },
  });

  const data = (query.data ?? null) as SubscriptionRow;

  const status: SubscriptionStatus = !user || query.isPending
    ? "loading"
    : query.isError
      ? "error"
      : isSubscriptionActive(data)
        ? "active"
        : "inactive";

  return {
    status,
    active: status === "active",
    data,
    refetch: () => void query.refetch(),
    isFetching: query.isFetching,
  };
}
