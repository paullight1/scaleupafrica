import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { trackEvent, type AnalyticsEventType } from "@shared/lib/analytics";

const db = supabase as unknown as SupabaseClient;

export const MEMBER_OPPORTUNITY_STATES = [
  "saved",
  "preparing",
  "applied",
  "won",
  "rejected",
  "dismissed",
] as const;
export type MemberOpportunityStateName = (typeof MEMBER_OPPORTUNITY_STATES)[number];

export interface MemberOpportunityState {
  userId: string;
  opportunityId: string;
  state: MemberOpportunityStateName;
  note: string | null;
  appliedAt: string | null;
  updatedAt: string;
}

export interface SetMemberOpportunityStateInput {
  opportunityId: string;
  state: MemberOpportunityStateName;
  note?: string | null;
}

export const memberOpportunityStateKeys = {
  all: (userId: string | undefined) => ["funding", "member-state", userId] as const,
};

/**
 * `applied_at` records when the member first marks an application as submitted.
 * Later workflow states deliberately omit the column so an upsert cannot replace
 * that original timestamp (or clear it when a member moves through other states).
 */
export function buildMemberOpportunityMutation(
  input: SetMemberOpportunityStateInput,
  now = new Date(),
) {
  return {
    opportunity_id: input.opportunityId,
    state: input.state,
    note: input.note?.trim().slice(0, 2000) || null,
    ...(input.state === "applied" ? { applied_at: now.toISOString() } : {}),
    updated_at: now.toISOString(),
  };
}

export function analyticsEventForMemberState(state: MemberOpportunityStateName): AnalyticsEventType | null {
  switch (state) {
    case "saved": return "recommendation_save";
    case "applied": return "application_submitted";
    case "won": return "application_won";
    case "rejected": return "application_rejected";
    case "dismissed": return "recommendation_not_relevant";
    default: return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseMemberOpportunityState(value: unknown): MemberOpportunityState {
  const row = isRecord(value) ? value : {};
  const state = MEMBER_OPPORTUNITY_STATES.includes(row.state as MemberOpportunityStateName)
    ? row.state as MemberOpportunityStateName
    : "saved";
  return {
    userId: String(row.user_id ?? ""),
    opportunityId: String(row.opportunity_id ?? ""),
    state,
    note: typeof row.note === "string" ? row.note : null,
    appliedAt: typeof row.applied_at === "string" ? row.applied_at : null,
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function useMemberOpportunityStates() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery<MemberOpportunityState[]>({
    queryKey: memberOpportunityStateKeys.all(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("member_opportunity_state")
        .select("user_id,opportunity_id,state,note,applied_at,updated_at")
        .eq("user_id", userId as string)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (Array.isArray(data) ? data : []).map(parseMemberOpportunityState);
    },
  });
}

export function useSetMemberOpportunityState() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  return useMutation<MemberOpportunityState, Error, SetMemberOpportunityStateInput>({
    mutationFn: async (input) => {
      if (!userId) throw new Error("Sign in to update your funding workflow.");
      const mutation = buildMemberOpportunityMutation(input);
      const { data, error } = await db
        .from("member_opportunity_state")
        .upsert({ user_id: userId, ...mutation }, { onConflict: "user_id,opportunity_id" })
        .select("user_id,opportunity_id,state,note,applied_at,updated_at")
        .single();
      if (error) throw error;
      return parseMemberOpportunityState(data);
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: memberOpportunityStateKeys.all(userId) });
      const event = analyticsEventForMemberState(row.state);
      if (event) {
        void trackEvent(event, {
          entityType: "funding_opportunity",
          entityId: row.opportunityId,
          metadata: { workflow_state: row.state },
        });
      }
    },
  });
}
