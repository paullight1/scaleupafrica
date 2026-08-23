-- Keep admin RPCs callable by signed-in users (the functions enforce admin
-- authorization internally) while preventing anonymous invocation.
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_timeseries(TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(TEXT, INTEGER) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_timeseries(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT, INTEGER) TO authenticated, service_role;
