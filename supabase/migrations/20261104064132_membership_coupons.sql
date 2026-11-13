-- Free access is an entitlement, not a settled payment. All writes are RPC-only.
CREATE TABLE public.membership_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9-]{3,31}$'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  max_redemptions integer CHECK (max_redemptions IS NULL OR max_redemptions = 1),
  redemption_count integer NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  active boolean NOT NULL DEFAULT true,
  CHECK (max_redemptions IS NULL OR redemption_count <= max_redemptions)
);
CREATE INDEX membership_coupons_created_idx ON public.membership_coupons(created_at DESC, id);
CREATE INDEX membership_coupons_creator_idx ON public.membership_coupons(created_by);

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.membership_coupons(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  access_expires_at timestamptz NOT NULL,
  UNIQUE(coupon_id, user_id)
);
CREATE INDEX coupon_redemptions_user_idx ON public.coupon_redemptions(user_id, access_expires_at DESC);

ALTER TABLE public.membership_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_coupons, public.coupon_redemptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.membership_coupons, public.coupon_redemptions TO authenticated;
GRANT ALL ON public.membership_coupons, public.coupon_redemptions TO service_role;
CREATE POLICY "Admins read coupons" ON public.membership_coupons FOR SELECT TO authenticated
  USING ((SELECT public.is_admin(auth.uid())));
CREATE POLICY "Members read own coupon receipts" ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin(auth.uid())));

CREATE FUNCTION public.admin_generate_membership_coupons(
  _count integer, _expiry text, _unlimited boolean DEFAULT false, _code text DEFAULT NULL
)
RETURNS SETOF public.membership_coupons
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  _caller uuid := auth.uid();
  _deadline timestamptz;
  _custom text := nullif(upper(btrim(_code)), '');
  _new public.membership_coupons;
BEGIN
  IF _caller IS NULL OR NOT public.is_admin(_caller) THEN
    RAISE EXCEPTION 'Only administrators can generate coupons.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id = _caller AND status = 'verified')
    AND coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Two-factor verification required.' USING ERRCODE = '42501';
  END IF;
  IF _count IS NULL OR _count < 1 OR _count > 500 THEN
    RAISE EXCEPTION 'Generate between 1 and 500 coupons per batch. You can create more batches.';
  END IF;
  _deadline := now() + CASE _expiry WHEN 'day' THEN interval '1 day'
    WHEN 'week' THEN interval '1 week' WHEN 'month' THEN interval '1 month' ELSE NULL END;
  IF _deadline IS NULL THEN RAISE EXCEPTION 'Choose an expiry of day, week, or month.'; END IF;
  IF _unlimited IS NULL THEN RAISE EXCEPTION 'Choose a usage limit.'; END IF;
  IF _custom IS NOT NULL AND (_count <> 1 OR _custom !~ '^[A-Z0-9][A-Z0-9-]{3,31}$') THEN
    RAISE EXCEPTION 'A custom code needs one coupon and 4–32 letters, numbers, or hyphens.';
  END IF;
  FOR i IN 1.._count LOOP
    INSERT INTO public.membership_coupons(code, created_by, expires_at, max_redemptions)
    VALUES (coalesce(_custom, 'CRES-' || upper(substr(replace(gen_random_uuid()::text, '-', ''),1,20))),
      _caller, _deadline, CASE WHEN _unlimited THEN NULL ELSE 1 END)
    RETURNING * INTO _new;
    RETURN NEXT _new;
  END LOOP;
  INSERT INTO public.admin_audit_log(actor_id, action, entity_type, details)
  VALUES (_caller, 'coupon.generate', 'membership_coupons',
    jsonb_build_object('count', _count, 'expiry', _expiry, 'unlimited', _unlimited));
END;
$$;

CREATE FUNCTION public.admin_revoke_membership_coupon(_coupon_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL OR NOT public.is_admin(_caller) THEN
    RAISE EXCEPTION 'Only administrators can revoke coupons.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id = _caller AND status = 'verified')
    AND coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Two-factor verification required.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.membership_coupons SET active = false WHERE id = _coupon_id AND active;
  IF FOUND THEN
    INSERT INTO public.admin_audit_log(actor_id, action, entity_type, entity_id)
    VALUES (_caller, 'coupon.revoke', 'membership_coupons', _coupon_id::text);
  END IF;
END;
$$;

CREATE FUNCTION public.redeem_membership_coupon(_code text)
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
  UPDATE public.subscriptions SET has_access = true, expires_at = _until,
    billing_status = CASE WHEN _sub.has_access AND _sub.expires_at > now() THEN billing_status ELSE 'trialing' END
    WHERE user_id = _caller;
  INSERT INTO public.coupon_redemptions(coupon_id, user_id, access_expires_at) VALUES (_coupon.id, _caller, _until);
  UPDATE public.membership_coupons SET redemption_count = redemption_count + 1 WHERE id = _coupon.id;
  RETURN jsonb_build_object('access_expires_at', _until, 'already_redeemed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_generate_membership_coupons(integer,text,boolean,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_membership_coupon(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_membership_coupon(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_generate_membership_coupons(integer,text,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_membership_coupon(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_membership_coupon(text) TO authenticated;
