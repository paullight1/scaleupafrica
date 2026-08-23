-- P0-C Funding Radar notification delivery leases/retries.
-- Queue creation/preferences live in 20260822070000_funding_notification_preferences.sql.

ALTER TABLE public.notification_events
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0
    CHECK (attempt_count >= 0),
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS notification_events_claim_idx
  ON public.notification_events (status, processing_at, created_at)
  WHERE status = 'pending';

-- Atomically lease a bounded batch. Rows abandoned by a crashed worker are
-- eligible again after 10 minutes. attempt_count increments at claim time so a
-- crash after Resend accepted a message cannot spin forever; the Resend
-- idempotency key is derived from event id and prevents duplicate delivery.
CREATE OR REPLACE FUNCTION public.claim_funding_notification_events(_limit INTEGER DEFAULT 25)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  opportunity_id UUID,
  event_type TEXT,
  dedupe_key TEXT,
  metadata JSONB,
  attempt_count INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT event.id
    FROM public.notification_events event
    WHERE event.status = 'pending'
      AND event.attempt_count < 3
      AND (
        event.processing_at IS NULL
        OR event.processing_at < now() - interval '10 minutes'
      )
    ORDER BY event.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(_limit, 25), 1), 25)
  ), claimed AS (
    UPDATE public.notification_events event
    SET processing_at = now(),
        attempt_count = event.attempt_count + 1,
        last_error = NULL
    FROM candidates
    WHERE event.id = candidates.id
    RETURNING event.id, event.user_id, event.opportunity_id, event.event_type,
              event.dedupe_key, event.metadata, event.attempt_count, event.created_at
  )
  SELECT claimed.id, claimed.user_id, claimed.opportunity_id, claimed.event_type,
         claimed.dedupe_key, claimed.metadata, claimed.attempt_count, claimed.created_at
  FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_funding_notification_events(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_funding_notification_events(INTEGER)
  TO service_role;

COMMENT ON FUNCTION public.claim_funding_notification_events(INTEGER) IS
  'Service-role-only, SKIP LOCKED lease for at-most-25 Funding Radar notification events.';
