-- Service-only atomic persistence; expected timestamp protects concurrent staff edits.
CREATE OR REPLACE FUNCTION public.apply_free_grant_check(_id uuid, _expected_updated_at timestamptz, _check jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r public.funding_opportunities%ROWTYPE; sid uuid; changed boolean;
BEGIN
 SELECT * INTO r FROM funding_opportunities WHERE id=_id FOR UPDATE;
 IF NOT FOUND OR r.updated_at IS DISTINCT FROM _expected_updated_at OR r.status<>'published' THEN RETURN false; END IF;
 IF r.source_url IS DISTINCT FROM _check->>'source_url' OR NOT funding_source_is_registered(r.source_url) THEN RETURN false; END IF;
 SELECT id INTO sid FROM funding_sources WHERE active AND (rtrim(split_part(r.source_url,'?',1),'/')=rtrim(base_url,'/') OR split_part(r.source_url,'?',1) LIKE rtrim(base_url,'/') || '/%') ORDER BY length(base_url) DESC LIMIT 1;
 IF sid IS NULL THEN RETURN false; END IF;
 changed := _check->>'fingerprint' IS NOT NULL AND r.details->'free_verification'->>'fingerprint' IS NOT NULL AND r.details->'free_verification'->>'fingerprint' IS DISTINCT FROM _check->>'fingerprint';
 UPDATE funding_opportunities SET
  deadline=CASE WHEN _check->>'deadline_status'='confirmed' THEN _check->>'deadline_text' ELSE deadline END,
  details=details || CASE WHEN r.deadline_status='confirmed' AND _check->>'deadline_status'='unknown' THEN jsonb_build_object('last_known_deadline',jsonb_build_object('text',r.deadline,'at',r.deadline_at,'timezone',r.deadline_timezone,'last_supported_at',r.status_checked_at)) ELSE '{}'::jsonb END || jsonb_build_object('free_verification',jsonb_build_object('checked_at',now(),'fingerprint',coalesce(_check->>'fingerprint',r.details->'free_verification'->>'fingerprint'),'error',_check->>'error','method','deterministic_official_source')),
  last_verified_at=CASE WHEN (_check->>'source_ok')::boolean THEN clock_timestamp() ELSE last_verified_at END
 WHERE id=_id;
 PERFORM record_funding_status_check(_check_key=>gen_random_uuid(),_opportunity_id=>_id,_source_id=>sid,_source_url=>r.source_url,_checked_at=>now(),_http_status=>(_check->>'http_status')::integer,_content_type=>_check->>'content_type',_content_bytes=>(_check->>'bytes')::integer,_source_fingerprint=>_check->>'fingerprint',_extracted_signals=>coalesce(_check->'signals','{}'),_classified_status=>_check->>'application_status',_error_class=>_check->>'error',_apply_canonical=>true,_status_evidence_url=>r.source_url,_deadline_at=>(_check->>'deadline_at')::timestamptz,_deadline_timezone=>_check->>'deadline_timezone',_deadline_status=>_check->>'deadline_status',_application_url=>coalesce(_check->>'application_url',r.application_url),_current_cycle_label=>r.current_cycle_label,
 _eligibility_rules=>CASE WHEN changed THEN '{}'::jsonb ELSE r.eligibility_rules END,
 _eligibility_evidence=>CASE WHEN changed THEN '{}'::jsonb ELSE r.eligibility_evidence END,
 _eligibility_verified_at=>CASE WHEN changed THEN NULL ELSE r.eligibility_verified_at END,
 _eligibility_evidence_url=>CASE WHEN changed THEN NULL ELSE r.eligibility_evidence_url END);
 IF changed THEN UPDATE funding_opportunities SET eligibility_verified_at=NULL,eligibility_evidence_url=NULL WHERE id=_id; END IF;
 UPDATE funding_sources SET last_checked_at=now(),last_success_at=CASE WHEN (_check->>'source_ok')::boolean THEN now() ELSE last_success_at END,last_error=_check->>'error' WHERE id=sid;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.apply_free_grant_check(uuid,timestamptz,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_free_grant_check(uuid,timestamptz,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.list_due_free_grants(_limit integer DEFAULT 8)
RETURNS SETOF public.funding_opportunities LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT f.* FROM funding_opportunities f WHERE status='published' AND funding_source_is_registered(source_url)
 ORDER BY status_checked_at ASC NULLS FIRST LIMIT least(8,greatest(1,_limit));
$$;
REVOKE ALL ON FUNCTION public.list_due_free_grants(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_due_free_grants(integer) TO service_role;

SELECT cron.schedule('cresciva-free-official-grant-checks','23 * * * *',$job$
 SELECT net.http_post(url:='https://fqragjhmunphhdnmvpgs.supabase.co/functions/v1/free-grant-maintenance',headers:=jsonb_build_object('Content-Type','application/json','X-Cresciva-Discovery-Secret',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='grant_discovery_secret' LIMIT 1)),body:='{}'::jsonb,timeout_milliseconds:=60000);
$job$);
