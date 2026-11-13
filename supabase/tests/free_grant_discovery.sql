BEGIN;
DO $$
DECLARE payload jsonb; first_count integer; second_count integer; row_id uuid;
BEGIN
  IF has_function_privilege('anon','public.import_grant_discoveries(jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.import_grant_discoveries(jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Public import access must be denied';
  END IF;
  IF has_table_privilege('anon','public.grant_discovery_runs','SELECT')
     OR has_table_privilege('authenticated','public.grant_discovery_runs','SELECT') THEN
    RAISE EXCEPTION 'Operational logs must be service-only';
  END IF;
  payload := jsonb_build_array(jsonb_build_object(
    'title','Grant discovery transaction test','funder','See source listing','type','grant',
    'summary','Test record; transaction rolls back.', 'url','https://opportunitydesk.org/cresciva-transaction-test/',
    'source_name','Opportunity Desk', 'source_fingerprint','free_rss_v1:test',
    'source_retrieved_at',now(), 'tags',jsonb_build_array('funding'),
    'details', jsonb_build_object('discovery_importer','free_rss_v1','published_at',now())
  ));
  first_count := public.import_grant_discoveries(payload);
  IF first_count <> 1 THEN RAISE EXCEPTION 'First import should insert one row'; END IF;
  SELECT id INTO row_id FROM public.funding_opportunities WHERE url='https://opportunitydesk.org/cresciva-transaction-test/';
  IF NOT EXISTS(SELECT 1 FROM public.funding_opportunities WHERE id=row_id AND verification_status='unverified' AND application_status='unknown' AND status='published' AND last_verified_at IS NULL) THEN
    RAISE EXCEPTION 'Discovery must not imply verification or open status';
  END IF;
  UPDATE public.funding_opportunities SET title='Staff edited title',status='draft' WHERE id=row_id;
  second_count := public.import_grant_discoveries(payload);
  IF second_count <> 0 THEN RAISE EXCEPTION 'Repeated import duplicated a record'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.funding_opportunities WHERE id=row_id AND title='Staff edited title' AND status='draft') THEN
    RAISE EXCEPTION 'Repeated import overwrote staff edits';
  END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: repeat imports, staff edits, trust gates, service-only access' AS result;
