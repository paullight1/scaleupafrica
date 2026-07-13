
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
