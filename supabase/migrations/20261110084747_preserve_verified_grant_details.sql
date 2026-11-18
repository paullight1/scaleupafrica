-- Keep editorial facts separate from the hourly check's observations.
CREATE OR REPLACE FUNCTION public.apply_free_grant_check(
  _id uuid, _expected_updated_at timestamptz, _check jsonb
)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE
  r funding_opportunities%ROWTYPE;
  sid uuid;
  review_at timestamptz;
  reviewed_status text;
  curated boolean;
  changed boolean;
  preserve_deadline boolean;
  observed_status text := _check->>'application_status';
  effective_status text := observed_status;
  effective_error text := _check->>'error';
  observed_deadline_at timestamptz := (_check->>'deadline_at')::timestamptz;
  observed_deadline_status text := _check->>'deadline_status';
  source_reachable boolean := COALESCE((_check->>'source_reachable')::boolean, false);
  source_ok boolean := COALESCE((_check->>'source_ok')::boolean, false);
  checked_url text := _check->>'application_checked_url';
  application_url text;
BEGIN
  SELECT * INTO r FROM funding_opportunities WHERE id=_id FOR UPDATE;
  IF NOT FOUND OR r.updated_at IS DISTINCT FROM _expected_updated_at OR r.status<>'published' THEN
    RETURN false;
  END IF;
  IF r.source_url IS DISTINCT FROM _check->>'source_url' OR NOT funding_source_is_registered(r.source_url) THEN
    RETURN false;
  END IF;

  -- Keep registry lookup aligned with path matching, including query-based funder pages.
  SELECT id INTO sid FROM funding_sources
  WHERE active AND (
    rtrim(regexp_replace(r.source_url,'[?#].*$',''),'/')=rtrim(regexp_replace(base_url,'[?#].*$',''),'/')
    OR starts_with(regexp_replace(r.source_url,'[?#].*$',''),rtrim(regexp_replace(base_url,'[?#].*$',''),'/') || '/')
  )
  ORDER BY length(regexp_replace(base_url,'[?#].*$','')) DESC, id
  LIMIT 1;
  IF sid IS NULL THEN RETURN false; END IF;

  SELECT checked_at, classified_status INTO review_at, reviewed_status
  FROM funding_source_checks
  WHERE opportunity_id=_id AND source_url=r.source_url
    AND extracted_signals->>'review_method'='official_page_research'
  ORDER BY checked_at DESC, id DESC LIMIT 1;
  curated := r.verification_status='verified' AND (review_at IS NOT NULL OR r.verified_by IS NOT NULL);
  changed := _check->>'fingerprint' IS NOT NULL
    AND r.details->'free_verification'->>'fingerprint' IS NOT NULL
    AND r.details->'free_verification'->>'fingerprint' IS DISTINCT FROM _check->>'fingerprint';
  preserve_deadline := r.verification_status='verified' AND (
    r.deadline_status IN ('confirmed','rolling') OR r.deadline_at IS NOT NULL
    OR (curated AND NULLIF(btrim(r.deadline),'') IS NOT NULL)
  );
  application_url := COALESCE(NULLIF(r.application_url,''), _check->>'application_url');

  IF preserve_deadline AND r.deadline_status='confirmed' AND r.deadline_at<=now() THEN
    effective_status := 'closed';
    effective_error := NULL;
  ELSIF observed_status IN ('closed','paused') THEN
    -- Explicit closure or pause always wins over previous open evidence.
    NULL;
  ELSIF curated THEN
    -- A fresh editorial observation can survive a weaker parse of the same call.
    -- Only a successful check of the exact saved route can maintain this state.
    IF r.application_status IN ('open','closing_soon','rolling')
      AND COALESCE(reviewed_status,r.application_status) IN ('open','closing_soon','rolling')
      AND COALESCE(review_at,r.last_verified_at)>now()-interval '24 hours'
      AND source_reachable AND checked_url=r.application_url
      AND NOT changed
      AND NOT COALESCE((_check->'signals'->>'statusConflict')::boolean,false)
      AND NOT (r.deadline_at IS NULL AND COALESCE(effective_error,'') LIKE '%deadline_not_in_future%')
    THEN
      effective_status := r.application_status;
      effective_error := NULL;
    ELSE
      effective_status := CASE WHEN r.application_status IN ('closed','paused') THEN r.application_status ELSE 'unknown' END;
      effective_error := COALESCE(effective_error,'editorial_review_required');
    END IF;
  ELSIF observed_status IN ('open','closing_soon','rolling') AND (
    (r.application_url IS NOT NULL AND checked_url IS DISTINCT FROM r.application_url)
    OR (preserve_deadline AND r.deadline_at IS NOT NULL
      AND observed_deadline_at IS DISTINCT FROM r.deadline_at)
  ) THEN
    effective_status := 'unknown';
    effective_error := 'verified_details_need_review';
  END IF;

  UPDATE funding_opportunities SET
    deadline=CASE WHEN NOT preserve_deadline AND observed_deadline_status='confirmed'
      THEN COALESCE(_check->>'deadline_text',r.deadline) ELSE r.deadline END,
    details=COALESCE(r.details,'{}'::jsonb)
      || CASE WHEN r.deadline_status='confirmed' AND observed_deadline_status='unknown' THEN
        jsonb_build_object('last_known_deadline',jsonb_build_object('text',r.deadline,
          'at',r.deadline_at,'timezone',r.deadline_timezone,'last_supported_at',r.status_checked_at))
        ELSE '{}'::jsonb END
      || jsonb_build_object('free_verification',jsonb_build_object(
        'checked_at',now(),
        'fingerprint',COALESCE(_check->>'fingerprint',r.details->'free_verification'->>'fingerprint'),
        'error',effective_error,'method','deterministic_official_source')),
    last_verified_at=CASE WHEN source_ok AND NOT curated THEN clock_timestamp() ELSE r.last_verified_at END
  WHERE id=_id;

  PERFORM record_funding_status_check(
    _check_key=>gen_random_uuid(),_opportunity_id=>_id,_source_id=>sid,_source_url=>r.source_url,
    _checked_at=>now(),_http_status=>(_check->>'http_status')::integer,
    _content_type=>_check->>'content_type',_content_bytes=>(_check->>'bytes')::integer,
    _source_fingerprint=>_check->>'fingerprint',
    _extracted_signals=>COALESCE(_check->'signals','{}'::jsonb) || jsonb_build_object(
      'review_method','deterministic_official_source','observed_status',observed_status,
      'observed_deadline_text',_check->>'deadline_text','observed_application_url',_check->>'application_url',
      'checked_application_url',checked_url,'observed_error',_check->>'error'),
    _classified_status=>effective_status,_error_class=>effective_error,_apply_canonical=>true,
    _status_evidence_url=>COALESCE(r.status_evidence_url,r.source_url),_opens_at=>r.opens_at,
    _deadline_at=>CASE WHEN preserve_deadline THEN r.deadline_at ELSE observed_deadline_at END,
    _deadline_timezone=>CASE WHEN preserve_deadline THEN r.deadline_timezone ELSE _check->>'deadline_timezone' END,
    _deadline_status=>CASE WHEN preserve_deadline THEN r.deadline_status ELSE observed_deadline_status END,
    _application_url=>application_url,_current_cycle_label=>r.current_cycle_label,
    _eligibility_rules=>CASE WHEN changed AND NOT curated THEN '{}'::jsonb ELSE r.eligibility_rules END,
    _eligibility_evidence=>CASE WHEN changed AND NOT curated THEN '{}'::jsonb ELSE r.eligibility_evidence END,
    _eligibility_verified_at=>r.eligibility_verified_at,_eligibility_evidence_url=>r.eligibility_evidence_url
  );
  -- The audit RPC defaults empty eligibility provenance to the check time/source.
  -- An hourly status check supplies no fresh eligibility evidence.
  UPDATE funding_opportunities SET
    eligibility_verified_at=CASE WHEN changed THEN NULL ELSE r.eligibility_verified_at END,
    eligibility_evidence_url=CASE WHEN changed AND NOT curated THEN NULL ELSE r.eligibility_evidence_url END
  WHERE id=_id;

  UPDATE funding_sources SET last_checked_at=now(),
    last_success_at=CASE WHEN source_ok OR source_reachable THEN now() ELSE last_success_at END,
    last_error=effective_error WHERE id=sid;
  RETURN true;
END $$;
