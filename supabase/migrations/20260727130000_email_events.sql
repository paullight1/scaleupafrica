-- ---------------------------------------------------------------------------
-- Transactional email audit log + abuse throttle.
--
-- Every outbound message written by _shared/email/dispatch.ts lands here, sent
-- or not. Two jobs:
--   1. Support/debugging — "did the receipt actually go out?" is answerable
--      without opening the Resend dashboard.
--   2. Rate limiting — `send-email` is a PUBLIC endpoint (no JWT: the contact
--      form and newsletter box are used by signed-out visitors), so it counts
--      recent rows for the caller's IP hash before dispatching anything.
--
-- The IP is stored ONLY as a salted hash. We never need the raw address, and a
-- table of visitor IPs is a liability, not an asset.
-- ---------------------------------------------------------------------------

CREATE TABLE public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed', 'skipped')),
  provider_id TEXT,                    -- Resend message id, when the send succeeded
  error TEXT,
  ip_hash TEXT,                        -- SHA-256(ip + secret); never the raw IP
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Only the service role writes; only admins read. No anon/authenticated INSERT:
-- unlike `leads`, nothing here is client-submitted.
GRANT SELECT ON public.email_events TO authenticated;
GRANT ALL ON public.email_events TO service_role;

CREATE POLICY "Admins read email events"
  ON public.email_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Throttle lookup: "how many sends from this IP in the last hour".
CREATE INDEX email_events_ip_created_idx
  ON public.email_events (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

-- Support lookup: "everything we ever sent this address".
CREATE INDEX email_events_to_created_idx
  ON public.email_events (to_email, created_at DESC);

CREATE INDEX email_events_kind_created_idx
  ON public.email_events (kind, created_at DESC);

COMMENT ON TABLE public.email_events IS
  'Audit log of every transactional email dispatched via the send-email edge function. Service-role write, admin read.';

-- ---------------------------------------------------------------------------
-- Close the direct-write path now that `send-email` owns lead capture.
--
-- The contact form, newsletter box and gated-resource form used to INSERT from
-- the browser. They now POST to the send-email edge function, which writes the
-- row with the service role AND sends the notification in the same step.
--
-- Leaving the anon INSERT grant in place would make the honeypot and the per-IP
-- throttle trivially bypassable — and would let a row land that nobody is ever
-- told about, which is the exact failure the refactor removed. SELECT and UPDATE
-- are untouched: the admin panel still reads and triages both tables.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
REVOKE INSERT ON public.leads FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
REVOKE INSERT ON public.newsletter_subscribers FROM anon, authenticated;
