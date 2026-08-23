import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@shared/integrations/supabase/client";

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

export interface ReportingSummary {
  periodDays: number;
  audience: Record<string, number>;
  content: Record<string, number>;
  revenue: {
    byCurrency: Record<string, number>;
    byPlan: Array<{ planCode: string; currency: string; amount: number; payments: number }>;
    successfulPayments: number;
    failedPayments: number;
  };
  operations: Record<string, number>;
}

export interface ContentPerformanceRow {
  contentId: string;
  contentType: string;
  title: string;
  status: string;
  views: number;
  downloads: number;
  totalEngagement: number;
}

export const adminDashboardKeys = {
  all: ["admin", "dashboard"] as const,
  stats: () => [...adminDashboardKeys.all, "stats"] as const,
  timeseries: (metric: string, days: number) =>
    [...adminDashboardKeys.all, "timeseries", metric, days] as const,
  sectors: (topN: number) => [...adminDashboardKeys.all, "sectors", topN] as const,
  reporting: (days: number) => [...adminDashboardKeys.all, "reporting", days] as const,
  contentPerformance: (days: number, limit: number) =>
    [...adminDashboardKeys.all, "content-performance", days, limit] as const,
};

/** Defensive numeric coercion — RPC JSON may return counts as strings. */
function toNumber(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

function numericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toNumber(item)]));
}

export function useAdminReportingSummary(days: number): UseQueryResult<ReportingSummary> {
  const boundedDays = Math.max(1, Math.min(days, 365));
  return useQuery({
    queryKey: adminDashboardKeys.reporting(boundedDays),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_reporting_summary", { _days: boundedDays });
      if (error) throw error;
      const raw = (data ?? {}) as Record<string, unknown>;
      const revenue = (raw.revenue ?? {}) as Record<string, unknown>;
      const plans = Array.isArray(revenue.by_plan) ? revenue.by_plan : [];
      return {
        periodDays: toNumber(raw.period_days) || boundedDays,
        audience: numericRecord(raw.audience),
        content: numericRecord(raw.content),
        revenue: {
          byCurrency: numericRecord(revenue.by_currency),
          byPlan: plans.map((item) => {
            const row = item as Record<string, unknown>;
            return { planCode: String(row.plan_code ?? "Unknown"), currency: String(row.currency ?? ""), amount: toNumber(row.amount), payments: toNumber(row.payments) };
          }),
          successfulPayments: toNumber(revenue.successful_payments),
          failedPayments: toNumber(revenue.failed_payments),
        },
        operations: numericRecord(raw.operations),
      };
    },
  });
}

export function useAdminContentPerformance(days: number, limit = 10): UseQueryResult<ContentPerformanceRow[]> {
  const boundedDays = Math.max(1, Math.min(days, 365));
  const boundedLimit = Math.max(1, Math.min(limit, 50));
  return useQuery({
    queryKey: adminDashboardKeys.contentPerformance(boundedDays, boundedLimit),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_content_performance", { _days: boundedDays, _limit: boundedLimit });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        contentId: row.content_id,
        contentType: row.content_type,
        title: row.title,
        status: row.status,
        views: toNumber(row.views),
        downloads: toNumber(row.downloads),
        totalEngagement: toNumber(row.total_engagement),
      }));
    },
  });
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
