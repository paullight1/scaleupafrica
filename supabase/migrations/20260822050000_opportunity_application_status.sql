-- P0-B Opportunity Status Engine
-- Separates programme verification from current application-cycle status.

ALTER TABLE public.funding_opportunities
  ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (application_status IN ('open','closing_soon','rolling','upcoming','closed','paused','unknown')),
  ADD COLUMN IF NOT EXISTS status_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline_timezone TEXT,
  ADD COLUMN IF NOT EXISTS deadline_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (deadline_status IN ('confirmed','rolling','unknown')),
  ADD COLUMN IF NOT EXISTS current_cycle_label TEXT,
  ADD COLUMN IF NOT EXISTS application_url TEXT;

CREATE TABLE IF NOT EXISTS public.funding_source_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key UUID NOT NULL UNIQUE,
  opportunity_id UUID NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.funding_sources(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  http_status INTEGER,
  content_type TEXT,
  content_bytes INTEGER CHECK (content_bytes IS NULL OR content_bytes >= 0),
  source_fingerprint TEXT,
  extracted_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  classified_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (classified_status IN ('open','closing_soon','rolling','upcoming','closed','paused','unknown')),
  error_class TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_open_status_idx
  ON public.funding_opportunities (application_status, deadline_at)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS funding_status_checked_idx
  ON public.funding_opportunities (application_status, status_checked_at);
CREATE INDEX IF NOT EXISTS funding_source_checks_opportunity_idx
  ON public.funding_source_checks (opportunity_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS funding_source_checks_source_idx
  ON public.funding_source_checks (source_id, checked_at DESC)
  WHERE source_id IS NOT NULL;

ALTER TABLE public.funding_source_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.funding_source_checks FROM anon, authenticated;
GRANT SELECT ON public.funding_source_checks TO authenticated;
GRANT ALL ON public.funding_source_checks TO service_role;

DROP POLICY IF EXISTS "Staff read funding source checks" ON public.funding_source_checks;
CREATE POLICY "Staff read funding source checks"
  ON public.funding_source_checks
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- URL/provenance edits can invalidate a previously correct OPEN decision. This
-- trigger clears current-cycle state before the row can be served again.
CREATE OR REPLACE FUNCTION public.invalidate_funding_application_status_on_provenance_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.url IS DISTINCT FROM OLD.url
     OR NEW.source_url IS DISTINCT FROM OLD.source_url
     OR (OLD.verification_status = 'verified' AND NEW.verification_status <> 'verified') THEN
    NEW.application_status := 'unknown';
    NEW.status_checked_at := NULL;
    NEW.status_evidence_url := NULL;
    NEW.opens_at := NULL;
    NEW.deadline_at := NULL;
    NEW.deadline_timezone := NULL;
    NEW.deadline_status := 'unknown';
    NEW.current_cycle_label := NULL;
    NEW.application_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS funding_application_status_provenance_guard ON public.funding_opportunities;
CREATE TRIGGER funding_application_status_provenance_guard
BEFORE UPDATE ON public.funding_opportunities
FOR EACH ROW EXECUTE FUNCTION public.invalidate_funding_application_status_on_provenance_change();

-- Append a source-check attempt and, only for a successful extraction/classification,
-- apply the canonical cycle state in the same transaction. check_key makes retries
-- idempotent: a repeated attempt key cannot create a second transition.
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
  _application_url TEXT DEFAULT NULL
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

  IF _apply_canonical AND (
    _source_id IS NULL
    OR NOT public.funding_source_is_registered(_source_url)
    OR NOT EXISTS (
      SELECT 1
      FROM public.funding_sources source
      WHERE source.id = _source_id
        AND source.active = true
        AND substring(lower(btrim(source.base_url)) FROM '^(https?://[^/?#]+)') =
            substring(lower(btrim(_source_url)) FROM '^(https?://[^/?#]+)')
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
        updated_at = now()
    WHERE id = _opportunity_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Funding opportunity not found'; END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_funding_status_check(
  UUID, UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, INTEGER, TEXT, JSONB,
  TEXT, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_funding_status_check(
  UUID, UUID, UUID, TEXT, TIMESTAMPTZ, INTEGER, TEXT, INTEGER, TEXT, JSONB,
  TEXT, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) TO service_role;

-- Database-level invalidation guard for direct registry updates. This protects
-- against future staff/service code bypassing the higher-level admin RPC.
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
        updated_at = now()
    WHERE source_url LIKE OLD.base_url || '%';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS funding_sources_trust_invalidation ON public.funding_sources;
CREATE TRIGGER funding_sources_trust_invalidation
AFTER UPDATE OF base_url, active ON public.funding_sources
FOR EACH ROW EXECUTE FUNCTION public.invalidate_funding_trust_on_source_registry_change();

REVOKE ALL ON FUNCTION public.invalidate_funding_trust_on_source_registry_change()
  FROM PUBLIC, anon, authenticated;

-- Source registry edits are privileged operations. If a base URL changes, or a
-- source is disabled, all opportunities tied to the old trusted scope lose
-- verification and current-cycle trust until fresh source evidence is collected.
CREATE OR REPLACE FUNCTION public.update_funding_source_and_invalidate(
  _source_id UUID,
  _name TEXT,
  _base_url TEXT,
  _active BOOLEAN
)
RETURNS public.funding_sources
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_source public.funding_sources%ROWTYPE;
  new_source public.funding_sources%ROWTYPE;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _base_url IS NULL OR _base_url !~* '^https?://' THEN
    RAISE EXCEPTION 'A valid HTTP(S) source URL is required';
  END IF;

  SELECT * INTO old_source FROM public.funding_sources WHERE id = _source_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Funding source not found'; END IF;

  UPDATE public.funding_sources
  SET name = NULLIF(btrim(_name), ''),
      base_url = btrim(_base_url),
      active = COALESCE(_active, true),
      updated_at = now()
  WHERE id = _source_id
  RETURNING * INTO new_source;

  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'update_funding_source',
    'funding_source',
    _source_id::text,
    jsonb_build_object(
      'base_url_changed', new_source.base_url IS DISTINCT FROM old_source.base_url,
      'active_changed', new_source.active IS DISTINCT FROM old_source.active,
      'active', new_source.active
    )
  );

  RETURN new_source;
END;
$$;

REVOKE ALL ON FUNCTION public.update_funding_source_and_invalidate(UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_funding_source_and_invalidate(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

COMMENT ON COLUMN public.funding_opportunities.application_status IS
  'Current-cycle application state. Independent of verification_status and always freshness-gated at read time.';
COMMENT ON COLUMN public.funding_opportunities.deadline_status IS
  'Whether deadline_at is source-confirmed, explicitly rolling, or unknown. Historical/typical dates must never be stored as confirmed current deadlines.';
COMMENT ON TABLE public.funding_source_checks IS
  'Append-only evidence/check history for authoritative funding source refreshes.';