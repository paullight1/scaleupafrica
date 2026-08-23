-- Business Enrichment Engine P0-A
-- Persists enrichment runs and evidence-backed identity candidates.
-- Members may read their own enrichment evidence, but orchestration writes are
-- service-role only so browser clients cannot manufacture source-backed facts.

CREATE TABLE IF NOT EXISTS public.business_enrichment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name_input TEXT NOT NULL CHECK (char_length(btrim(business_name_input)) BETWEEN 2 AND 160),
  website_hint TEXT,
  country_hint TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','resolved','ambiguous','not_found','failed')),
  selected_candidate_id UUID,
  candidate_count INTEGER NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  error_class TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.business_enrichment_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.business_enrichment_runs(id) ON DELETE CASCADE,
  canonical_name TEXT NOT NULL CHECK (char_length(btrim(canonical_name)) BETWEEN 1 AND 200),
  website TEXT,
  country TEXT,
  summary TEXT,
  identity_confidence INTEGER NOT NULL CHECK (identity_confidence BETWEEN 0 AND 100),
  source_urls TEXT[] NOT NULL DEFAULT '{}',
  enriched_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  member_state TEXT NOT NULL DEFAULT 'proposed'
    CHECK (member_state IN ('proposed','confirmed','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_enrichment_runs_selected_candidate_fkey'
  ) THEN
    ALTER TABLE public.business_enrichment_runs
      ADD CONSTRAINT business_enrichment_runs_selected_candidate_fkey
      FOREIGN KEY (selected_candidate_id)
      REFERENCES public.business_enrichment_candidates(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS business_enrichment_runs_user_started_idx
  ON public.business_enrichment_runs (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS business_enrichment_candidates_run_idx
  ON public.business_enrichment_candidates (run_id, identity_confidence DESC);

ALTER TABLE public.business_enrichment_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_enrichment_candidates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.business_enrichment_runs FROM anon, authenticated;
REVOKE ALL ON public.business_enrichment_candidates FROM anon, authenticated;
GRANT SELECT ON public.business_enrichment_runs TO authenticated;
GRANT SELECT ON public.business_enrichment_candidates TO authenticated;
GRANT ALL ON public.business_enrichment_runs TO service_role;
GRANT ALL ON public.business_enrichment_candidates TO service_role;

DROP POLICY IF EXISTS "Members read own enrichment runs" ON public.business_enrichment_runs;
CREATE POLICY "Members read own enrichment runs"
  ON public.business_enrichment_runs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Members read own enrichment candidates" ON public.business_enrichment_candidates;
CREATE POLICY "Members read own enrichment candidates"
  ON public.business_enrichment_candidates
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.business_enrichment_runs r
      WHERE r.id = run_id
        AND r.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.business_enrichment_runs IS
  'Member-scoped business identity enrichment executions. Writes are service-role orchestration only.';
COMMENT ON TABLE public.business_enrichment_candidates IS
  'Evidence-backed organisation identity candidates proposed by the enrichment engine.';
COMMENT ON COLUMN public.business_enrichment_candidates.field_evidence IS
  'Field-level provenance map. Proposed evidence is not member-confirmed until member_state=confirmed.';
