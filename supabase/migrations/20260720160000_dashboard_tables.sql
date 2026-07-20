-- ============================================================================
-- Plan 03 — User Dashboard foundation tables
-- Owner: Plan 03 (see docs/plans/00-FOUNDATION.md §8.3). One file, no collisions.
-- Adds: saved_opportunities (pillar A), user_preferences (pillar C).
-- NOTE: increment_profile_views() is owned by Plan 04 (20260720130000_directory_search_slug.sql);
--       this plan only CALLS that RPC, it does NOT create it here.
-- After applying: regenerate src/integrations/supabase/types.ts (never hand-edit).
-- ============================================================================

-- 1. Saved funding opportunities (pillar A) ---------------------------------
CREATE TABLE public.saved_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);

ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.saved_opportunities TO authenticated;
GRANT ALL ON public.saved_opportunities TO service_role;

CREATE POLICY "Users manage own saved opportunities"
  ON public.saved_opportunities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX saved_opportunities_user_idx
  ON public.saved_opportunities (user_id, created_at DESC);

-- 2. User preferences (pillar C — notification prefs) -----------------------
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_new_funding BOOLEAN NOT NULL DEFAULT true,
  email_product_updates BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

CREATE POLICY "Users manage own preferences"
  ON public.user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tg_set_updated_at() already exists (20260713035330_*.sql)
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
