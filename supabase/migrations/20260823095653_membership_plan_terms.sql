-- Membership plan terms: monthly, quarterly, and annual one-time purchases.
-- The term is derived from the server-created payment row; callers cannot
-- choose an arbitrary access duration.

CREATE OR REPLACE FUNCTION public.grant_membership_access(_payment_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.payments;
  _term INTERVAL;
BEGIN
  UPDATE public.payments
    SET status = 'success', paid_at = COALESCE(paid_at, now())
    WHERE id = _payment_id AND status <> 'success'
    RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RETURN false;
  END IF;

  _term := CASE _row.plan_code
    WHEN 'monthly' THEN INTERVAL '1 month'
    WHEN 'quarterly' THEN INTERVAL '3 months'
    WHEN 'annual' THEN INTERVAL '12 months'
    ELSE NULL
  END;

  IF _term IS NULL THEN
    RAISE EXCEPTION 'grant_membership_access: unsupported plan %', _row.plan_code;
  END IF;

  UPDATE public.subscriptions
    SET has_access = true,
        expires_at = GREATEST(COALESCE(expires_at, now()), now()) + _term
    WHERE user_id = _row.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'grant_membership_access: no subscription row for user %', _row.user_id;
  END IF;

  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.grant_membership_access(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_membership_access(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_membership_access(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_membership_access(UUID) TO service_role;

-- Keep the historical RPC name available for already-deployed callers while
-- routing it through the duration-aware implementation.
CREATE OR REPLACE FUNCTION public.grant_annual_access(_payment_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.grant_membership_access(_payment_id);
END; $$;

REVOKE EXECUTE ON FUNCTION public.grant_annual_access(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_annual_access(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_annual_access(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_annual_access(UUID) TO service_role;
