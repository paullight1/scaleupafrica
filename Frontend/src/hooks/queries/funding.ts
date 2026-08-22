import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { fundingVerificationStatus } from "@shared/lib/fundingTrust";
import { normalizeKeywords, parseOpportunities, type Opportunity } from "@/lib/fundingSchema";
import { readFundingCache, writeFundingCache, CACHE_TTL_MS, type FundingCacheEntry } from "@/lib/fundingCache";
import { useApiFor } from "@/lib/api/flags";
import { ApiError } from "@/lib/api/client";
import { searchFunding, getLatestFunding, listCuratedFunding } from "@/lib/api/funding";

// New funding/profile columns land via migrations before generated Supabase types are refreshed.
// Keep the escape hatch local to this data layer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = supabase as unknown as { from: (table: string) => any };

export type FundingErrorCode = "rate_limited" | "subscription_required" | "timeout" | "invalid_ai_output" | "unauthorized" | "unknown";
export class FundingError extends Error { code: FundingErrorCode; constructor(code: FundingErrorCode) { super(fundingErrorMessage(code)); this.name = "FundingError"; this.code = code; } }
function apiCodeToFundingCode(code: string): FundingErrorCode { switch (code) { case "SUBSCRIPTION_REQUIRED": return "subscription_required"; case "RATE_LIMITED": return "rate_limited"; case "TIMEOUT": return "timeout"; case "UPSTREAM_ERROR": return "invalid_ai_output"; case "UNAUTHENTICATED": return "unauthorized"; default: return "unknown"; } }
export function fundingErrorMessage(code: FundingErrorCode): string { switch (code) { case "rate_limited": return "You've run several searches recently. Please try again in about an hour — your previous results are saved."; case "subscription_required": return "Your membership isn't active right now. Please renew to run a search."; case "timeout": return "That search took longer than expected. Please try again."; case "invalid_ai_output": return "We couldn't read those results. Please try again in a moment."; case "unauthorized": return "Your session expired. Please sign in again."; default: return "Something went wrong fetching opportunities. Please try again."; } }

export interface FundingResult { opportunities: Opportunity[]; keywordsRaw: string; generatedAt: string; cached: boolean; }
export function fundingResultKey(userId: string | undefined) { return ["funding", "result", userId] as const; }

export function useFundingResult() {
  const { user } = useAuth(); const userId = user?.id; const viaApi = useApiFor("funding"); const seed = userId ? readFundingCache(userId) : null;
  const initialData: FundingResult | undefined = seed ? { opportunities: seed.opportunities, keywordsRaw: seed.keywordsRaw, generatedAt: seed.generatedAt, cached: true } : undefined;
  return useQuery<FundingResult | null>({ queryKey: fundingResultKey(userId), enabled: !!userId, staleTime: Infinity, gcTime: 24*60*60*1000, initialData,
    queryFn: async () => {
      if (viaApi) { const res=await getLatestFunding(); if(!res)return null; return { opportunities:parseOpportunities(res.opportunities), keywordsRaw:res.keywordsRaw??"", generatedAt:res.generatedAt, cached:true }; }
      const {data,error}=await untyped.from("funding_results").select("keywords_raw, opportunities, created_at, expires_at").eq("user_id",userId).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).maybeSingle(); if(error)throw error; if(!data)return null;
      return { opportunities:parseOpportunities(data.opportunities), keywordsRaw:data.keywords_raw??"", generatedAt:data.created_at, cached:true };
    }
  });
}

interface GenerateResponse { opportunities?: unknown; cached?: boolean; generated_at?: string; error?: FundingErrorCode; }
const CLIENT_TIMEOUT_MS=90_000;
export function useGenerateFunding() {
  const {user}=useAuth(); const userId=user?.id; const qc=useQueryClient(); const inFlight=useRef(false); const viaApi=useApiFor("funding");
  return useMutation<FundingResult,FundingError,string>({
    mutationFn: async(rawKeywords)=>{ if(inFlight.current)throw new FundingError("unknown"); inFlight.current=true; try { const keywords=rawKeywords.trim()||"African SMEs";
      if(viaApi){try{const res=await searchFunding(keywords);return{opportunities:parseOpportunities(res.opportunities),keywordsRaw:res.keywordsRaw||keywords,generatedAt:res.generatedAt??new Date().toISOString(),cached:!!res.cached};}catch(e){if(e instanceof ApiError)throw new FundingError(apiCodeToFundingCode(e.code));throw new FundingError("unknown");}}
      const invoke=supabase.functions.invoke<GenerateResponse>("aggregate-funding",{body:{keywords}}).then(async({data,error})=>{if(error){let code:FundingErrorCode="unknown";try{// eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx=(error as any).context;if(ctx&&typeof ctx.json==="function"){const body=await ctx.json();if(body?.error)code=body.error as FundingErrorCode;}}catch{}throw new FundingError(code);}return data as GenerateResponse;});
      const timeout=new Promise<never>((_,reject)=>setTimeout(()=>reject(new FundingError("timeout")),CLIENT_TIMEOUT_MS)); const data=await Promise.race([invoke,timeout]); return {opportunities:parseOpportunities(data.opportunities??[]),keywordsRaw:keywords,generatedAt:data.generated_at??new Date().toISOString(),cached:!!data.cached};
    } finally {inFlight.current=false;} },
    onSuccess:(result)=>{if(!userId)return;qc.setQueryData<FundingResult>(fundingResultKey(userId),result);const entry:FundingCacheEntry={keywordsRaw:result.keywordsRaw,keywordsNormalized:normalizeKeywords(result.keywordsRaw),opportunities:result.opportunities,generatedAt:result.generatedAt};writeFundingCache(userId,entry);}
  });
}

export type FeedVerificationStatus="verified"|"stale"|"unverified";
export interface FeedItem extends Opportunity { id:string; lastVerifiedAt:string|null; featured:boolean; countryFocus:string[]; details:Record<string,unknown>; verificationStatus:FeedVerificationStatus; sourceUrl:string|null; sourceName:string|null; }

function authoritativeFeedItem(op:Opportunity,input:{id:string;lastVerifiedAt:string|null;featured:boolean;countryFocus:string[];details:Record<string,unknown>;sourceUrl:string|null;sourceName:string|null;}):FeedItem {
  const verificationStatus=fundingVerificationStatus(input.sourceUrl,input.lastVerifiedAt);
  return {...op,discovery_source:"verified_feed",verification_status:verificationStatus,source_checked_at:input.lastVerifiedAt??undefined,match_reasons:[],id:input.id,lastVerifiedAt:input.lastVerifiedAt,featured:input.featured,countryFocus:input.countryFocus,details:input.details,verificationStatus,sourceUrl:input.sourceUrl,sourceName:input.sourceName};
}

export function useFundingFeed(){const{user}=useAuth();const viaApi=useApiFor("funding");return useQuery<FeedItem[]>({queryKey:["funding","feed"],enabled:!!user,staleTime:5*60_000,queryFn:async()=>{
  if(viaApi){const rows=await listCuratedFunding();const out:FeedItem[]=[];for(const row of rows){const details=(row.details&&typeof row.details==="object"?row.details:{}) as Record<string,unknown>;const [op]=parseOpportunities([{...details,title:row.title,funder:row.funder,type:row.type??undefined,summary:row.summary??"",amount:row.amount??"",opens:row.opens??"",deadline:row.deadline??"",eligibility:row.eligibility??"",url:row.url??"",tags:Array.isArray(row.tags)?row.tags:[]}]);if(!op)continue;const extended=row as typeof row & {sourceUrl?:string|null;sourceName?:string|null};out.push(authoritativeFeedItem(op,{id:row.id,lastVerifiedAt:row.lastVerifiedAt??null,featured:!!row.featured,countryFocus:Array.isArray(row.countryFocus)?row.countryFocus:[],details,sourceUrl:extended.sourceUrl??null,sourceName:extended.sourceName??null}));}return out;}
  const{data,error}=await untyped.from("funding_opportunities").select("id, title, funder, type, summary, amount, opens, deadline, eligibility, url, tags, country_focus, details, featured, last_verified_at, source_url, source_name, verification_status").eq("status","published").order("featured",{ascending:false}).order("last_verified_at",{ascending:false,nullsFirst:false});if(error)throw error;const out:FeedItem[]=[];for(const row of Array.isArray(data)?data:[]){const details=(row.details&&typeof row.details==="object"?row.details:{}) as Record<string,unknown>;const[op]=parseOpportunities([{...details,title:row.title,funder:row.funder,type:row.type??undefined,summary:row.summary??"",amount:row.amount??"",opens:row.opens??"",deadline:row.deadline??"",eligibility:row.eligibility??"",url:row.url??"",tags:Array.isArray(row.tags)?row.tags:[]}]);if(!op)continue;out.push(authoritativeFeedItem(op,{id:row.id,lastVerifiedAt:row.last_verified_at??null,featured:!!row.featured,countryFocus:Array.isArray(row.country_focus)?row.country_focus:[],details,sourceUrl:row.source_url??null,sourceName:row.source_name??null}));}return out;}})}

export interface FundingProfile {business_name:string|null;sector:string|null;country:string|null;keywords:string[]|null;short_description:string|null;long_description:string|null;business_stage:string|null;funding_target_usd:number|null;preferred_funding_types:string[]|null;application_readiness:"exploring"|"preparing"|"ready"|null;}
export function useFundingProfile(){const{user}=useAuth();const userId=user?.id;return useQuery<FundingProfile|null>({queryKey:["funding","profile",userId],enabled:!!userId,staleTime:5*60_000,retry:1,queryFn:async()=>{const{data,error}=await untyped.from("profiles").select("business_name, sector, country, keywords, short_description, long_description, business_stage, funding_target_usd, preferred_funding_types, application_readiness").eq("user_id",userId).maybeSingle();if(error)throw error;return(data as FundingProfile)??null;}})}
export function buildKeywordChips(profile:FundingProfile|null|undefined):string[]{const fallback=["agriculture Nigeria","women-led fintech","climate grant Africa","tech fellowship"];if(!profile)return fallback;const{sector,country,keywords}=profile;const chips:string[]=[];if(sector&&country)chips.push(`${sector} ${country}`);if(sector)chips.push(`${sector} grant`);if(country)chips.push(`SME accelerator ${country}`);if(Array.isArray(keywords))chips.push(...keywords.filter(Boolean).slice(0,3));return(Array.from(new Set(chips.map(c=>c.trim()).filter(Boolean))).length?Array.from(new Set(chips.map(c=>c.trim()).filter(Boolean))):fallback).slice(0,6);}
export const _internal={CACHE_TTL_MS};
