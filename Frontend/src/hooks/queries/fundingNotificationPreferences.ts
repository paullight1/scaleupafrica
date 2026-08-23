import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";

const db = supabase as unknown as SupabaseClient;

export interface FundingNotificationPreferences {
  emailNewMatches: boolean;
  emailDeadlineAlerts: boolean;
}

interface FundingPreferenceRow {
  email_new_funding?: boolean | null;
  email_new_matches?: boolean | null;
  email_deadline_alerts?: boolean | null;
}

export const fundingNotificationPreferenceKeys = {
  detail: (userId: string | undefined) => ["funding", "notification-preferences", userId] as const,
};

export function effectiveFundingNotificationPreferences(
  row: FundingPreferenceRow | null | undefined,
): FundingNotificationPreferences {
  const masterFundingConsent = row?.email_new_funding ?? true;
  const matchPreference = row?.email_new_matches ?? masterFundingConsent;
  const deadlinePreference = row?.email_deadline_alerts ?? masterFundingConsent;
  return {
    emailNewMatches: masterFundingConsent && matchPreference,
    emailDeadlineAlerts: masterFundingConsent && deadlinePreference,
  };
}

export function fundingNotificationPreferenceMutation(preferences: FundingNotificationPreferences) {
  return {
    // Existing users already control the broad funding-email switch. Keep it in
    // sync with the two granular P0-C switches so Account and Funding Radar do
    // not disagree about consent.
    email_new_funding: preferences.emailNewMatches || preferences.emailDeadlineAlerts,
    email_new_matches: preferences.emailNewMatches,
    email_deadline_alerts: preferences.emailDeadlineAlerts,
  };
}

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
        .select("email_new_funding,email_new_matches,email_deadline_alerts")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return effectiveFundingNotificationPreferences(data as FundingPreferenceRow | null);
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
        ...fundingNotificationPreferenceMutation(preferences),
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: (_result, preferences) => {
      qc.setQueryData(fundingNotificationPreferenceKeys.detail(userId), preferences);
      // NotificationPrefsCard reads the same user_preferences row through the
      // legacy dashboard key. Refetch it so the broad funding switch cannot look
      // stale after a granular change.
      void qc.invalidateQueries({ queryKey: ["preferences", "me", userId] });
    },
  });
}
