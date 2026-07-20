-- 20260720140000_funding_feed_cache.sql
-- Plan 05 (Funding feature), FOUNDATION §8.3.
-- Combines into ONE migration file (per the reconciliation table):
--   1. funding_results  — per-user AI deep-search cache (TTL) written by the
--      aggregate-funding edge function (service role); users read only their own.
--   2. Re-grant has_active_subscription() to authenticated so it is the single
--      canonical server-side subscription rule (edge fn calls it via RPC, and the
--      member-gated feed RLS below evaluates it as the querying user).
--   3. funding_opportunities verification metadata (last_verified_at, source,
--      details, batch_id, verified_by) + member-gated RLS (published rows become a
--      paid member benefit, no longer anon-readable).
--
-- After applying, regenerate src/integrations/supabase/types.ts (never hand-edit).

-- ---------------------------------------------------------------------------
-- 1. Per-user AI deep-search cache
-- ---------------------------------------------------------------------------
CREATE TABLE public.funding_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords_normalized TEXT NOT NULL,          -- normalizeKeywords() output; cache key
  keywords_raw TEXT NOT NULL,
  opportunities JSONB NOT NULL,               -- validated Opportunity[] (post-Zod, post-sanitize)
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  UNIQUE (user_id, keywords_normalized)
);

CREATE INDEX funding_results_user_created_idx
  ON public.funding_results (user_id, created_at DESC);  -- rate-limit + latest-result lookups

ALTER TABLE public.funding_results ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.funding_results TO authenticated;
GRANT ALL ON public.funding_results TO service_role;

CREATE POLICY "Users read their own funding results"
  ON public.funding_results FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policy for authenticated: all writes are service-role only.

-- ---------------------------------------------------------------------------
-- 2. Canonical server-side subscription rule
-- has_active_subscription() was revoked from authenticated in
-- 20260713035351. Re-grant it: it is SECURITY DEFINER + read-only, is now the
-- ONLY server-side subscription rule (edge fn calls it via RPC), and the feed
-- RLS policy below runs as the querying user and needs EXECUTE.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. funding_opportunities verification metadata + member-gated RLS
-- Extends the existing admin-curated table (20260720120000) rather than adding
-- a parallel feed table — trivially portable to Drizzle in Plan 07.
-- ---------------------------------------------------------------------------
ALTER TABLE public.funding_opportunities
  ADD COLUMN details JSONB NOT NULL DEFAULT '{}'::jsonb,  -- funder_about, sdg_focus,
                                                          -- past_recipients, application_tips,
                                                          -- travel_component, important_notes
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai')),
  ADD COLUMN batch_id UUID,                               -- groups one weekly generation
  ADD COLUMN last_verified_at TIMESTAMPTZ,                -- set by staff on spot-check
  ADD COLUMN verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- The feed becomes a member benefit: gate published rows behind an active
-- subscription. Replaces the anon-readable policy from the admin migration.
DROP POLICY "Public read published funding" ON public.funding_opportunities;
REVOKE SELECT ON public.funding_opportunities FROM anon;

CREATE POLICY "Members read published funding"
  ON public.funding_opportunities FOR SELECT TO authenticated
  USING (
    (status = 'published' AND public.has_active_subscription(auth.uid()))
    OR public.is_staff(auth.uid())
  );
-- "Staff manage funding" (ALL, is_staff) policy from the admin migration stays as is.
-- Weekly AI batches land as status='draft', source='ai'; staff publish after a
-- spot-check (status='published', last_verified_at=now(), verified_by=auth.uid()).
