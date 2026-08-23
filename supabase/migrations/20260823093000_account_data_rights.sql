-- Cresciva account data-rights support.
--
-- Account deletion must not destroy the minimum payment ledger needed for
-- accounting/reconciliation, while raw provider payloads and the link to the
-- deleted account must not survive unnecessarily.

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE public.payments
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.prepare_account_deletion(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _email TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'prepare_account_deletion is service-role only';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _user_id;

  DELETE FROM public.payment_webhook_events
  WHERE reference IN (
    SELECT reference FROM public.payments WHERE user_id = _user_id
  );

  UPDATE public.payments
  SET user_id = NULL,
      gateway_response = NULL,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Aggregate analytics can remain useful after a deletion request, but they no
  -- longer need an account identifier.
  UPDATE public.analytics_events SET user_id = NULL WHERE user_id = _user_id;

  IF _email IS NOT NULL THEN
    DELETE FROM public.leads WHERE lower(email) = lower(_email);
    DELETE FROM public.email_events WHERE lower(to_email) = lower(_email);
    DELETE FROM public.newsletter_subscribers WHERE lower(email) = lower(_email);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prepare_account_deletion(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(UUID) TO service_role;

COMMENT ON FUNCTION public.prepare_account_deletion(UUID) IS
  'Service-only pre-delete sanitization: removes direct-email operational rows/raw webhook payloads, anonymizes analytics, and detaches the retained minimal payment ledger before auth user deletion.';
