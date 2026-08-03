-- ---------------------------------------------------------------------------
-- admin_set_role — server-side role assignment for the admin panel.
--
-- Why this exists: `20260720120000_admin_panel_foundation.sql` grants only
-- SELECT on public.user_roles to `authenticated` (line 53), so the
-- "Admins manage roles" FOR ALL policy could never fire — Postgres checks
-- table GRANTs *before* RLS, so an admin writing user_roles from the browser
-- client got `42501 permission denied for table user_roles`. Role management in
-- the panel was therefore broken end-to-end.
--
-- Rather than widening the anon-key client's table privileges, role writes go
-- through this SECURITY DEFINER RPC, which re-checks `is_admin(auth.uid())`
-- itself. The client keeps SELECT-only on the table.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_role(
  _user_id UUID,
  _role    public.app_role,
  _add     BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller UUID := auth.uid();
  _has_mfa BOOLEAN;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  -- SECURITY DEFINER bypasses RLS, so authorization must be explicit here.
  IF NOT public.is_admin(_caller) THEN
    RAISE EXCEPTION 'Only administrators can change roles.' USING ERRCODE = '42501';
  END IF;

  -- Step-up: an admin who has enrolled MFA must be at aal2 to change roles.
  -- Conditional on enrollment so admins without a factor are never locked out
  -- (the "opt-in" pattern from the Supabase MFA enforcement guide).
  SELECT EXISTS (
    SELECT 1 FROM auth.mfa_factors
    WHERE user_id = _caller AND status = 'verified'
  ) INTO _has_mfa;

  IF _has_mfa AND COALESCE(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Two-factor verification required to change roles.'
      USING ERRCODE = '42501';
  END IF;

  -- Lockout guard: never let the last admin drop their own admin role.
  IF NOT _add AND _role = 'admin' AND _user_id = _caller THEN
    RAISE EXCEPTION 'You cannot remove your own admin role.' USING ERRCODE = '42501';
  END IF;

  IF _add THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = _role;
  END IF;
END;
$$;

-- Postgres grants EXECUTE to PUBLIC by default, which would make this
-- SECURITY DEFINER function callable by `anon`. Lock it down to signed-in users
-- (the is_admin check above is the real boundary).
REVOKE EXECUTE ON FUNCTION public.admin_set_role(UUID, public.app_role, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(UUID, public.app_role, BOOLEAN)
  TO authenticated, service_role;

-- The now-redundant client-write policy: keep it for service_role parity but
-- make the intent explicit that clients cannot reach it (no table GRANT).
COMMENT ON FUNCTION public.admin_set_role(UUID, public.app_role, BOOLEAN) IS
  'Adds or removes a role for a user. Admin-only, MFA step-up when enrolled. '
  'The only supported path for role writes from a browser client.';
