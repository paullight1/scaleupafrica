-- Coupons grant membership access without changing payment-provider billing state.
-- The live billing_status constraint accepts provider states, not trialing.
CREATE OR REPLACE FUNCTION public.redeem_membership_coupon(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _caller uuid := auth.uid();
  _coupon public.membership_coupons;
  _receipt public.coupon_redemptions;
  _sub public.subscriptions;
  _until timestamptz;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Sign in to redeem a coupon.' USING ERRCODE = '42501'; END IF;
  IF _code IS NULL OR length(btrim(_code)) NOT BETWEEN 4 AND 32 THEN RAISE EXCEPTION 'Invalid coupon code.'; END IF;
  -- Lock the coupon before checking its usage counter. This serializes competing redeemers.
  SELECT * INTO _coupon FROM public.membership_coupons WHERE code = upper(btrim(_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid coupon code.'; END IF;
  SELECT * INTO _receipt FROM public.coupon_redemptions WHERE coupon_id = _coupon.id AND user_id = _caller;
  -- An HTTP retry returns the original receipt, including after expiry/revocation. Never grants twice.
  IF FOUND THEN RETURN jsonb_build_object('access_expires_at', _receipt.access_expires_at, 'already_redeemed', true); END IF;
  IF NOT _coupon.active THEN RAISE EXCEPTION 'This coupon has been revoked.'; END IF;
  IF _coupon.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'This coupon has expired.'; END IF;
  IF _coupon.max_redemptions IS NOT NULL AND _coupon.redemption_count >= _coupon.max_redemptions THEN
    RAISE EXCEPTION 'This coupon has already been used.';
  END IF;
  -- Also serialize different coupons redeemed concurrently for the same account.
  SELECT * INTO _sub FROM public.subscriptions WHERE user_id = _caller FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membership record unavailable. Please contact support.'; END IF;
  IF _sub.has_access AND _sub.expires_at IS NULL THEN RAISE EXCEPTION 'You already have unlimited membership access.'; END IF;
  _until := CASE WHEN _sub.has_access AND _sub.expires_at > now() THEN _sub.expires_at ELSE now() END + interval '7 days';
  UPDATE public.subscriptions SET has_access = true, expires_at = _until
    WHERE user_id = _caller;
  INSERT INTO public.coupon_redemptions(coupon_id, user_id, access_expires_at) VALUES (_coupon.id, _caller, _until);
  UPDATE public.membership_coupons SET redemption_count = redemption_count + 1 WHERE id = _coupon.id;
  RETURN jsonb_build_object('access_expires_at', _until, 'already_redeemed', false);
END;
$$;
