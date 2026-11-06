BEGIN;
DO $$
DECLARE oid uuid:=gen_random_uuid(); stamp timestamptz; applied boolean; payload jsonb;
BEGIN
 IF has_function_privilege('anon','public.list_due_free_grants(integer)','EXECUTE') THEN RAISE EXCEPTION 'Public due-list execution'; END IF;
 IF has_function_privilege('anon','public.apply_free_grant_check(uuid,timestamptz,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.apply_free_grant_check(uuid,timestamptz,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Public execution granted'; END IF;
 INSERT INTO funding_sources(name,base_url) VALUES ('Rollback-only maintenance test','https://example.org/cresciva-maintenance-test');
 INSERT INTO funding_opportunities(id,title,funder,url,source_url) VALUES(oid,'Rollback-only grant','Fixture','https://example.org/cresciva-maintenance-test/call','https://example.org/cresciva-maintenance-test/call') RETURNING updated_at INTO stamp;
 payload:=jsonb_build_object('source_url','https://example.org/cresciva-maintenance-test/call','source_ok',true,'http_status',200,'application_status','open','deadline_status','confirmed','deadline_text','12 January 2027 (time not stated)','application_url','https://example.org/apply','fingerprint','fixture');
 applied:=apply_free_grant_check(oid,stamp-interval '1 second',payload);
 IF applied THEN RAISE EXCEPTION 'Concurrent edit was overwritten'; END IF;
 applied:=apply_free_grant_check(oid,stamp,payload);
 IF NOT applied OR NOT EXISTS(SELECT 1 FROM funding_opportunities WHERE id=oid AND application_status='open' AND deadline_at IS NULL AND deadline='12 January 2027 (time not stated)') THEN RAISE EXCEPTION 'Canonical check not applied correctly'; END IF;
 UPDATE funding_opportunities SET eligibility_rules='{"geographyScope":"global"}',eligibility_verified_at=now() WHERE id=oid RETURNING updated_at INTO stamp;
 payload:=payload || '{"fingerprint":"changed-fixture"}'::jsonb;
 applied:=apply_free_grant_check(oid,stamp,payload);
 IF NOT applied OR NOT EXISTS(SELECT 1 FROM funding_opportunities WHERE id=oid AND eligibility_rules='{}'::jsonb AND eligibility_verified_at IS NULL) THEN RAISE EXCEPTION 'Changed source retained old hard eligibility'; END IF;
 SELECT updated_at INTO stamp FROM funding_opportunities WHERE id=oid;
 payload:=payload || '{"source_ok":false,"fingerprint":null,"application_status":"unknown","deadline_status":"unknown","error":"source_timeout"}'::jsonb;
 applied:=apply_free_grant_check(oid,stamp,payload);
 IF NOT applied OR NOT EXISTS(SELECT 1 FROM funding_opportunities WHERE id=oid AND details->'last_known_deadline'->>'text'='12 January 2027 (time not stated)' AND application_status='unknown' AND details->'free_verification'->>'fingerprint'='changed-fixture') THEN RAISE EXCEPTION 'Failed fetch retained actionable status or lost baseline'; END IF;
 IF NOT EXISTS(SELECT 1 FROM funding_source_checks WHERE opportunity_id=oid AND classified_status='open') THEN RAISE EXCEPTION 'Audit missing'; END IF;
END $$;
ROLLBACK;
