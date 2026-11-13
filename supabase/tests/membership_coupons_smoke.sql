-- Safe on the linked project: verifies real RPCs and subscription access, then
-- rolls back every test coupon, receipt, audit row, and membership change.
BEGIN;
DO $$
DECLARE
  _admin uuid;
  _member uuid;
  _coupon public.membership_coupons;
  _receipt jsonb;
  _retry jsonb;
  _before public.subscriptions;
  _after public.subscriptions;
BEGIN
  SELECT user_id INTO _admin FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  SELECT * INTO _before FROM public.subscriptions
    WHERE user_id <> _admin AND NOT (has_access AND expires_at IS NULL) LIMIT 1;
  _member := _before.user_id;
  IF _admin IS NULL OR _member IS NULL THEN RAISE EXCEPTION 'Smoke test needs an admin and a member.'; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',_admin,'aal','aal2')::text, true);
  SELECT * INTO _coupon FROM public.admin_generate_membership_coupons(1,'day',false,NULL);
  IF _coupon.max_redemptions <> 1 OR _coupon.expires_at <= now() THEN RAISE EXCEPTION 'Generation failed.'; END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',_member,'aal','aal2')::text, true);
  _receipt := public.redeem_membership_coupon(lower(_coupon.code));
  IF NOT public.has_active_subscription(_member) THEN RAISE EXCEPTION 'Coupon did not unlock canonical membership access.'; END IF;
  SELECT * INTO _after FROM public.subscriptions WHERE user_id = _member;
  IF _after.expires_at <> (CASE WHEN _before.has_access AND _before.expires_at > now() THEN _before.expires_at ELSE now() END + interval '7 days') THEN
    RAISE EXCEPTION 'Coupon did not add exactly seven days.';
  END IF;
  IF _after.plan_code IS DISTINCT FROM _before.plan_code OR _after.auto_renew IS DISTINCT FROM _before.auto_renew OR _after.billing_status IS DISTINCT FROM _before.billing_status THEN
    RAISE EXCEPTION 'Coupon changed paid billing settings.';
  END IF;
  _retry := public.redeem_membership_coupon(_coupon.code);
  IF NOT (_retry->>'already_redeemed')::boolean OR _retry->>'access_expires_at' <> _receipt->>'access_expires_at' THEN
    RAISE EXCEPTION 'Retry was not idempotent.';
  END IF;
  IF (SELECT redemption_count FROM public.membership_coupons WHERE id = _coupon.id) <> 1 THEN
    RAISE EXCEPTION 'Retry consumed the coupon twice.';
  END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',_admin,'aal','aal2')::text, true);
  PERFORM public.admin_revoke_membership_coupon(_coupon.id);
  IF (SELECT active FROM public.membership_coupons WHERE id = _coupon.id) THEN RAISE EXCEPTION 'Revocation failed.'; END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: live generation, seven-day access, paid settings, retry, and revocation; all test writes rolled back.' AS result;
