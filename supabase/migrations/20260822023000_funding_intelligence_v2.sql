-- Funding Intelligence V2
-- Adds explicit opportunity provenance and structured founder funding preferences.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_stage TEXT
    CHECK (business_stage IS NULL OR business_stage IN ('idea','early','growth','scale')),
  ADD COLUMN IF NOT EXISTS funding_target_usd NUMERIC
    CHECK (funding_target_usd IS NULL OR (funding_target_usd > 0 AND funding_target_usd <= 1000000000)),
  ADD COLUMN IF NOT EXISTS preferred_funding_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS application_readiness TEXT
    CHECK (application_readiness IS NULL OR application_readiness IN ('exploring','preparing','ready'));

ALTER TABLE public.funding_opportunities
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_retrieved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('verified','stale','unverified'));

CREATE INDEX IF NOT EXISTS funding_opportunities_verification_idx
  ON public.funding_opportunities (verification_status, last_verified_at DESC);
CREATE INDEX IF NOT EXISTS funding_opportunities_source_fingerprint_idx
  ON public.funding_opportunities (source_fingerprint)
  WHERE source_fingerprint IS NOT NULL;

UPDATE public.funding_opportunities
SET source_url = url
WHERE source_url IS NULL
  AND url ~* '^https?://'
  AND last_verified_at IS NOT NULL;

UPDATE public.funding_opportunities
SET verification_status = CASE
  WHEN source_url ~* '^https?://'
    AND last_verified_at IS NOT NULL
    AND last_verified_at >= now() - interval '7 days'
    THEN 'verified'
  WHEN source_url ~* '^https?://' AND last_verified_at IS NOT NULL
    THEN 'stale'
  ELSE 'unverified'
END;

-- DB-enforced verification invariant. Existing admin code only stamps
-- last_verified_at; this trigger upgrades that action into a controlled provenance
-- transition and refuses a verification without authoritative URL evidence.
CREATE OR REPLACE FUNCTION public.enforce_funding_provenance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.url IS DISTINCT FROM OLD.url THEN
    IF NEW.source_url IS NOT DISTINCT FROM OLD.source_url THEN
      NEW.source_url := NULL;
    END IF;
    NEW.verification_status := 'unverified';
    NEW.last_verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.source_retrieved_at := NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.source_url IS DISTINCT FROM OLD.source_url THEN
    NEW.verification_status := 'unverified';
    NEW.last_verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.source_retrieved_at := NULL;
  END IF;

  IF NEW.last_verified_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.last_verified_at IS DISTINCT FROM OLD.last_verified_at) THEN
    IF NEW.source_url IS NULL AND NEW.url ~* '^https?://' THEN
      NEW.source_url := NEW.url;
    END IF;
    IF NEW.source_url IS NULL OR NEW.source_url !~* '^https?://' THEN
      RAISE EXCEPTION 'A valid official source URL is required before verification';
    END IF;
    NEW.verification_status := 'verified';
    NEW.source_retrieved_at := COALESCE(NEW.source_retrieved_at, NEW.last_verified_at);
  END IF;

  IF NEW.verification_status = 'verified' AND
     (NEW.source_url IS NULL OR NEW.source_url !~* '^https?://' OR NEW.last_verified_at IS NULL) THEN
    RAISE EXCEPTION 'Verified funding opportunities require source evidence and a verification timestamp';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS funding_opportunities_provenance_guard ON public.funding_opportunities;
CREATE TRIGGER funding_opportunities_provenance_guard
BEFORE INSERT OR UPDATE ON public.funding_opportunities
FOR EACH ROW EXECUTE FUNCTION public.enforce_funding_provenance();

CREATE TABLE IF NOT EXISTS public.funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'official_program'
    CHECK (source_type IN ('official_program','official_funder','government','development_finance','foundation','accelerator')),
  country_focus TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  refresh_interval_hours INTEGER NOT NULL DEFAULT 24
    CHECK (refresh_interval_hours BETWEEN 1 AND 720),
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_url)
);

CREATE INDEX IF NOT EXISTS funding_sources_active_idx
  ON public.funding_sources (active, last_checked_at);

ALTER TABLE public.funding_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.funding_sources FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_sources TO authenticated;
GRANT ALL ON public.funding_sources TO service_role;

DROP POLICY IF EXISTS "Staff manage funding sources" ON public.funding_sources;
CREATE POLICY "Staff manage funding sources"
  ON public.funding_sources
  FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

COMMENT ON COLUMN public.funding_opportunities.source_url IS
  'Authoritative source evidence used for verification.';
COMMENT ON COLUMN public.funding_opportunities.verification_status IS
  'Controlled trust state. verified requires source evidence plus a recent verification timestamp.';
COMMENT ON TABLE public.funding_sources IS
  'Staff-managed registry of authoritative funding sources used for scheduled retrieval and verification.';
