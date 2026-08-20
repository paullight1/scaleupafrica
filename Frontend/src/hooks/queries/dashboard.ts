import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { useApiFor } from "@/lib/api/flags";
import { getMyProfile } from "@/lib/api/profiles";
import { getMySubscription } from "@/lib/api/subscriptions";
import { listCuratedFunding } from "@/lib/api/funding";
import type {
  FundingOpportunity,
  FundingTeaser,
  Profile,
  SavedOpportunityWithFunding,
  Subscription,
  UserPreferences,
} from "@/lib/dashboard/types";

/**
 * Dashboard data layer (plan 03 §2). Calls the Supabase client directly for now;
 * plan 07 (Wave 4) rewires these behind the NestJS API using the same query keys
 * and return types. Every read throws on `error` so consumers can render
 * <ErrorState> — never an empty/paywall state on failure (IMPROVEMENTS §2.1).
 *
 * `saved_opportunities` and `user_preferences` are added by
 * 20260720160000_dashboard_tables.sql. Until the generated Supabase types are
 * regenerated (a manual post-migration step — see HANDOFF.md), those two tables
 * are unknown to the typed client, so we access them through this narrow escape
 * hatch. Everything else stays fully typed.
 */
type UntypedResult = { data: unknown; error: { message: string } | null };

/**
 * Minimal stand-in for the PostgREST query builder: every method returns another
 * builder, and awaiting one yields `{ data, error }`. `data` is `unknown`, so each
 * call site still has to assert the row shape it expects — which is the point, and
 * what a plain `any` would have quietly skipped.
 */
interface UntypedQuery extends PromiseLike<UntypedResult> {
  select(columns?: string): UntypedQuery;
  insert(values: Record<string, unknown>): UntypedQuery;
  upsert(values: Record<string, unknown>, options?: { onConflict?: string }): UntypedQuery;
  delete(): UntypedQuery;
  eq(column: string, value: unknown): UntypedQuery;
  order(column: string, options?: { ascending?: boolean }): UntypedQuery;
  maybeSingle(): UntypedQuery;
}

const untypedDb = supabase as unknown as {
  from: (table: string) => UntypedQuery;
};

// ---------------------------------------------------------------------------
// Query keys — centralized so plan 05/06/07 invalidate consistently.
// ---------------------------------------------------------------------------
export const qk = {
  myProfile: (uid: string) => ["profile", "me", uid] as const,
  mySubscription: (uid: string) => ["subscription", "me", uid] as const,
  fundingFeed: () => ["funding", "feed"] as const,
  fundingTeaser: () => ["funding", "teaser"] as const,
  savedOpps: (uid: string) => ["funding", "saved", uid] as const,
  myPreferences: (uid: string) => ["preferences", "me", uid] as const,
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export function useMyProfile(): UseQueryResult<Profile | null> {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const viaApi = useApiFor("profiles");
  return useQuery({
    queryKey: qk.myProfile(uid),
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Profile | null> => {
      if (viaApi) {
        return (await getMyProfile()) as unknown as Profile | null;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useSetProfileVisibility() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { profileId: string; status: "active" | "hidden" }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: vars.status })
        .eq("id", vars.profileId)
        .eq("user_id", uid);
      if (error) throw error;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: qk.myProfile(uid) });
      const prev = qc.getQueryData<Profile | null>(qk.myProfile(uid));
      if (prev) {
        qc.setQueryData<Profile | null>(qk.myProfile(uid), { ...prev, status: vars.status });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(qk.myProfile(uid), ctx.prev);
      toast.error("Couldn't update visibility. Please try again.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.myProfile(uid) });
    },
  });
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------
export function useMySubscription(): UseQueryResult<Subscription | null> {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const viaApi = useApiFor("subscriptions");
  return useQuery({
    queryKey: qk.mySubscription(uid),
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Subscription | null> => {
      if (viaApi) {
        const dto = await getMySubscription();
        return {
          has_access: dto.hasAccess,
          expires_at: dto.expiresAt,
          created_at: null,
        } as unknown as Subscription;
      }
      const { data, error } = await supabase
        .from("subscriptions")
        .select("has_access, expires_at, created_at")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

// ---------------------------------------------------------------------------
// Funding feed (public — shared key with plan 05's /funding page)
// ---------------------------------------------------------------------------
export function useFundingFeed(): UseQueryResult<FundingOpportunity[]> {
  const viaApi = useApiFor("funding");
  return useQuery({
    queryKey: qk.fundingFeed(),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<FundingOpportunity[]> => {
      if (viaApi) {
        const rows = await listCuratedFunding();
        return rows.map((r) => ({
          id: r.id,
          title: r.title,
          funder: r.funder,
          type: r.type,
          summary: r.summary,
          amount: r.amount,
          opens: r.opens,
          deadline: r.deadline,
          eligibility: r.eligibility,
          url: r.url,
          tags: r.tags,
          country_focus: r.countryFocus,
          featured: r.featured,
          last_verified_at: r.lastVerifiedAt,
          details: r.details,
          status: "published",
        })) as unknown as FundingOpportunity[];
      }
      const { data, error } = await supabase
        .from("funding_opportunities")
        .select("*")
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as FundingOpportunity[];
    },
  });
}

// ---------------------------------------------------------------------------
// Funding teaser (signed-in NON-members)
// ---------------------------------------------------------------------------
/**
 * RLS hides every `funding_opportunities` row from a non-member, so the feed
 * query above returns an empty array for them — which used to render as "the
 * curated feed is being prepared", i.e. we told prospects the product was
 * broken instead of paid. This reads the `funding_teaser` RPC
 * (20260802120000) instead: a few real rows with the advertising columns only.
 *
 * Pass `enabled: false` for members — they get the real feed and must never pay
 * for a redundant round-trip. The RPC is not in the generated types (it post-
 * dates the last regeneration), hence the narrow cast.
 */
export function useFundingTeaser(enabled: boolean): UseQueryResult<FundingTeaser> {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.fundingTeaser(),
    enabled: enabled && !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<FundingTeaser> => {
      const rpc = (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      }).rpc;
      const { data, error } = await rpc("funding_teaser", { _limit: 3 });
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        id: string;
        title: string;
        funder: string;
        type: string | null;
        deadline: string | null;
        total_published: number | string;
      }>;

      return {
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          funder: r.funder,
          type: r.type,
          deadline: r.deadline,
        })),
        // Postgres BIGINT arrives as a string over PostgREST. Coerce once, here,
        // so no consumer ever renders "18" + 1 === "181".
        totalPublished: rows.length ? Number(rows[0].total_published) : 0,
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Saved opportunities
// ---------------------------------------------------------------------------
export function useSavedOpportunities(): UseQueryResult<SavedOpportunityWithFunding[]> {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  return useQuery({
    queryKey: qk.savedOpps(uid),
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<SavedOpportunityWithFunding[]> => {
      const { data, error } = await untypedDb
        .from("saved_opportunities")
        .select("id, user_id, opportunity_id, created_at, funding_opportunities(*)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedOpportunityWithFunding[];
    },
  });
}

export function useSaveOpportunity() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (opportunityId: string) => {
      const { error } = await untypedDb
        .from("saved_opportunities")
        .insert({ user_id: uid, opportunity_id: opportunityId });
      if (error) throw error;
    },
    onError: () => toast.error("Couldn't save that opportunity. Please try again."),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.savedOpps(uid) });
      toast.success("Saved");
    },
  });
}

export function useUnsaveOpportunity() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (savedId: string) => {
      const { error } = await untypedDb.from("saved_opportunities").delete().eq("id", savedId);
      if (error) throw error;
    },
    onMutate: async (savedId: string) => {
      await qc.cancelQueries({ queryKey: qk.savedOpps(uid) });
      const prev = qc.getQueryData<SavedOpportunityWithFunding[]>(qk.savedOpps(uid));
      qc.setQueryData<SavedOpportunityWithFunding[]>(
        qk.savedOpps(uid),
        (old) => (old ?? []).filter((s) => s.id !== savedId),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.savedOpps(uid), ctx.prev);
      toast.error("Couldn't remove that. Please try again.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.savedOpps(uid) }),
  });
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------
export function useMyPreferences(): UseQueryResult<UserPreferences | null> {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  return useQuery({
    queryKey: qk.myPreferences(uid),
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<UserPreferences | null> => {
      const { data, error } = await untypedDb
        .from("user_preferences")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as UserPreferences | null;
    },
  });
}

export function useUpdatePreferences() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Omit<UserPreferences, "user_id">>) => {
      const { error } = await untypedDb
        .from("user_preferences")
        .upsert({ user_id: uid, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.myPreferences(uid) });
      const prev = qc.getQueryData<UserPreferences | null>(qk.myPreferences(uid));
      const base: UserPreferences =
        prev ?? {
          user_id: uid,
          email_new_funding: true,
          email_product_updates: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      qc.setQueryData<UserPreferences | null>(qk.myPreferences(uid), { ...base, ...patch });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(qk.myPreferences(uid), ctx.prev);
      toast.error("Couldn't save your preference. Please try again.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.myPreferences(uid) }),
  });
}
