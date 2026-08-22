import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@shared/integrations/supabase/client";
import type { Json, Tables } from "@shared/integrations/supabase/types";
import { logAdminAction } from "@shared/lib/audit";

const db = supabase as unknown as SupabaseClient;

function errMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return lines.join("\r\n");
}
export function downloadCsv(filename: string, content: string): void {
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

export type FundingStatus = "draft" | "published" | "archived";
export type FundingSource = "manual" | "ai";
export type FundingVerificationStatus = "verified" | "stale" | "unverified";
export type FundingApplicationStatus = "open" | "closing_soon" | "rolling" | "upcoming" | "closed" | "paused" | "unknown";

export type FundingRow = Tables<"funding_opportunities"> & {
  details: Json | null;
  source: FundingSource | null;
  batch_id: string | null;
  last_verified_at: string | null;
  verified_by: string | null;
  source_url: string | null;
  source_name: string | null;
  verification_status: FundingVerificationStatus;
  application_status: FundingApplicationStatus;
  status_checked_at: string | null;
  status_evidence_url: string | null;
  opens_at: string | null;
  deadline_at: string | null;
  deadline_timezone: string | null;
  deadline_status: "confirmed" | "rolling" | "unknown";
  current_cycle_label: string | null;
  application_url: string | null;
};

export type FundingFilters = { status: string; source: string; q: string };
export type FundingFormPayload = {
  title: string; funder: string; type: string | null; summary: string | null; amount: string | null;
  opens: string | null; deadline: string | null; eligibility: string | null; url: string | null;
  tags: string[]; country_focus: string[]; status: FundingStatus; featured: boolean;
};

export const fundingOpsKeys = {
  all: ["admin", "funding"] as const,
  list: (f: FundingFilters) => ["admin", "funding", "list", f] as const,
};

const FUNDING_COLUMNS =
  "id, title, funder, type, summary, amount, opens, deadline, eligibility, url, tags, country_focus, status, featured, created_at, updated_at, details, source, batch_id, last_verified_at, verified_by, source_url, source_name, verification_status, application_status, status_checked_at, status_evidence_url, opens_at, deadline_at, deadline_timezone, deadline_status, current_cycle_label, application_url";

export function useAdminFunding(filters: FundingFilters) {
  return useQuery<FundingRow[]>({
    queryKey: fundingOpsKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await db.from("funding_opportunities").select(FUNDING_COLUMNS).order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as FundingRow[];
      const term = filters.q.trim().toLowerCase();
      return rows.filter((r) => {
        if (filters.status !== "all" && r.status !== filters.status) return false;
        if (filters.source !== "all" && (r.source ?? "manual") !== filters.source) return false;
        if (term && !`${r.title} ${r.funder}`.toLowerCase().includes(term)) return false;
        return true;
      });
    },
  });
}

export function useSaveFunding() {
  const qc = useQueryClient();
  return useMutation<FundingRow, Error, { id?: string; values: FundingFormPayload }>({
    mutationFn: async ({ id, values }) => {
      if (id) {
        const { data, error } = await db.from("funding_opportunities").update(values).eq("id", id).select(FUNDING_COLUMNS).single();
        if (error) throw error;
        return data as FundingRow;
      }
      const { data, error } = await db.from("funding_opportunities").insert({ ...values, source: "manual" }).select(FUNDING_COLUMNS).single();
      if (error) throw error;
      return data as FundingRow;
    },
    onSuccess: (row, { id }) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction(id ? "update_funding" : "create_funding", { entityType: "funding_opportunity", entityId: row.id, details: { title: row.title, funder: row.funder, status: row.status } });
      toast.success(id ? "Opportunity updated" : "Opportunity created");
    },
    onError: (e) => toast.error(errMessage(e, "Could not save opportunity")),
  });
}

export function useSetFundingStatus() {
  const qc = useQueryClient();
  return useMutation<void, Error, { row: FundingRow; status: FundingStatus }>({
    mutationFn: async ({ row, status }) => { const { error } = await db.from("funding_opportunities").update({ status }).eq("id", row.id); if (error) throw error; },
    onSuccess: (_res, { row, status }) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction("set_funding_status", { entityType: "funding_opportunity", entityId: row.id, details: { status, title: row.title } });
      toast.success(status === "published" ? "Published" : status === "archived" ? "Archived" : "Moved to draft");
    },
    onError: (e) => toast.error(errMessage(e, "Could not update status")),
  });
}

export function useToggleFundingFeatured() {
  const qc = useQueryClient();
  return useMutation<void, Error, { row: FundingRow; featured: boolean }>({
    mutationFn: async ({ row, featured }) => { const { error } = await db.from("funding_opportunities").update({ featured }).eq("id", row.id); if (error) throw error; },
    onSuccess: (_res, { row, featured }) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction("toggle_funding_featured", { entityType: "funding_opportunity", entityId: row.id, details: { featured, title: row.title } });
      toast.success(featured ? "Marked as featured" : "Removed from featured");
    },
    onError: (e) => toast.error(errMessage(e, "Could not update featured state")),
  });
}

export function useVerifyFunding() {
  const qc = useQueryClient();
  return useMutation<void, Error, { row: FundingRow; verifiedBy: string }>({
    mutationFn: async ({ row, verifiedBy }) => {
      const { error } = await db.from("funding_opportunities").update({ last_verified_at: new Date().toISOString(), verified_by: verifiedBy }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_res, { row }) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction("verify_funding", { entityType: "funding_opportunity", entityId: row.id, details: { title: row.title } });
      toast.success("Marked as verified");
    },
    onError: (e) => toast.error(errMessage(e, "Could not mark as verified")),
  });
}

export function useDeleteFunding() {
  const qc = useQueryClient();
  return useMutation<void, Error, FundingRow>({
    mutationFn: async (row) => { const { error } = await db.from("funding_opportunities").delete().eq("id", row.id); if (error) throw error; },
    onSuccess: (_res, row) => {
      qc.invalidateQueries({ queryKey: fundingOpsKeys.all });
      void logAdminAction("delete_funding", { entityType: "funding_opportunity", entityId: row.id, details: { title: row.title, funder: row.funder } });
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
export type LeadFilters = { status: string; source: string; q: string };
export const leadKeys = { all: ["admin", "leads"] as const, list: (f: LeadFilters) => ["admin", "leads", "list", f] as const };

export function useAdminLeads(filters: LeadFilters) {
  return useQuery<LeadRow[]>({
    queryKey: leadKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const term = filters.q.trim().toLowerCase();
      return rows.filter((r) => {
        if (filters.status !== "all" && r.status !== filters.status) return false;
        if (filters.source !== "all" && r.source !== filters.source) return false;
        if (term && !`${r.email} ${r.name ?? ""}`.toLowerCase().includes(term)) return false;
        return true;
      });
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation<void, Error, { row: LeadRow; status: LeadStatus }>({
    mutationFn: async ({ row, status }) => { const { error } = await supabase.from("leads").update({ status }).eq("id", row.id); if (error) throw error; },
    onSuccess: (_res, { row, status }) => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      void logAdminAction("update_lead_status", { entityType: "lead", entityId: row.id, details: { status, email: row.email } });
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
export type SubscriberFilters = { status: string; q: string };
export const subscriberKeys = { all: ["admin", "newsletter"] as const, list: (f: SubscriberFilters) => ["admin", "newsletter", "list", f] as const };

export function useAdminSubscribers(filters: SubscriberFilters) {
  return useQuery<SubscriberRow[]>({
    queryKey: subscriberKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
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
    mutationFn: async ({ row, status }) => { const { error } = await supabase.from("newsletter_subscribers").update({ status }).eq("id", row.id); if (error) throw error; },
    onSuccess: (_res, { row, status }) => {
      qc.invalidateQueries({ queryKey: subscriberKeys.all });
      void logAdminAction("update_subscriber_status", { entityType: "newsletter_subscriber", entityId: row.id, details: { status, email: row.email } });
      toast.success(status === "subscribed" ? "Subscriber restored" : "Subscriber unsubscribed");
    },
    onError: (e) => toast.error(errMessage(e, "Could not update subscriber")),
  });
}

/* ================================================================== *
 * Site settings + audit log
 * ================================================================== */

export type SiteSettingRow = Tables<"site_settings">;
export const settingsKeys = { all: ["admin", "settings"] as const };
export function useSiteSettings() { return useQuery<SiteSettingRow[]>({ queryKey: settingsKeys.all, queryFn: async () => { const { data, error } = await supabase.from("site_settings").select("*").order("key"); if (error) throw error; return data ?? []; } }); }
export function useSaveSiteSetting() { const qc=useQueryClient(); return useMutation<void,Error,{key:string;value:Json}>({ mutationFn:async({key,value})=>{const{error}=await supabase.from("site_settings").upsert({key,value},{onConflict:"key"});if(error)throw error;},onSuccess:(_r,{key})=>{qc.invalidateQueries({queryKey:settingsKeys.all});void logAdminAction("update_site_setting",{entityType:"site_setting",entityId:key});toast.success("Setting saved");},onError:(e)=>toast.error(errMessage(e,"Could not save setting"))});}

export type AuditLogRow = Tables<"admin_audit_log">;
export function useAuditLog() { return useQuery<AuditLogRow[]>({ queryKey:["admin","audit"], queryFn:async()=>{const{data,error}=await supabase.from("admin_audit_log").select("*").order("created_at",{ascending:false}).limit(500);if(error)throw error;return data??[];} }); }