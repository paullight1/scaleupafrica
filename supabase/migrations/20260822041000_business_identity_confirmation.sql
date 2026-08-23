-- Business Enrichment P0-A: member confirmation and profile provenance.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organisation_type TEXT,
  ADD COLUMN IF NOT EXISTS operating_countries TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS founding_year INTEGER
    CHECK (founding_year IS NULL OR founding_year BETWEEN 1800 AND 2100),
  ADD COLUMN IF NOT EXISTS business_identity_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS business_identity_source_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_identity_run_id UUID
    REFERENCES public.business_enrichment_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_identity_candidate_id UUID
    REFERENCES public.business_enrichment_candidates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_business_identity_confirmed_idx
  ON public.profiles (business_identity_confirmed_at DESC)
  WHERE business_identity_confirmed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.confirm_business_identity(
  _run_id UUID,
  _candidate_id UUID,
  _user_id UUID,
  _accepted BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _run public.business_enrichment_runs%ROWTYPE;
  _candidate public.business_enrichment_candidates%ROWTYPE;
  _profile public.profiles%ROWTYPE;
  _profile_updated BOOLEAN := false;
  _candidate_keywords TEXT[] := '{}';
  _candidate_operating_countries TEXT[] := '{}';
  _candidate_org_type TEXT;
  _candidate_year INTEGER;
BEGIN
  SELECT * INTO _run
  FROM public.business_enrichment_runs
  WHERE id = _run_id
  FOR UPDATE;

  IF NOT FOUND OR _run.user_id <> _user_id THEN
    RAISE EXCEPTION 'business_enrichment_run_not_found';
  END IF;

  SELECT * INTO _candidate
  FROM public.business_enrichment_candidates
  WHERE id = _candidate_id
    AND run_id = _run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'business_enrichment_candidate_not_found';
  END IF;

  IF NOT _accepted THEN
    UPDATE public.business_enrichment_candidates
    SET member_state = 'rejected'
    WHERE id = _candidate_id;

    IF _run.selected_candidate_id = _candidate_id THEN
      UPDATE public.business_enrichment_runs
      SET selected_candidate_id = NULL,
          status = CASE WHEN candidate_count > 1 THEN 'ambiguous' ELSE 'not_found' END,
          completed_at = now()
      WHERE id = _run_id;
    END IF;

    RETURN jsonb_build_object(
      'runId', _run_id,
      'candidateId', _candidate_id,
      'state', 'rejected',
      'profileUpdated', false
    );
  END IF;

  UPDATE public.business_enrichment_candidates
  SET member_state = CASE WHEN id = _candidate_id THEN 'confirmed' ELSE 'rejected' END
  WHERE run_id = _run_id;

  UPDATE public.business_enrichment_runs
  SET selected_candidate_id = _candidate_id,
      status = 'resolved',
      completed_at = now(),
      error_class = NULL
  WHERE id = _run_id;

  _candidate_org_type := NULLIF(btrim(COALESCE(_candidate.enriched_profile->>'organisation_type', '')), '');

  BEGIN
    _candidate_year := NULLIF(_candidate.enriched_profile->>'founding_year', '')::INTEGER;
    IF _candidate_year < 1800 OR _candidate_year > 2100 THEN
      _candidate_year := NULL;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    _candidate_year := NULL;
  END;

  SELECT COALESCE(array_agg(DISTINCT value) FILTER (WHERE value <> ''), '{}')
  INTO _candidate_keywords
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(_candidate.enriched_profile->'keywords') = 'array'
      THEN _candidate.enriched_profile->'keywords'
      ELSE '[]'::jsonb END
  ) AS value;

  SELECT COALESCE(array_agg(DISTINCT value) FILTER (WHERE value <> ''), '{}')
  INTO _candidate_operating_countries
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(_candidate.enriched_profile->'operating_countries') = 'array'
      THEN _candidate.enriched_profile->'operating_countries'
      ELSE '[]'::jsonb END
  ) AS value;

  SELECT * INTO _profile
  FROM public.profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.profiles
    SET
      website = COALESCE(NULLIF(btrim(_profile.website), ''), _candidate.website),
      short_description = COALESCE(NULLIF(btrim(_profile.short_description), ''), _candidate.summary),
      keywords = CASE
        WHEN COALESCE(cardinality(_profile.keywords), 0) = 0 THEN _candidate_keywords[1:10]
        ELSE _profile.keywords
      END,
      organisation_type = COALESCE(NULLIF(btrim(_profile.organisation_type), ''), _candidate_org_type),
      operating_countries = CASE
        WHEN COALESCE(cardinality(_profile.operating_countries), 0) = 0 THEN _candidate_operating_countries
        ELSE _profile.operating_countries
      END,
      founding_year = COALESCE(_profile.founding_year, _candidate_year),
      business_identity_confirmed_at = now(),
      business_identity_source_urls = _candidate.source_urls,
      business_identity_run_id = _run_id,
      business_identity_candidate_id = _candidate_id,
      updated_at = now()
    WHERE user_id = _user_id;
    _profile_updated := true;
  END IF;

  RETURN jsonb_build_object(
    'runId', _run_id,
    'candidateId', _candidate_id,
    'state', 'confirmed',
    'profileUpdated', _profile_updated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_business_identity(UUID, UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_business_identity(UUID, UUID, UUID, BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.confirm_business_identity(UUID, UUID, UUID, BOOLEAN) IS
  'Service-role-only atomic member confirmation/rejection of evidence-backed business identity. Existing manual profile values win over enrichment.';
