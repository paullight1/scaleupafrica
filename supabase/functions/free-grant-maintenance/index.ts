import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { safeExternalFetch } from '../_shared/safeExternalFetch.ts';
import { extractFreeGrantEvidence } from '../_shared/freeGrantVerification.ts';

function withinSource(url: string, base: string): boolean {
 try { const u=new URL(url),b=new URL(base),p=b.pathname.replace(/\/+$/, ''); return u.origin===b.origin && (u.pathname.replace(/\/+$/, '')===p || u.pathname.startsWith(p+'/')); } catch { return false; }
}

function usablePage(text: string): boolean {
 return text.length >= 30 && !/^(?:just a moment|access denied|attention required|verify (?:that )?you are human|enable javascript and cookies)/i.test(text);
}

function isApplicationDocument(contentType: string, body: string): boolean {
 return (contentType === 'application/pdf' && body.startsWith('%PDF-'))
  || (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && body.startsWith('PK'));
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
   const check: Record<string, unknown> = {
    source_url: row.source_url, source_ok: false, source_reachable: false,
    http_status: fetched.status, content_type: fetched.ok ? fetched.contentType : null,
    bytes: fetched.ok ? fetched.bytes : null, fingerprint: null,
    application_status: 'unknown', deadline_status: 'unknown',
    application_url: null, application_checked_url: null, signals: {},
    error: fetched.ok ? null : `source_${fetched.error}`,
   };
   if (fetched.ok && withinSource(fetched.url, base)) {
    const evidence = extractFreeGrantEvidence(fetched.body, fetched.url);
    const blocked = !usablePage(evidence.visibleText) || Boolean(evidence.error)
      || evidence.uncertainty.includes('source_truncated');
    if (blocked) {
     check.error = 'source_unconfirmed';
    } else {
     const statusConflict = evidence.uncertainty.includes('conflicting_status')
      || evidence.uncertainty.includes('historical_or_archived_source')
      || evidence.uncertainty.includes('opening_date_in_future');
     Object.assign(check, {
      application_status: evidence.applicationStatus, application_url: evidence.applicationUrl,
      deadline_status: evidence.deadlineStatus, deadline_text: evidence.deadlineText,
      deadline_at: evidence.deadlineAt, deadline_timezone: evidence.deadlineTimezone,
      source_reachable: true, fingerprint: await hex(evidence.visibleText),
      signals: {...evidence.signals, statusConflict},
      error: evidence.uncertainty.join(',').slice(0, 240) || null,
     });
     const applicationUrl = row.application_url || evidence.applicationUrl;
     if (applicationUrl && !['closed', 'paused'].includes(evidence.applicationStatus)) {
      const app = applicationUrl === row.source_url ? fetched : await safeExternalFetch(applicationUrl, {
       timeoutMs: 7000, maxBytes: 2_000_000, allowApplicationDocuments: true,
      });
      if (!app.ok) {
       check.application_status = 'unknown';
       check.error = `application_${app.error}`;
      } else if (isApplicationDocument(app.contentType, app.body)) {
       check.application_checked_url = applicationUrl;
      } else {
       const portal = extractFreeGrantEvidence(app.body, app.url);
       if (!usablePage(portal.visibleText) || portal.error) {
        check.application_status = 'unknown';
        check.error = 'application_unconfirmed';
       } else if (portal.applicationStatus === 'closed' || /\bis no longer accepting responses\b/i.test(portal.visibleText)) {
        check.application_status = 'closed';
        check.error = null;
       } else if (portal.applicationStatus === 'paused') {
        check.application_status = 'paused';
        check.error = null;
       } else if (portal.signals.explicitClosed || portal.signals.explicitPaused) {
        check.application_status = 'unknown';
        check.error = 'application_conflicting_status';
       } else {
        check.application_checked_url = applicationUrl;
       }
      }
     } else if (evidence.applicationStatus === 'open' || evidence.applicationStatus === 'rolling') {
      check.application_status = 'unknown';
      check.error = 'application_link_missing';
     }
     check.source_ok = ['closed', 'paused'].includes(String(check.application_status))
      || (Boolean(check.application_checked_url) && check.application_status !== 'unknown');
    }
   } else if (fetched.ok) {
    check.error = 'redirect_outside_registered_source';
   }
   const {data:applied,error:writeError}=await db.rpc('apply_free_grant_check',{_id:row.id,_expected_updated_at:row.updated_at,_check:check});
   return {id:row.id,status:writeError?'persist_failed':applied?'checked':'skipped_concurrent_edit',error:writeError?'persist_failed':check.error};
  })));
 }
 const failed=outcomes.some(o=>o.status==='persist_failed');
 console.log(JSON.stringify({event:'free_grant_maintenance',checked:outcomes.length,outcomes}));
 return response({checked:outcomes.length,outcomes},failed?503:200);
});
