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
DO $$
DECLARE oid uuid := gen_random_uuid(); sid uuid; stamp timestamptz;
  source text := 'https://example.org/cresciva-maintenance-test/editorial';
  portal text := 'https://example.org/official-application';
  cutoff timestamptz := now() + interval '7 days';
  payload jsonb;
BEGIN
  SELECT id INTO STRICT sid FROM funding_sources
    WHERE base_url = 'https://example.org/cresciva-maintenance-test';
  INSERT INTO funding_opportunities(id,title,funder,url,source_url,deadline,details)
    VALUES(oid,'Rollback-only editorial grant','Fixture',source,source,
      'Official proposal cutoff at 11:59 p.m. ET','{"staff_note":"keep"}');
  UPDATE funding_opportunities SET last_verified_at=now() WHERE id=oid;
  PERFORM record_funding_status_check(
    gen_random_uuid(),oid,sid,source,now(),200,NULL,NULL,NULL,
    '{"review_method":"official_page_research"}','open',NULL,true,
    portal,now()-interval '2 days',cutoff,'America/New_York','confirmed','Current cycle',
    portal,'{"geographyScope":"global"}','{"note":"editorial"}',now(),source);
  SELECT updated_at INTO stamp FROM funding_opportunities WHERE id=oid;
  payload := jsonb_build_object('source_url',source,'source_ok',true,'http_status',200,
    'source_reachable',true,'application_checked_url',portal,
    'application_status','open','deadline_status','confirmed',
    'deadline_text','Questions deadline','deadline_at',now()+interval '1 day',
    'application_url','https://example.org/webinar','fingerprint','unchanged');
  IF NOT apply_free_grant_check(oid,stamp,payload) THEN RAISE EXCEPTION 'Editorial check rejected'; END IF;
  IF NOT EXISTS(SELECT 1 FROM funding_opportunities WHERE id=oid
    AND application_status='open' AND application_url=portal AND deadline_at=cutoff
    AND deadline='Official proposal cutoff at 11:59 p.m. ET' AND deadline_timezone='America/New_York'
    AND status_evidence_url=portal AND opens_at IS NOT NULL
    AND eligibility_evidence->>'note'='editorial' AND details->>'staff_note'='keep') THEN
    RAISE EXCEPTION 'Hourly check replaced verified editorial details';
  END IF;
  SELECT updated_at INTO stamp FROM funding_opportunities WHERE id=oid;
  IF NOT apply_free_grant_check(oid,stamp,payload || '{"application_checked_url":null,"error":"application_timeout"}') THEN
    RAISE EXCEPTION 'Failed portal check rejected';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM funding_opportunities WHERE id=oid AND application_status='unknown'
    AND application_url=portal AND deadline_at=cutoff AND deadline_status='confirmed') THEN
    RAISE EXCEPTION 'Failed portal check kept actionable status or lost deadline details';
  END IF;
  UPDATE funding_opportunities SET application_status='open',deadline_at=now()-interval '1 minute'
    WHERE id=oid RETURNING updated_at INTO stamp;
  IF NOT apply_free_grant_check(oid,stamp,payload) THEN RAISE EXCEPTION 'Expired check rejected'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM funding_opportunities WHERE id=oid AND application_status='closed'
      AND deadline_at<now() AND application_url=portal) THEN
    RAISE EXCEPTION 'Passed verified cutoff did not close the call';
  END IF;
END $$;
ROLLBACK;
