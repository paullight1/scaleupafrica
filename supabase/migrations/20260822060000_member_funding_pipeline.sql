-- P0-C Core Funding Subscription Experience
-- Member-local workflow state. This table never owns canonical opportunity truth.

CREATE TABLE IF NOT EXISTS public.member_opportunity_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'saved'
    CHECK (state IN ('saved','preparing','applied','won','rejected','dismissed')),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  applied_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS member_opportunity_state_user_updated_idx
  ON public.member_opportunity_state (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS member_opportunity_state_opportunity_idx
  ON public.member_opportunity_state (opportunity_id, state);

ALTER TABLE public.member_opportunity_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_opportunity_state FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_opportunity_state TO authenticated;
GRANT ALL ON public.member_opportunity_state TO service_role;

DROP POLICY IF EXISTS "Members read own opportunity state" ON public.member_opportunity_state;
CREATE POLICY "Members read own opportunity state"
  ON public.member_opportunity_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members create own opportunity state" ON public.member_opportunity_state;
CREATE POLICY "Members create own opportunity state"
  ON public.member_opportunity_state FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members update own opportunity state" ON public.member_opportunity_state;
CREATE POLICY "Members update own opportunity state"
  ON public.member_opportunity_state FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members delete own opportunity state" ON public.member_opportunity_state;
CREATE POLICY "Members delete own opportunity state"
  ON public.member_opportunity_state FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Hard guard: state transitions may update only the member-local row. There is no
-- trigger from this table into funding_opportunities, recommendation eligibility,
-- verification or current-cycle application status.
COMMENT ON TABLE public.member_opportunity_state IS
  'Member-local saved/application workflow. It must never mutate canonical funding truth or deterministic eligibility.';
