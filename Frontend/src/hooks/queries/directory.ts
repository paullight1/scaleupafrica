import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@shared/integrations/supabase/client";
import { useApiFor } from "@/lib/api/flags";
import { ApiError } from "@/lib/api/client";
import {
  listProfiles,
  getProfileBySlug,
  getMyProfile,
  upsertMyProfile,
} from "@/lib/api/profiles";

const db = supabase as unknown as SupabaseClient;
export const PAGE_SIZE = 24;
export type DirectoryFilters = { q: string; country: string | null; sector: string | null };
export const directoryKeys = {
  all: ["directory"] as const,
  list: (f: DirectoryFilters) => ["directory", "list", f] as const,
  facets: ["directory", "facets"] as const,
  profile: (slug: string) => ["directory", "profile", slug] as const,
  contact: (id: string) => ["directory", "contact", id] as const,
  own: (userId: string) => ["directory", "own", userId] as const,
};
export type DirectoryCardRow = { id:string;slug:string;business_name:string;founder_name:string|null;logo_url:string|null;country:string;sector:string;short_description:string|null;featured:boolean;created_at:string };
export type ProfileOffering = { name:string;description?:string;url?:string };
export type ProfileDetailRow = { id:string;slug:string;business_name:string;founder_name:string|null;founder_photo_url:string|null;logo_url:string|null;country:string;sector:string;short_description:string|null;long_description:string|null;target_customers:string|null;offerings:ProfileOffering[];website:string|null;instagram:string|null;linkedin:string|null;twitter:string|null;keywords:string[]|null;status:string;view_count:number;created_at:string };
export type ProfileContact = { email:string|null;phone:string|null;whatsapp:string|null };
export type FacetValue = { value:string;count:number };
export type DirectoryFacets = { countries:FacetValue[];sectors:FacetValue[] };
const CARD_COLUMNS="id, slug, business_name, founder_name, logo_url, country, sector, short_description, featured, created_at";
const PROFILE_COLUMNS="id, slug, business_name, founder_name, founder_photo_url, logo_url, country, sector, short_description, long_description, target_customers, offerings, website, instagram, linkedin, twitter, keywords, status, view_count, created_at";

export function sanitizeTerm(raw:string):string{return raw.replace(/[,()]/g," ").replace(/[%_]/g,(m)=>`\\${m}`).replace(/\s+/g," ").trim();}
export interface DirectoryQueryBuilder{eq(column:string,value:unknown):DirectoryQueryBuilder;or(filter:string):DirectoryQueryBuilder;}
export function buildDirectoryQuery(base:DirectoryQueryBuilder,filters:DirectoryFilters):DirectoryQueryBuilder{let q=base.eq("status","active");if(filters.country)q=q.eq("country",filters.country);if(filters.sector)q=q.eq("sector",filters.sector);const term=sanitizeTerm(filters.q??"");if(term){const like=`%${term}%`;q=q.or(`business_name.ilike.${like},founder_name.ilike.${like},short_description.ilike.${like},keywords.cs.{${term.toLowerCase()}}`);}return q;}
export type DirectoryPage={rows:DirectoryCardRow[];count:number;nextOffset:number};
export function directoryNextPageParam(last:DirectoryPage):number|undefined{return last.rows.length===PAGE_SIZE?last.nextOffset:undefined;}

const UPSERT_KEYS=[
  "business_name","founder_name","country","sector","short_description","long_description",
  "website","email","phone","whatsapp","instagram","linkedin","twitter","logo_url",
  "founder_photo_url","keywords","business_stage","funding_target_usd","preferred_funding_types",
  "application_readiness","organisation_type","operating_countries","founding_year",
  "target_customers","offerings","acquisition_source","acquisition_source_other",
  "show_email","show_phone","show_whatsapp",
] as const;
function pickUpsertPayload(payload:Record<string,unknown>):Record<string,unknown>{const out:Record<string,unknown>={};for(const k of UPSERT_KEYS)if(payload[k]!==undefined)out[k]=payload[k];return out;}

export function useDirectorySearch(filters:DirectoryFilters){const viaApi=useApiFor("directory");return useInfiniteQuery({queryKey:directoryKeys.list(filters),initialPageParam:0,queryFn:async({pageParam}):Promise<DirectoryPage>=>{if(viaApi){const page=Math.floor(pageParam/PAGE_SIZE)+1;const res=await listProfiles({q:filters.q||undefined,country:filters.country??undefined,sector:filters.sector??undefined,page,pageSize:PAGE_SIZE,sort:"featured"});return{rows:res.items as unknown as DirectoryCardRow[],count:res.total,nextOffset:pageParam+PAGE_SIZE};}const base=db.from("profiles").select(CARD_COLUMNS,{count:"exact"});// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filtered=buildDirectoryQuery(base as any,filters) as any;const{data,error,count}=await filtered.order("featured",{ascending:false}).order("created_at",{ascending:false}).range(pageParam,pageParam+PAGE_SIZE-1);if(error)throw error;return{rows:(data??[]) as DirectoryCardRow[],count:count??0,nextOffset:pageParam+PAGE_SIZE};},getNextPageParam:directoryNextPageParam,placeholderData:keepPreviousData});}
export function useDirectoryFacets(){return useQuery<DirectoryFacets>({queryKey:directoryKeys.facets,staleTime:5*60_000,queryFn:async()=>{const{data,error}=await db.rpc("directory_facets");if(error)throw error;const rows=(data??[]) as{facet:string;value:string|null;count:number}[];const countries:FacetValue[]=[];const sectors:FacetValue[]=[];for(const r of rows){if(!r.value)continue;const bucket=r.facet==="country"?countries:r.facet==="sector"?sectors:null;if(bucket)bucket.push({value:r.value,count:Number(r.count)});}countries.sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value));sectors.sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value));return{countries,sectors};}});}
export function useProfileBySlug(slug:string|undefined){const viaApi=useApiFor("directory");return useQuery<ProfileDetailRow|null>({queryKey:directoryKeys.profile(slug??""),enabled:!!slug,queryFn:async()=>{if(viaApi){try{return(await getProfileBySlug(slug as string)) as unknown as ProfileDetailRow;}catch(e){if(e instanceof ApiError&&e.status===404)return null;throw e;}}const{data,error}=await db.from("profiles").select(PROFILE_COLUMNS).eq("slug",slug as string).maybeSingle();if(error)throw error;return(data??null) as ProfileDetailRow|null;}});}
export function useProfileContact(profileId:string|undefined,opts?:{enabled?:boolean}){return useQuery<ProfileContact>({queryKey:directoryKeys.contact(profileId??""),enabled:!!profileId&&(opts?.enabled??false),staleTime:Infinity,queryFn:async()=>{const{data,error}=await db.rpc("get_profile_contact",{_profile_id:profileId});if(error)throw error;const row=Array.isArray(data)?data[0]:data;return(row??{email:null,phone:null,whatsapp:null}) as ProfileContact;}});}
export function useOwnProfile(userId:string|undefined){const viaApi=useApiFor("profiles");return useQuery<Record<string,unknown>|null>({queryKey:directoryKeys.own(userId??""),enabled:!!userId,queryFn:async()=>{if(viaApi)return(await getMyProfile()) as unknown as Record<string,unknown>|null;const{data,error}=await db.from("profiles").select("*").eq("user_id",userId as string).maybeSingle();if(error)throw error;return(data??null) as Record<string,unknown>|null;}});}
export function useSaveProfile(){const qc=useQueryClient();const viaApi=useApiFor("profiles");return useMutation<{slug:string},Error,Record<string,unknown>>({mutationFn:async(payload)=>{if(viaApi){const row=await upsertMyProfile(pickUpsertPayload(payload));return{slug:row.slug};}const{data,error}=await db.from("profiles").upsert(payload,{onConflict:"user_id"}).select("slug").single();if(error)throw error;return data as{slug:string};},onSuccess:(_row,payload)=>{qc.invalidateQueries({queryKey:directoryKeys.all});if(typeof payload.user_id==="string")qc.invalidateQueries({queryKey:directoryKeys.own(payload.user_id)});}});}
