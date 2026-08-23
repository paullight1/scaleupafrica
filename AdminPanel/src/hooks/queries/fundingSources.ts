import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@shared/integrations/supabase/client";
import { hasFundingStatusConflict, isStatusFresh } from "@shared/lib/fundingStatus";
import { logAdminAction } from "@shared/lib/audit";

const db = supabase as unknown as SupabaseClient;

export type ApplicationStatus = "open"|"closing_soon"|"rolling"|"upcoming"|"closed"|"paused"|"unknown";
export type VerificationStatus = "verified"|"stale"|"unverified";

export interface FundingSourceHealthOpportunity {
  id: string; title: string; funder: string; sourceUrl: string | null;
  verificationStatus: VerificationStatus; applicationStatus: ApplicationStatus;
  statusCheckedAt: string | null; lastError: string | null; lastSuccessAt: string | null;
  consecutiveFailures: number; due: boolean; conflict: boolean;
}
export interface FundingSourceRow {
  id: string; name: string; baseUrl: string; active: boolean;
  lastCheckedAt: string | null; lastSuccessAt: string | null; lastError: string | null;
}
export interface FundingSourceCheckRow {
  id: string; opportunityId: string; sourceId: string | null; sourceUrl: string;
  checkedAt: string; classifiedStatus: ApplicationStatus; errorClass: string | null;
  extractedSignals: Record<string, unknown>;
}
export interface FundingSourceHealthData {
  opportunities: FundingSourceHealthOpportunity[];
  sources: FundingSourceRow[];
  recentChecks: FundingSourceCheckRow[];
}

export const fundingSourceKeys = { all: ["admin", "funding-sources"] as const, health: ["admin", "funding-sources", "health"] as const };
function normalizeApplicationStatus(value: unknown): ApplicationStatus { return value === "open" || value === "closing_soon" || value === "rolling" || value === "upcoming" || value === "closed" || value === "paused" ? value : "unknown"; }
function normalizeVerificationStatus(value: unknown): VerificationStatus { return value === "verified" || value === "stale" ? value : "unverified"; }
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function nullableText(value: unknown): string | null { const valueText = text(value).trim(); return valueText || null; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function hasConflict(signals: Record<string, unknown>): boolean {
  return hasFundingStatusConflict({
    explicitOpen: Boolean(nullableText(signals.explicit_open_text)),
    explicitClosed: Boolean(nullableText(signals.explicit_closed_text)),
    explicitPaused: Boolean(nullableText(signals.explicit_paused_text)),
    explicitRolling: Boolean(nullableText(signals.rolling_text)),
  });
}

export function useFundingSourceHealth() {
  return useQuery<FundingSourceHealthData>({
    queryKey: fundingSourceKeys.health,
    staleTime: 60_000,
    queryFn: async () => {
      const [oppsResult, sourcesResult, checksResult] = await Promise.all([
        db.from("funding_opportunities").select("id,title,funder,source_url,verification_status,application_status,status_checked_at").eq("status", "published").order("status_checked_at", { ascending: true, nullsFirst: true }).limit(250),
        db.from("funding_sources").select("id,name,base_url,active,last_checked_at,last_success_at,last_error").order("name", { ascending: true }).limit(250),
        db.from("funding_source_checks").select("id,opportunity_id,source_id,source_url,checked_at,classified_status,error_class,extracted_signals").order("checked_at", { ascending: false }).limit(500),
      ]);
      if (oppsResult.error) throw oppsResult.error;
      if (sourcesResult.error) throw sourcesResult.error;
      if (checksResult.error) throw checksResult.error;

      const recentChecks: FundingSourceCheckRow[] = (checksResult.data ?? []).map((row: any) => ({ id:String(row.id),opportunityId:String(row.opportunity_id),sourceId:row.source_id?String(row.source_id):null,sourceUrl:text(row.source_url),checkedAt:text(row.checked_at),classifiedStatus:normalizeApplicationStatus(row.classified_status),errorClass:nullableText(row.error_class),extractedSignals:record(row.extracted_signals) }));
      const checksByOpportunity = new Map<string, FundingSourceCheckRow[]>();
      for (const check of recentChecks) { const list=checksByOpportunity.get(check.opportunityId)??[];list.push(check);checksByOpportunity.set(check.opportunityId,list); }
      const now = new Date();
      const opportunities: FundingSourceHealthOpportunity[] = (oppsResult.data ?? []).map((row: any) => {
        const id=String(row.id);const status=normalizeApplicationStatus(row.application_status);const checks=checksByOpportunity.get(id)??[];const latest=checks[0]??null;const lastSuccess=checks.find((check)=>!check.errorClass)??null;let consecutiveFailures=0;for(const check of checks){if(!check.errorClass)break;consecutiveFailures+=1;}
        return { id,title:text(row.title),funder:text(row.funder),sourceUrl:nullableText(row.source_url),verificationStatus:normalizeVerificationStatus(row.verification_status),applicationStatus:status,statusCheckedAt:nullableText(row.status_checked_at),lastError:latest?.errorClass??null,lastSuccessAt:lastSuccess?.checkedAt??null,consecutiveFailures,due:!isStatusFresh(status,nullableText(row.status_checked_at),now),conflict:latest?hasConflict(latest.extractedSignals):false };
      });
      const sources: FundingSourceRow[] = (sourcesResult.data ?? []).map((row: any) => ({ id:String(row.id),name:text(row.name),baseUrl:text(row.base_url),active:Boolean(row.active),lastCheckedAt:nullableText(row.last_checked_at),lastSuccessAt:nullableText(row.last_success_at),lastError:nullableText(row.last_error) }));
      return { opportunities, sources, recentChecks };
    },
  });
}

async function invokeIndividualRecheck(opportunityId: string) {
  const { data, error } = await supabase.functions.invoke("funding-source-refresh", { body: { mode: "opportunity", opportunityId } });
  if (error) throw error;
  return data;
}

export function useRecheckFundingOpportunity() {
  const qc=useQueryClient();
  return useMutation({ mutationFn:invokeIndividualRecheck,onSuccess:(_data,opportunityId)=>{void qc.invalidateQueries({queryKey:fundingSourceKeys.all});void qc.invalidateQueries({queryKey:["admin","funding"]});void logAdminAction("recheck_funding_status",{entityType:"funding_opportunity",entityId:opportunityId});toast.success("Funding status rechecked");},onError:()=>toast.error("Could not recheck funding status") });
}

export function useRefreshDueFunding() {
  const qc=useQueryClient();
  return useMutation({
    mutationFn:async()=>{const{data,error}=await db.from("funding_opportunities").select("id,application_status,status_checked_at").eq("status","published").limit(100);if(error)throw error;const now=new Date();const due=(data??[]).filter((row:any)=>!isStatusFresh(normalizeApplicationStatus(row.application_status),nullableText(row.status_checked_at),now)).slice(0,10);for(const row of due as any[])await invokeIndividualRecheck(String(row.id));return{checked:due.length};},
    onSuccess:(result)=>{void qc.invalidateQueries({queryKey:fundingSourceKeys.all});void qc.invalidateQueries({queryKey:["admin","funding"]});void logAdminAction("recheck_due_funding_status",{details:{checked:result.checked}});toast.success(result.checked?`Rechecked ${result.checked} due opportunities`:"No due opportunities");},
    onError:()=>toast.error("Could not refresh due opportunities"),
  });
}

export function useCreateFundingSource() {
  const qc=useQueryClient();
  return useMutation({
    mutationFn:async(input:{name:string;baseUrl:string})=>{const{data,error}=await db.from("funding_sources").insert({name:input.name.trim(),base_url:input.baseUrl.trim(),active:true}).select("id,name,base_url,active,last_checked_at,last_success_at,last_error").single();if(error)throw error;return data;},
    onSuccess:(row:any)=>{void qc.invalidateQueries({queryKey:fundingSourceKeys.all});void logAdminAction("create_funding_source",{entityType:"funding_source",entityId:String(row.id)});toast.success("Funding source added");},
    onError:()=>toast.error("Could not add funding source"),
  });
}

export function useUpdateFundingSource() {
  const qc=useQueryClient();
  return useMutation({
    mutationFn:async(input:{id:string;name:string;baseUrl:string;active:boolean})=>{const{data,error}=await db.rpc("update_funding_source_and_invalidate",{_source_id:input.id,_name:input.name.trim(),_base_url:input.baseUrl.trim(),_active:input.active});if(error)throw error;return data;},
    onSuccess:()=>{void qc.invalidateQueries({queryKey:fundingSourceKeys.all});void qc.invalidateQueries({queryKey:["admin","funding"]});toast.success("Funding source updated; affected trust was invalidated if the URL changed");},
    onError:()=>toast.error("Could not update funding source"),
  });
}
