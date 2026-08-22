import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";

const db = supabase as unknown as SupabaseClient;

export interface FundingNotificationPreferences {
  emailNewMatches: boolean;
  emailDeadlineAlerts: boolean;
}

export const fundingNotificationPreferenceKeys = {
  detail: (userId: string | undefined) => ["funding", "notification-preferences", userId] as const,
};

export function useFundingNotificationPreferences() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery<FundingNotificationPreferences>({
    queryKey: fundingNotificationPreferenceKeys.detail(userId),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("user_preferences")
        .select("email_new_matches,email_deadline_alerts")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return {
        emailNewMatches: data?.email_new_matches ?? true,
        emailDeadlineAlerts: data?.email_deadline_alerts ?? true,
      };
    },
  });
}

export function useUpdateFundingNotificationPreferences() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  return useMutation<void, Error, FundingNotificationPreferences>({
    mutationFn: async (preferences) => {
      if (!userId) throw new Error("Sign in to update notification preferences.");
      const { error } = await db.from("user_preferences").upsert({
        user_id: userId,
        email_new_matches: preferences.emailNewMatches,
        email_deadline_alerts: preferences.emailDeadlineAlerts,
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: (_result, preferences) => {
      qc.setQueryData(fundingNotificationPreferenceKeys.detail(userId), preferences);
    },
  });
}