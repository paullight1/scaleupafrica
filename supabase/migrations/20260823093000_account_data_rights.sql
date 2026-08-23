-- Cresciva account data-rights support.
--
-- Database cleanup is bound to the Auth user deletion transaction so a failed
-- auth deletion cannot leave an active account with a partially detached
-- payment/support history. Profile-media storage is removed by the Edge
-- function before requesting the Auth deletion.

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE public.payments
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.sanitize_account_before_auth_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Raw webhook payloads may contain provider/customer PII. Keep the normalized
  -- payment ledger rather than raw webhook evidence after account deletion.
  DELETE FROM public.payment_webhook_events
  WHERE reference IN (
    SELECT reference FROM public.payments WHERE user_id = OLD.id
  );

  -- Preserve the minimum ledger needed for accounting/reconciliation while
  -- removing both the account identifier and raw gateway response. This runs
  -- before the FK's ON DELETE SET NULL action and is part of the same database
  -- transaction as deletion of auth.users.
  UPDATE public.payments
  SET user_id = NULL,
      gateway_response = NULL,
      updated_at = now()
  WHERE user_id = OLD.id;

  -- Aggregate analytics may remain useful after deletion but no longer retain
  -- the account identifier.
  UPDATE public.analytics_events SET user_id = NULL WHERE user_id = OLD.id;

  IF OLD.email IS NOT NULL THEN
    DELETE FROM public.leads WHERE lower(email) = lower(OLD.email);
    DELETE FROM public.email_events WHERE lower(to_email) = lower(OLD.email);
    DELETE FROM public.newsletter_subscribers WHERE lower(email) = lower(OLD.email);
  END IF;

  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sanitize_account_before_auth_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS before_auth_user_delete_sanitize ON auth.users;
CREATE TRIGGER before_auth_user_delete_sanitize
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_account_before_auth_delete();

COMMENT ON FUNCTION public.sanitize_account_before_auth_delete() IS
  'Transactional data-rights cleanup executed with auth user deletion: removes direct-email/raw webhook data, anonymizes analytics and sanitizes the retained payment ledger.';
