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

COMMENT ON COLUMN public.funding_opportunities.application_status IS
  'Current-cycle application state. Independent of verification_status and always freshness-gated at read time.';
COMMENT ON COLUMN public.funding_opportunities.deadline_status IS
  'Whether deadline_at is source-confirmed, explicitly rolling, or unknown. Historical/typical dates must never be stored as confirmed current deadlines.';
COMMENT ON TABLE public.funding_source_checks IS
  'Append-only evidence/check history for authoritative funding source refreshes.';
