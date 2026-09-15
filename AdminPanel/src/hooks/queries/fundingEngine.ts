import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@shared/integrations/supabase/client";
import { fundingEngineApi } from "@/lib/fundingEngineApi";
import { buildFundingImportPayload } from "@/lib/fundingEngineImport";
import type { EngineGrant } from "@/lib/fundingEngineApi";

const db = supabase as unknown as SupabaseClient;

export const fundingEngineKeys = {
  all: ["admin", "funding-engine"] as const,
  status: ["admin", "funding-engine", "status"] as const,
  sources: ["admin", "funding-engine", "sources"] as const,
  runs: ["admin", "funding-engine", "runs"] as const,
  opportunities: ["admin", "funding-engine", "opportunities"] as const,
};

export function useFundingEngineStatus() {
  return useQuery({ queryKey: fundingEngineKeys.status, queryFn: fundingEngineApi.status, refetchInterval: 30_000, retry: 1 });
}
export function useFundingEngineSources() {
  return useQuery({ queryKey: fundingEngineKeys.sources, queryFn: fundingEngineApi.sources, retry: 1 });
}
export function useAddFundingEngineSource() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof fundingEngineApi.addSource>[0]) => {
      const result = await fundingEngineApi.addSource(input);
      if (!result.success) throw new Error(result.error || "The source could not be added.");
      return result;
    },
    onSuccess: () => {
      toast.success("Engine source added");
      void client.invalidateQueries({ queryKey: fundingEngineKeys.sources });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "The source could not be added."),
  });
}
export function useFundingEngineRuns() {
  return useQuery({ queryKey: fundingEngineKeys.runs, queryFn: fundingEngineApi.runs, refetchInterval: 4_000, retry: 1 });
}
export function useFundingEngineOpportunities() {
  return useQuery({
    queryKey: fundingEngineKeys.opportunities,
    queryFn: fundingEngineApi.opportunities,
    refetchInterval: 30_000,
    retry: 1,
  });
}

export type FundingEngineImportResult = {
  imported: number;
  duplicates: number;
  titles: string[];
  importedIds: string[];
};

export function useImportFundingEngineGrants() {
  const client = useQueryClient();
  return useMutation<FundingEngineImportResult, Error, EngineGrant[]>({
    mutationFn: async (grants) => {
      let imported = 0;
      let duplicates = 0;
      const titles: string[] = [];
      const importedIds: string[] = [];
      const pendingPayloads = [] as ReturnType<typeof buildFundingImportPayload>[];

      for (const grant of grants) {
        const payload = buildFundingImportPayload(grant);
        if (!payload.title) continue;

        let existing: { id: string } | null = null;
        const { data: existingByEdutuId, error: idLookupError } = await db
          .from("funding_opportunities")
          .select("id")
          .eq("details->>edutu_opportunity_id", grant.id)
          .limit(1)
          .maybeSingle();
        if (idLookupError) throw idLookupError;
        existing = existingByEdutuId;
        if (!existing && payload.url) {
          const { data, error: lookupError } = await db
            .from("funding_opportunities")
            .select("id")
            .eq("url", payload.url)
            .limit(1)
            .maybeSingle();
          if (lookupError) throw lookupError;
          existing = data;
        }
        if (!existing && !payload.url && payload.source_url) {
          const { data, error: lookupError } = await db
            .from("funding_opportunities")
            .select("id")
            .eq("source_url", payload.source_url)
            .limit(1)
            .maybeSingle();
          if (lookupError) throw lookupError;
          existing = data;
        }
        if (existing) {
          duplicates += 1;
          continue;
        }

        pendingPayloads.push(payload);
        titles.push(payload.title);
        importedIds.push(grant.id);
      }

      if (pendingPayloads.length > 0) {
        const { error: insertError } = await db.from("funding_opportunities").insert(pendingPayloads);
        if (insertError) throw insertError;
        imported = pendingPayloads.length;
      }

      return { imported, duplicates, titles, importedIds };
    },
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["admin", "funding"] });
      if (result.imported > 0) {
        toast.success(`${result.imported} opportunity${result.imported === 1 ? "" : "ies"} imported as draft${result.imported === 1 ? "" : "s"}`);
      } else if (result.duplicates > 0) {
        toast.info("Those opportunities are already in Cresciva.");
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not import Edutu opportunities."),
  });
}
export function useStartFundingEngineRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof fundingEngineApi.startRun>[0]) => {
      const result = await fundingEngineApi.startRun(input);
      if (!result.success) throw new Error(result.error || "The run could not be started.");
      return result;
    },
    onSuccess: () => {
      toast.success("Opportunity discovery started");
      void client.invalidateQueries({ queryKey: fundingEngineKeys.all });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "The run could not be started."),
  });
}
