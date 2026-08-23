-- Recurring Bachs memberships.
-- Bachs is the billing authority; Cresciva stores a durable projection of the
-- customer/subscription/invoice state and grants access only after invoice.paid.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS bachs_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS bachs_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS bachs_initial_reference TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_bachs_event_at TIMESTAMPTZ;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_bachs_subscription_key
  ON public.subscriptions (bachs_subscription_id)
  WHERE bachs_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_bachs_customer_idx
  ON public.subscriptions (bachs_customer_id)
  WHERE bachs_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_bachs_invoice_key
  ON public.payments (provider, provider_invoice_id)
  WHERE provider_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_bachs_subscription_idx
  ON public.payments (provider_subscription_id, created_at DESC)
  WHERE provider_subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_bachs_subscription(
  _user_id UUID,
  _bachs_customer_id TEXT,
  _bachs_subscription_id TEXT,
  _bachs_initial_reference TEXT,
  _plan_code TEXT,
  _billing_status TEXT,
  _billing_email TEXT,
  _current_period_start TIMESTAMPTZ,
  _current_period_end TIMESTAMPTZ,
  _next_payment_at TIMESTAMPTZ,
  _cancel_at_period_end BOOLEAN,
  _event_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated_id UUID;
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    has_access,
    expires_at,
    plan_code,
    billing_status,
    auto_renew,
    billing_email,
    next_payment_at,
    bachs_customer_id,
    bachs_subscription_id,
    bachs_initial_reference,
    current_period_start,
    cancel_at_period_end,
    last_bachs_event_at
  ) VALUES (
    _user_id,
    false,
    _current_period_end,
    _plan_code,
    _billing_status,
    NOT _cancel_at_period_end,
    _billing_email,
    _next_payment_at,
    _bachs_customer_id,
    _bachs_subscription_id,
    _bachs_initial_reference,
    _current_period_start,
    _cancel_at_period_end,
    _event_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    expires_at = EXCLUDED.expires_at,
    plan_code = EXCLUDED.plan_code,
    billing_status = EXCLUDED.billing_status,
    auto_renew = EXCLUDED.auto_renew,
    billing_email = COALESCE(EXCLUDED.billing_email, public.subscriptions.billing_email),
    next_payment_at = EXCLUDED.next_payment_at,
    bachs_customer_id = COALESCE(EXCLUDED.bachs_customer_id, public.subscriptions.bachs_customer_id),
    bachs_subscription_id = COALESCE(EXCLUDED.bachs_subscription_id, public.subscriptions.bachs_subscription_id),
    bachs_initial_reference = COALESCE(EXCLUDED.bachs_initial_reference, public.subscriptions.bachs_initial_reference),
    current_period_start = EXCLUDED.current_period_start,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    last_bachs_event_at = EXCLUDED.last_bachs_event_at,
    has_access = CASE
      WHEN EXCLUDED.billing_status = 'canceled' AND NOT EXCLUDED.cancel_at_period_end THEN false
      WHEN public.subscriptions.has_access
        AND EXCLUDED.expires_at IS NOT NULL
        AND EXCLUDED.expires_at > now() THEN true
      ELSE false
    END
  WHERE public.subscriptions.last_bachs_event_at IS NULL
     OR EXCLUDED.last_bachs_event_at IS NULL
     OR EXCLUDED.last_bachs_event_at >= public.subscriptions.last_bachs_event_at
  RETURNING id INTO _updated_id;

  RETURN _updated_id IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_bachs_invoice_paid(
  _user_id UUID,
  _reference TEXT,
  _provider_invoice_id TEXT,
  _provider_charge_id TEXT,
  _provider_subscription_id TEXT,
  _plan_code TEXT,
  _amount BIGINT,
  _currency TEXT,
  _channel TEXT,
  _paid_at TIMESTAMPTZ,
  _period_start TIMESTAMPTZ,
  _period_end TIMESTAMPTZ,
  _next_payment_at TIMESTAMPTZ,
  _gateway_response JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment_id UUID;
  _subscription_id UUID;
BEGIN
  SELECT id INTO _payment_id
    FROM public.payments
    WHERE provider = 'bachs'
      AND provider_invoice_id = _provider_invoice_id
    FOR UPDATE;

  IF _payment_id IS NOT NULL THEN
    RETURN _payment_id;
  END IF;

  SELECT id INTO _payment_id
    FROM public.payments
    WHERE provider = 'bachs' AND reference = _reference
    FOR UPDATE;

  IF _payment_id IS NULL THEN
    INSERT INTO public.payments (
      user_id,
      provider,
      reference,
      plan_code,
      amount,
      currency,
      status,
      channel,
      paid_at,
      gateway_response,
      provider_invoice_id,
      provider_charge_id,
      provider_subscription_id
    ) VALUES (
      _user_id,
      'bachs',
      _reference,
      _plan_code,
      _amount,
      _currency,
      'success',
      _channel,
      COALESCE(_paid_at, now()),
      _gateway_response,
      _provider_invoice_id,
      _provider_charge_id,
      _provider_subscription_id
    )
    RETURNING id INTO _payment_id;
  ELSE
    UPDATE public.payments
      SET user_id = _user_id,
          plan_code = _plan_code,
          amount = _amount,
          currency = _currency,
          status = 'success',
          channel = COALESCE(_channel, channel),
          paid_at = COALESCE(paid_at, _paid_at, now()),
          gateway_response = _gateway_response,
          provider_invoice_id = _provider_invoice_id,
          provider_charge_id = _provider_charge_id,
          provider_subscription_id = _provider_subscription_id
      WHERE id = _payment_id;
  END IF;

  UPDATE public.subscriptions
    SET has_access = true,
        expires_at = _period_end,
        plan_code = _plan_code,
        billing_status = 'active',
        auto_renew = NOT cancel_at_period_end,
        current_period_start = _period_start,
        next_payment_at = _next_payment_at
    WHERE user_id = _user_id
    RETURNING id INTO _subscription_id;

  IF _subscription_id IS NULL THEN
    RAISE EXCEPTION 'record_bachs_invoice_paid: no subscription row for user %', _user_id;
  END IF;

  RETURN _payment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_bachs_subscription(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_bachs_invoice_paid(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_bachs_subscription(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_bachs_invoice_paid(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO service_role;
