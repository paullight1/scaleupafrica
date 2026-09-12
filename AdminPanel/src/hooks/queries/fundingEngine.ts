import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fundingEngineApi } from "@/lib/fundingEngineApi";

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
export function useFundingEngineRuns() {
  return useQuery({ queryKey: fundingEngineKeys.runs, queryFn: fundingEngineApi.runs, refetchInterval: 10_000, retry: 1 });
}
export function useFundingEngineOpportunities() {
  return useQuery({
    queryKey: fundingEngineKeys.opportunities,
    queryFn: fundingEngineApi.opportunities,
    refetchInterval: 30_000,
    retry: 1,
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
