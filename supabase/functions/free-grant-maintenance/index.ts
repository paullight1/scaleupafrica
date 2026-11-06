import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { safeExternalFetch } from '../_shared/safeExternalFetch.ts';
import { extractFreeGrantEvidence } from '../_shared/freeGrantVerification.ts';

function withinSource(url: string, base: string): boolean {
 try { const u=new URL(url),b=new URL(base),p=b.pathname.replace(/\/+$/, ''); return u.origin===b.origin && (u.pathname.replace(/\/+$/, '')===p || u.pathname.startsWith(p+'/')); } catch { return false; }
}

const response = (value: unknown, status=200) => new Response(JSON.stringify(value), {status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const hex = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))), x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async req => {
 if(req.method!=='POST') return response({error:'Use POST'},405);
 const expected=Deno.env.get('GRANT_DISCOVERY_SECRET')??'', supplied=req.headers.get('X-Cresciva-Discovery-Secret')??'';
 if(expected.length<32 || await hex(expected)!==await hex(supplied)) return response({error:'Unauthorized'},401);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:sources,error:se}=await db.from('funding_sources').select('base_url').eq('active',true).limit(501);
 if(se || (sources?.length??0)>500) return response({error:'source_registry_unavailable'},503);
 const registered=new Set((sources??[]).map(s=>s.base_url));
 if(!registered.size) return response({checked:0,outcomes:[]});
 const {data:rows,error}=await db.rpc('list_due_free_grants',{_limit:8});
 if(error) return response({error:'opportunity_query_failed'},503);
 const outcomes=[];
 // Four simultaneous bounded checks; max two waves within the scheduler timeout.
 for(let offset=0;offset<(rows??[]).length;offset+=4){
  outcomes.push(...await Promise.all(rows!.slice(offset,offset+4).map(async row=>{
   const base=[...registered].filter(b=>withinSource(row.source_url,b)).sort((a,b)=>b.length-a.length)[0];
   if(!base) return {id:row.id,status:'skipped_unregistered'};
   const fetched=await safeExternalFetch(row.source_url,{timeoutMs:7000,maxBytes:1_000_000});
   const check:Record<string,unknown>={source_url:row.source_url,source_ok:fetched.ok,http_status:fetched.status,content_type:fetched.ok?fetched.contentType:null,bytes:fetched.ok?fetched.bytes:null,fingerprint:fetched.ok?await hex(fetched.body):null,application_status:'unknown',deadline_status:'unknown',application_url:row.application_url,signals:{},error:fetched.ok?null:`source_${fetched.error}`};
   if(fetched.ok && withinSource(fetched.url,base)){
    const evidence=extractFreeGrantEvidence(fetched.body,fetched.url,new Date());
    // Ignore script nonces and tracking markup when deciding whether the
    // evidence supporting structured eligibility has changed.
    check.fingerprint=await hex(evidence.visibleText);
    Object.assign(check,{application_status:evidence.applicationStatus,application_url:evidence.applicationUrl??row.application_url,deadline_status:evidence.deadlineStatus,deadline_text:evidence.deadlineText,deadline_at:evidence.deadlineAt,deadline_timezone:evidence.deadlineTimezone,source_ok:!evidence.error && evidence.applicationStatus!=='unknown' && evidence.signals.statusEvidence.length>0,signals:evidence.signals,error:evidence.uncertainty.length?evidence.uncertainty.join(',').slice(0,240):null});
    if(!['open','rolling'].includes(evidence.applicationStatus)) check.application_url=row.application_url;
    // A confirmed link must be extracted from this official response; never
    // substitute a publisher link or infer availability from an HTTP 200 shell.
    if(check.application_url && ['open','closing_soon','rolling'].includes(String(check.application_status))){
     const app=await safeExternalFetch(String(check.application_url),{timeoutMs:7000,maxBytes:1_000_000});
     if(!app.ok){check.application_status='unknown';check.application_url=row.application_url;check.error=`application_${app.error}`;}
    }
   }
   if(fetched.ok && !withinSource(fetched.url,base)){check.source_ok=false;check.fingerprint=null;check.bytes=null;check.content_type=null;check.application_status='unknown';check.error='redirect_outside_registered_source';}
   const {data:applied,error:writeError}=await db.rpc('apply_free_grant_check',{_id:row.id,_expected_updated_at:row.updated_at,_check:check});
   return {id:row.id,status:writeError?'persist_failed':applied?check.application_status:'skipped_concurrent_edit',error:writeError?'persist_failed':check.error};
  })));
 }
 const failed=outcomes.some(o=>o.status==='persist_failed');
 console.log(JSON.stringify({event:'free_grant_maintenance',checked:outcomes.length,outcomes}));
 return response({checked:outcomes.length,outcomes},failed?503:200);
});
