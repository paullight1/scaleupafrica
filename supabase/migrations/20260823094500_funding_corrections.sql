-- Member-reported funding corrections.
-- Reports never change canonical opportunity trust/status directly; they enter a
-- staff review queue so one malicious report cannot demote an opportunity.

CREATE TABLE IF NOT EXISTS public.funding_opportunity_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('closed','deadline','eligibility','source','other')),
  message TEXT CHECK (message IS NULL OR char_length(message) <= 1000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS funding_opportunity_reports_status_created_idx
  ON public.funding_opportunity_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS funding_opportunity_reports_user_created_idx
  ON public.funding_opportunity_reports (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS funding_opportunity_reports_active_user_opp_idx
  ON public.funding_opportunity_reports (user_id, opportunity_id)
  WHERE status IN ('new','reviewing');

ALTER TABLE public.funding_opportunity_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.funding_opportunity_reports TO authenticated;
GRANT ALL ON public.funding_opportunity_reports TO service_role;

CREATE POLICY "Members submit own funding reports"
  ON public.funding_opportunity_reports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members read own funding reports"
  ON public.funding_opportunity_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "Staff update funding reports"
  ON public.funding_opportunity_reports FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

COMMENT ON TABLE public.funding_opportunity_reports IS
  'Member funding-data correction reports. Reports require staff/source review before canonical opportunity state changes.';
