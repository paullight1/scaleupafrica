-- Cresciva recurring Paystack subscriptions.
-- Plans: $10 monthly, $25 quarterly, $90 annually (USD cents).
-- Paystack owns the recurring debit; this database records the subscription
-- identity and grants access only after a verified successful charge.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_code TEXT,
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (billing_status IN ('inactive', 'active', 'attention', 'non-renewing', 'cancelled', 'completed')),
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_email_token TEXT,
  ADD COLUMN IF NOT EXISTS next_payment_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS subscriptions_paystack_customer_idx
  ON public.subscriptions (paystack_customer_code);

-- One atomic access-grant path for every initial and recurring charge.
CREATE OR REPLACE FUNCTION public.grant_subscription_access(_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHEN 'annual' THEN INTERVAL '1 year'
    ELSE NULL
  END;

  IF _term IS NULL THEN
    RAISE EXCEPTION 'grant_subscription_access: unsupported plan %', _row.plan_code;
  END IF;

  UPDATE public.subscriptions
  SET has_access = true,
      plan_code = _row.plan_code,
      billing_status = 'active',
      auto_renew = true,
      expires_at = GREATEST(COALESCE(expires_at, now()), now()) + _term
  WHERE user_id = _row.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'grant_subscription_access: no subscription row for user %', _row.user_id;
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_subscription_access(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_subscription_access(UUID) TO service_role;

-- Preserve the old RPC name for already-deployed callers while moving all
-- future grants to the interval-aware implementation above.
CREATE OR REPLACE FUNCTION public.grant_annual_access(_payment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.grant_subscription_access(_payment_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_annual_access(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_annual_access(UUID) TO service_role;
