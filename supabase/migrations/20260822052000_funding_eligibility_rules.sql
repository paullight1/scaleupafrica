-- P0-B/P0-C source-backed hard eligibility rules.
-- Free-form `details` remains descriptive/search metadata; only these controlled
-- columns may drive deterministic hard eligibility decisions.

ALTER TABLE public.funding_opportunities
  ADD COLUMN IF NOT EXISTS eligibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(eligibility_rules) = 'object'),
  ADD COLUMN IF NOT EXISTS eligibility_evidence JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(eligibility_evidence) = 'object'),
  ADD COLUMN IF NOT EXISTS eligibility_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eligibility_evidence_url TEXT;

CREATE INDEX IF NOT EXISTS funding_eligibility_verified_idx
  ON public.funding_opportunities (eligibility_verified_at DESC)
  WHERE eligibility_verified_at IS NOT NULL;

-- Any opportunity provenance downgrade invalidates structured hard eligibility.
CREATE OR REPLACE FUNCTION public.invalidate_funding_eligibility_on_provenance_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.url IS DISTINCT FROM OLD.url
     OR NEW.source_url IS DISTINCT FROM OLD.source_url
     OR (OLD.verification_status = 'verified' AND NEW.verification_status <> 'verified') THEN
    NEW.eligibility_rules := '{}'::jsonb;
    NEW.eligibility_evidence := '{}'::jsonb;
    NEW.eligibility_verified_at := NULL;
    NEW.eligibility_evidence_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS funding_eligibility_provenance_guard ON public.funding_opportunities;
CREATE TRIGGER funding_eligibility_provenance_guard
BEFORE UPDATE ON public.funding_opportunities
FOR EACH ROW EXECUTE FUNCTION public.invalidate_funding_eligibility_on_provenance_change();

-- Replace the source-registry invalidation trigger function so source URL changes
-- or deactivation also revoke source-backed eligibility truth.
CREATE OR REPLACE FUNCTION public.invalidate_funding_trust_on_source_registry_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.base_url IS DISTINCT FROM OLD.base_url
     OR (NEW.active IS DISTINCT FROM OLD.active AND NEW.active = false) THEN
    UPDATE public.funding_opportunities
    SET verification_status = 'unverified',
        last_verified_at = NULL,
        verified_by = NULL,
        source_retrieved_at = NULL,
        application_status = 'unknown',
        status_checked_at = NULL,
        status_evidence_url = NULL,
        opens_at = NULL,
        deadline_at = NULL,
        deadline_timezone = NULL,
        deadline_status = 'unknown',
        current_cycle_label = NULL,
        application_url = NULL,
        eligibility_rules = '{}'::jsonb,
        eligibility_evidence = '{}'::jsonb,
        eligibility_verified_at = NULL,
        eligibility_evidence_url = NULL,
        updated_at = now()
    WHERE source_url LIKE OLD.base_url || '%';
  END IF;
  RETURN NEW;
END;
$$;

-- Extend canonical source-check persistence with eligibility rules/evidence. The
-- old overload is removed so future service code cannot accidentally write cycle
-- truth without going through the current source-backed contract.
DROP FUNCTION IF EXISTS public.record_funding_status_check(
  UUID, UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, INTEGER, TEXT, JSONB,
  TEXT, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION public.record_funding_status_check(
  _check_key UUID,
  _opportunity_id UUID,
  _source_id UUID,
  _source_url TEXT,
  _checked_at TIMESTAMPTZ,
  _http_status INTEGER,
  _content_type TEXT,
  _content_bytes INTEGER,
  _source_fingerprint TEXT,
  _extracted_signals JSONB,
  _classified_status TEXT,
  _error_class TEXT,
  _apply_canonical BOOLEAN DEFAULT false,
  _status_evidence_url TEXT DEFAULT NULL,
  _opens_at TIMESTAMPTZ DEFAULT NULL,
  _deadline_at TIMESTAMPTZ DEFAULT NULL,
  _deadline_timezone TEXT DEFAULT NULL,
  _deadline_status TEXT DEFAULT 'unknown',
  _current_cycle_label TEXT DEFAULT NULL,
  _application_url TEXT DEFAULT NULL,
  _eligibility_rules JSONB DEFAULT '{}'::jsonb,
  _eligibility_evidence JSONB DEFAULT '{}'::jsonb,
  _eligibility_verified_at TIMESTAMPTZ DEFAULT NULL,
  _eligibility_evidence_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  IF _classified_status NOT IN ('open','closing_soon','rolling','upcoming','closed','paused','unknown') THEN
    RAISE EXCEPTION 'Invalid classified funding status';
  END IF;
  IF _deadline_status NOT IN ('confirmed','rolling','unknown') THEN
    RAISE EXCEPTION 'Invalid deadline status';
  END IF;
  IF jsonb_typeof(COALESCE(_eligibility_rules, '{}'::jsonb)) <> 'object'
     OR jsonb_typeof(COALESCE(_eligibility_evidence, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Funding eligibility rules/evidence must be JSON objects';
  END IF;

  IF _apply_canonical AND (
    _source_id IS NULL
    OR NOT public.funding_source_is_registered(_source_url)
    OR NOT EXISTS (
      SELECT 1
      FROM public.funding_sources source
      WHERE source.id = _source_id
        AND source.active = true
        AND public.funding_source_is_registered(_source_url)
    )
  ) THEN
    RAISE EXCEPTION 'Canonical funding status requires an active registered source';
  END IF;

  INSERT INTO public.funding_source_checks (
    check_key, opportunity_id, source_id, source_url, checked_at, http_status,
    content_type, content_bytes, source_fingerprint, extracted_signals,
    classified_status, error_class
  ) VALUES (
    _check_key, _opportunity_id, _source_id, _source_url, COALESCE(_checked_at, now()),
    _http_status, _content_type, _content_bytes, _source_fingerprint,
    COALESCE(_extracted_signals, '{}'::jsonb), _classified_status, _error_class
  )
  ON CONFLICT (check_key) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN RETURN false; END IF;

  IF _apply_canonical THEN
    UPDATE public.funding_opportunities
    SET application_status = _classified_status,
        status_checked_at = COALESCE(_checked_at, now()),
        status_evidence_url = _status_evidence_url,
        opens_at = _opens_at,
        deadline_at = _deadline_at,
        deadline_timezone = _deadline_timezone,
        deadline_status = _deadline_status,
        current_cycle_label = _current_cycle_label,
        application_url = _application_url,
        eligibility_rules = COALESCE(_eligibility_rules, '{}'::jsonb),
        eligibility_evidence = COALESCE(_eligibility_evidence, '{}'::jsonb),
        eligibility_verified_at = COALESCE(_eligibility_verified_at, _checked_at, now()),
        eligibility_evidence_url = COALESCE(_eligibility_evidence_url, _status_evidence_url),
        updated_at = now()
    WHERE id = _opportunity_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Funding opportunity not found'; END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_funding_status_check(
  UUID, UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, INTEGER, TEXT, JSONB,
  TEXT, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT,
  JSONB, JSONB, TIMESTAMPTZ, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_funding_status_check(
  UUID, UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, INTEGER, TEXT, JSONB,
  TEXT, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT,
  JSONB, JSONB, TIMESTAMPTZ, TEXT
) TO service_role;

COMMENT ON COLUMN public.funding_opportunities.eligibility_rules IS
  'Deterministically normalized hard eligibility rules derived only from exact authoritative-source quotes.';
COMMENT ON COLUMN public.funding_opportunities.eligibility_evidence IS
  'Exact authoritative-source quote buckets supporting eligibility_rules.';
COMMENT ON COLUMN public.funding_opportunities.eligibility_verified_at IS
  'Timestamp of the authoritative source check that produced eligibility_rules.';
