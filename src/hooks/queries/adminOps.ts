import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { logAdminAction } from "@/lib/audit";

/**
 * Shared data layer for the Admin Operations modules: curated Funding, Leads,
 * Newsletter, Site Settings and the Audit Log. All server reads/writes go
 * through TanStack Query per FOUNDATION §4; mutations toast, invalidate and
 * record an entry to the audit log.
 *
 * `funding_opportunities` gained verification columns (`details`, `source`,
 * `batch_id`, `last_verified_at`, `verified_by`) in a later migration that is
 * not yet reflected in the generated `src/integrations/supabase/types.ts`.
 * Following the convention in `src/hooks/queries/directory.ts`, we read/write
 * those columns through a loosely-typed client alias so this module type-checks
 * without hand-editing the generated types file.
 */
const db = supabase as unknown as SupabaseClient;

function errMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/* ------------------------------------------------------------------ *
 * CSV export helper (client-side)
 * ------------------------------------------------------------------ */

/** Escape a single CSV cell (RFC-4180: wrap in quotes, double embedded quotes). */
export function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string from a header row + data rows. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return lines.join("\r\n");
}

/** Trigger a client-side download of `content` as `filename`. */
export function downloadCsv(filename: string, content: string): void {
  // Prepend a UTF-8 BOM so spreadsheet apps read non-ASCII correctly.
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ================================================================== *
 * Funding opportunities
 * ================================================================== */

export type FundingStatus = "draft" | "published" | "archived";
export type FundingSource = "manual" | "ai";

/** Base typed columns plus the untyped verification columns. */
export type FundingRow = Tables<"funding_opportunities"> & {
  details: Json | null;
  source: FundingSource | null;
  batch_id: string | null;
  last_verified_at: string | null;
  verified_by: string | null;
};

export type FundingFilters = {
  status: string; // "all" | FundingStatus
  source: string; // "all" | FundingSource
  q: string;
};

/** Values collected by the create/edit dialog form. */
export type FundingFormPayload = {
  title: string;
  funder: string;
  type: string | null;
  summary: string | null;
  amount: string | null;
  opens: string | null;
  deadline: string | null;
  eligibility: string | null;
  url: string | null;
  tags: string[];
  country_focus: string[];
  status: FundingStatus;
  featured: boolean;
};

export const fundingOpsKeys = {
  all: ["admin", "funding"] as const,
  list: (f: FundingFilters) => ["admin", "funding", "list", f] as const,
};

const FUNDING_COLUMNS =
  "id, title, funder, type, summary, amount, opens, deadline, eligibility, url, tags, country_focus, status, featured, created_at, updated_at, details, source, batch_id, last_verified_at, verified_by";

export function useAdminFunding(filters: FundingFilters) {
  return useQuery<FundingRow[]>({
    queryKey: fundingOpsKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await db
        .from("funding_opportunities")
        .select(FUNDING_COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as FundingRow[];
      // Small admin dataset — filter client-side to keep a single cached query.
      const term = filters.q.trim().toLowerCase();
      return rows.filter((r) => {
        if (filters.status !== "all" && r.status !== filters.status) return false;
        if (filters.source !== "all" && (r.source ?? "manual") !== filters.source) return false;
        if (term) {
          const hay = `${r.title} ${r.funder}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      });
    },
  });
}

/** Create or update a curated funding opportunity from the dialog form. */
export function useSaveFunding() {
  const qc = useQueryClient();
  return useMutation<FundingRow, Error, { id?: string; values: FundingFormPayload }>({
    mutationFn: async ({ id, values }) => {
      if (id) {
        const { data, error } = await db
          .from("funding_opportunities")
          .update(values)
          .eq("id", id)
          .select(FUNDING_COLUMNS)
          .single();
        if (error) throw error;
        return data as FundingRow;
      }
      // New rows created here are manual (AI drafts arrive via the batch pipeline).
      const { data, error } = await db
        .from("funding_opportunities")
        .insert({ ...values, source: "manual" })
        .select(FUNDING_COLUMNS)
        .single();
      if (error) throw error;
      return data as FundingRow;
    },
    onSuccess: (row, { id }) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction(id ? "update_funding" : "create_funding", {
        entityType: "funding_opportunity",
        entityId: row.id,
        details: { title: row.title, funder: row.funder, status: row.status },
      });
      toast.success(id ? "Opportunity updated" : "Opportunity created");
    },
    onError: (e) => toast.error(errMessage(e, "Could not save opportunity")),
  });
}

/** Publish / unpublish (draft) a funding opportunity. */
export function useSetFundingStatus() {
  const qc = useQueryClient();
  return useMutation<void, Error, { row: FundingRow; status: FundingStatus }>({
    mutationFn: async ({ row, status }) => {
      const { error } = await db
        .from("funding_opportunities")
        .update({ status })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_res, { row, status }) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction("set_funding_status", {
        entityType: "funding_opportunity",
        entityId: row.id,
        details: { status, title: row.title },
      });
      const label =
        status === "published" ? "Published" : status === "archived" ? "Archived" : "Moved to draft";
      toast.success(label);
    },
    onError: (e) => toast.error(errMessage(e, "Could not update status")),
  });
}

/** Toggle the featured flag. */
export function useToggleFundingFeatured() {
  const qc = useQueryClient();
  return useMutation<void, Error, { row: FundingRow; featured: boolean }>({
    mutationFn: async ({ row, featured }) => {
      const { error } = await db
        .from("funding_opportunities")
        .update({ featured })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_res, { row, featured }) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction("toggle_funding_featured", {
        entityType: "funding_opportunity",
        entityId: row.id,
        details: { featured, title: row.title },
      });
      toast.success(featured ? "Marked as featured" : "Removed from featured");
    },
    onError: (e) => toast.error(errMessage(e, "Could not update featured state")),
  });
}

/** Stamp an opportunity as verified now, by the current admin. */
export function useVerifyFunding() {
  const qc = useQueryClient();
  return useMutation<void, Error, { row: FundingRow; verifiedBy: string }>({
    mutationFn: async ({ row, verifiedBy }) => {
      const { error } = await db
        .from("funding_opportunities")
        .update({ last_verified_at: new Date().toISOString(), verified_by: verifiedBy })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_res, { row }) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction("verify_funding", {
        entityType: "funding_opportunity",
        entityId: row.id,
        details: { title: row.title },
      });
      toast.success("Marked as verified");
    },
    onError: (e) => toast.error(errMessage(e, "Could not mark as verified")),
  });
}

/** Permanently delete a funding opportunity. */
export function useDeleteFunding() {
  const qc = useQueryClient();
  return useMutation<void, Error, FundingRow>({
    mutationFn: async (row) => {
      const { error } = await db.from("funding_opportunities").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_res, row) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction("delete_funding", {
        entityType: "funding_opportunity",
        entityId: row.id,
        details: { title: row.title, funder: row.funder },
      });
      toast.success("Opportunity deleted");
    },
    onError: (e) => toast.error(errMessage(e, "Could not delete opportunity")),
  });
}

/* ================================================================== *
 * Leads
 * ================================================================== */

export type LeadRow = Tables<"leads">;
export type LeadStatus = "new" | "contacted" | "archived";

export type LeadFilters = {
  status: string; // "all" | LeadStatus
  source: string; // "all" | source value
  q: string;
};

export const leadKeys = {
  all: ["admin", "leads"] as const,
  list: (f: LeadFilters) => ["admin", "leads", "list", f] as const,
};

export function useAdminLeads(filters: LeadFilters) {
  return useQuery<LeadRow[]>({
    queryKey: leadKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const term = filters.q.trim().toLowerCase();
      return rows.filter((r) => {
        if (filters.status !== "all" && r.status !== filters.status) return false;
        if (filters.source !== "all" && r.source !== filters.source) return false;
        if (term) {
          const hay = `${r.email} ${r.name ?? ""}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      });
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation<void, Error, { row: LeadRow; status: LeadStatus }>({
    mutationFn: async ({ row, status }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_res, { row, status }) => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      void logAdminAction("update_lead_status", {
        entityType: "lead",
        entityId: row.id,
        details: { status, email: row.email },
      });
      toast.success(status === "contacted" ? "Marked as contacted" : status === "archived" ? "Archived" : "Marked as new");
    },
    onError: (e) => toast.error(errMessage(e, "Could not update lead")),
  });
}

/* ================================================================== *
 * Newsletter subscribers
 * ================================================================== */

export type SubscriberRow = Tables<"newsletter_subscribers">;
export type SubscriberStatus = "subscribed" | "unsubscribed";

export type SubscriberFilters = {
  status: string; // "all" | SubscriberStatus
  q: string;
};

export const subscriberKeys = {
  all: ["admin", "newsletter"] as const,
  list: (f: SubscriberFilters) => ["admin", "newsletter", "list", f] as const,
};

export function useAdminSubscribers(filters: SubscriberFilters) {
  return useQuery<SubscriberRow[]>({
    queryKey: subscriberKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const term = filters.q.trim().toLowerCase();
      return rows.filter((r) => {
        if (filters.status !== "all" && r.status !== filters.status) return false;
        if (term && !r.email.toLowerCase().includes(term)) return false;
        return true;
      });
    },
  });
}

export function useUpdateSubscriberStatus() {
  const qc = useQueryClient();
  return useMutation<void, Error, { row: SubscriberRow; status: SubscriberStatus }>({
    mutationFn: async ({ row, status }) => {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .update({ status })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_res, { row, status }) => {
      qc.invalidateQueries({ queryKey: subscriberKeys.all });
      void logAdminAction("update_subscriber_status", {
        entityType: "newsletter_subscriber",
        entityId: row.id,
        details: { status, email: row.email },
      });
      toast.success(status === "subscribed" ? "Resubscribed" : "Unsubscribed");
    },
    onError: (e) => toast.error(errMessage(e, "Could not update subscriber")),
  });
}

/* ================================================================== *
 * Site settings
 * ================================================================== */

export type AnnouncementSetting = { enabled: boolean; message: string; link: string };
export type FeaturesSetting = { resources: boolean; blog: boolean; funding: boolean };

export const ANNOUNCEMENT_DEFAULT: AnnouncementSetting = { enabled: false, message: "", link: "" };
export const FEATURES_DEFAULT: FeaturesSetting = { resources: true, blog: true, funding: true };

export const settingsKeys = {
  all: ["admin", "settings"] as const,
};

/** Safely coerce a Json settings value into the announcement shape. */
export function readAnnouncement(value: Json | undefined | null): AnnouncementSetting {
  const v = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : ANNOUNCEMENT_DEFAULT.enabled,
    message: typeof v.message === "string" ? v.message : ANNOUNCEMENT_DEFAULT.message,
    link: typeof v.link === "string" ? v.link : ANNOUNCEMENT_DEFAULT.link,
  };
}

/** Safely coerce a Json settings value into the feature-flags shape. */
export function readFeatures(value: Json | undefined | null): FeaturesSetting {
  const v = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  return {
    resources: typeof v.resources === "boolean" ? v.resources : FEATURES_DEFAULT.resources,
    blog: typeof v.blog === "boolean" ? v.blog : FEATURES_DEFAULT.blog,
    funding: typeof v.funding === "boolean" ? v.funding : FEATURES_DEFAULT.funding,
  };
}

export type SettingsMap = Record<string, Json>;

/** Load all site_settings rows as a { key: value } map. */
export function useSiteSettings() {
  return useQuery<SettingsMap>({
    queryKey: settingsKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key,value");
      if (error) throw error;
      const map: SettingsMap = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return map;
    },
  });
}

/** Upsert a single settings key, stamping the current admin as `updated_by`. */
export function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation<void, Error, { key: string; value: Json; updatedBy: string | undefined }>({
    mutationFn: async ({ key, value, updatedBy }) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key, value, updated_by: updatedBy ?? null }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_res, { key }) => {
      qc.invalidateQueries({ queryKey: settingsKeys.all });
      void logAdminAction("update_settings", {
        entityType: "site_settings",
        entityId: key,
      });
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(errMessage(e, "Could not save settings")),
  });
}

/* ================================================================== *
 * Audit log
 * ================================================================== */

export type AuditRow = Tables<"admin_audit_log">;

export type AuditFilters = {
  entityType: string; // "all" | entity_type value
  q: string;
};

export const auditKeys = {
  all: ["admin", "audit"] as const,
  list: () => ["admin", "audit", "list"] as const,
};

/** Most recent audit entries (read-only), newest first. */
export function useAuditLog() {
  return useQuery<AuditRow[]>({
    queryKey: auditKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}
