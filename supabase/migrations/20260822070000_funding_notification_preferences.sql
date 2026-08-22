-- P0-C high-signal Funding Radar notifications.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS email_new_matches BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_deadline_alerts BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('watchlist_opened','closing_soon','deadline_changed')),
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','suppressed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notification_events_user_created_idx
  ON public.notification_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_events_pending_idx
  ON public.notification_events (status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_events FROM anon;
GRANT SELECT ON public.notification_events TO authenticated;
GRANT ALL ON public.notification_events TO service_role;

DROP POLICY IF EXISTS "Members read own notification events" ON public.notification_events;
CREATE POLICY "Members read own notification events"
  ON public.notification_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Queue transition notifications for saved/preparing opportunities only. Delivery
-- remains transport-owned; this RPC is deterministic, preference-aware and idempotent.
CREATE OR REPLACE FUNCTION public.enqueue_funding_transition_notifications(
  _opportunity_id UUID,
  _previous_status TEXT,
  _next_status TEXT,
  _previous_deadline_at TIMESTAMPTZ,
  _next_deadline_at TIMESTAMPTZ,
  _transition_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  IF _previous_status NOT IN ('open','closing_soon','rolling','upcoming','closed','paused','unknown')
     OR _next_status NOT IN ('open','closing_soon','rolling','upcoming','closed','paused','unknown') THEN
    RAISE EXCEPTION 'Invalid funding status';
  END IF;

  INSERT INTO public.notification_events(user_id, opportunity_id, event_type, dedupe_key, metadata)
  SELECT
    state.user_id,
    state.opportunity_id,
    CASE
      WHEN _next_status = 'open'
       AND _previous_status NOT IN ('open','closing_soon','rolling')
       AND COALESCE(pref.email_new_matches, true)
        THEN 'watchlist_opened'
      WHEN _next_status = 'closing_soon'
       AND _previous_status <> 'closing_soon'
       AND COALESCE(pref.email_deadline_alerts, true)
        THEN 'closing_soon'
      WHEN _previous_deadline_at IS NOT NULL
       AND _next_deadline_at IS NOT NULL
       AND _previous_deadline_at IS DISTINCT FROM _next_deadline_at
       AND COALESCE(pref.email_deadline_alerts, true)
        THEN 'deadline_changed'
      ELSE NULL
    END,
    state.user_id::text || ':' || state.opportunity_id::text || ':' || _transition_key,
    jsonb_build_object(
      'previous_status', _previous_status,
      'next_status', _next_status,
      'deadline_changed', _previous_deadline_at IS DISTINCT FROM _next_deadline_at
    )
  FROM public.member_opportunity_state state
  LEFT JOIN public.user_preferences pref ON pref.user_id = state.user_id
  WHERE state.opportunity_id = _opportunity_id
    AND state.state IN ('saved','preparing')
    AND (
      (_next_status = 'open' AND _previous_status NOT IN ('open','closing_soon','rolling') AND COALESCE(pref.email_new_matches, true))
      OR (_next_status = 'closing_soon' AND _previous_status <> 'closing_soon' AND COALESCE(pref.email_deadline_alerts, true))
      OR (_previous_deadline_at IS NOT NULL AND _next_deadline_at IS NOT NULL AND _previous_deadline_at IS DISTINCT FROM _next_deadline_at AND COALESCE(pref.email_deadline_alerts, true))
    )
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_funding_transition_notifications(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_funding_transition_notifications(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO service_role;

COMMENT ON TABLE public.notification_events IS
  'Preference-aware, deduplicated Funding Radar notification queue. Contains status metadata only; never raw source text.';
