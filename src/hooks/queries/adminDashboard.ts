import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin analytics data layer. Every read throws on `error` so the dashboard can
 * render <ErrorState onRetry={refetch} /> — never a silent empty state on failure.
 *
 * Server contract (typed in the generated Supabase client):
 *   - admin_dashboard_stats() -> Json object of named counters
 *   - admin_timeseries(_metric, _days) -> { day: string; count: number }[]
 */

/** All admin_dashboard_stats counters coerced to numbers, keyed loosely. */
export type AdminStats = Record<string, number>;

export interface TimeseriesPoint {
  /** ISO date (YYYY-MM-DD) for the bucket. */
  day: string;
  count: number;
}

export interface SectorCount {
  sector: string;
  count: number;
}

export const adminDashboardKeys = {
  all: ["admin", "dashboard"] as const,
  stats: () => [...adminDashboardKeys.all, "stats"] as const,
  timeseries: (metric: string, days: number) =>
    [...adminDashboardKeys.all, "timeseries", metric, days] as const,
  sectors: (topN: number) => [...adminDashboardKeys.all, "sectors", topN] as const,
};

/** Defensive numeric coercion — RPC JSON may return counts as strings. */
function toNumber(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

/** KPI counters from the admin_dashboard_stats() RPC. */
export function useAdminStats(): UseQueryResult<AdminStats> {
  return useQuery({
    queryKey: adminDashboardKeys.stats(),
    staleTime: 60_000,
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc("admin_dashboard_stats");
      if (error) throw error;
      const raw = (data ?? {}) as Record<string, unknown>;
      const out: AdminStats = {};
      for (const [key, value] of Object.entries(raw)) {
        out[key] = toNumber(value);
      }
      return out;
    },
  });
}

/** Daily bucket series for a metric over the trailing `days` window. */
export function useAdminTimeseries(
  metric: string,
  days = 30,
): UseQueryResult<TimeseriesPoint[]> {
  return useQuery({
    queryKey: adminDashboardKeys.timeseries(metric, days),
    staleTime: 60_000,
    queryFn: async (): Promise<TimeseriesPoint[]> => {
      const { data, error } = await supabase.rpc("admin_timeseries", {
        _metric: metric,
        _days: days,
      });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        day: row.day,
        count: toNumber(row.count),
      }));
    },
  });
}

/** Top-N directory sectors, aggregated client-side from the profiles table. */
export function useProfilesBySector(topN = 6): UseQueryResult<SectorCount[]> {
  return useQuery({
    queryKey: adminDashboardKeys.sectors(topN),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SectorCount[]> => {
      const { data, error } = await supabase.from("profiles").select("sector");
      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        const sector = (row.sector ?? "").trim() || "Uncategorized";
        counts.set(sector, (counts.get(sector) ?? 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
    },
  });
}
