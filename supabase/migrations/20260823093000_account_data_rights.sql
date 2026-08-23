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
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'prepare_account_deletion is service-role only';
  END IF;

  -- Raw webhook payloads may contain provider/customer PII. Once the account is
  -- being deleted, keep the normalized payment ledger rather than raw webhook
  -- evidence tied to its references.
  DELETE FROM public.payment_webhook_events
  WHERE reference IN (
    SELECT reference FROM public.payments WHERE user_id = _user_id
  );

  -- Preserve the minimum ledger needed for reconciliation/accounting while
  -- unlinking it from the deleted account and removing raw provider payloads.
  UPDATE public.payments
  SET user_id = NULL,
      gateway_response = NULL,
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prepare_account_deletion(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(UUID) TO service_role;

COMMENT ON FUNCTION public.prepare_account_deletion(UUID) IS
  'Service-only pre-delete sanitization: removes raw webhook payloads and detaches the retained minimal payment ledger before auth user deletion.';
