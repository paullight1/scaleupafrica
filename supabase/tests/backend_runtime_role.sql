BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='cresciva_backend') THEN
    RAISE EXCEPTION 'Missing dedicated backend role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='cresciva_backend' AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Backend role must not have cluster/DDL/RLS bypass privileges';
  END IF;
  IF has_table_privilege('cresciva_backend','public.subscriptions','UPDATE')
    OR has_table_privilege('cresciva_backend','public.user_roles','INSERT')
    OR has_table_privilege('cresciva_backend','public.funding_opportunities','UPDATE') THEN
    RAISE EXCEPTION 'Backend must not edit subscriptions, roles or curated funding';
  END IF;
  IF NOT has_table_privilege('cresciva_backend','public.profiles','UPDATE') THEN
    RAISE EXCEPTION 'Backend requires member profile writes';
  END IF;
END $$;
SET LOCAL ROLE cresciva_backend;
SELECT count(*) AS readable_published_funding FROM public.funding_opportunities WHERE status='published';
SELECT count(*) AS readable_profiles FROM public.profiles;
DO $$
BEGIN
  BEGIN
    UPDATE public.subscriptions SET has_access=false WHERE false;
    RAISE EXCEPTION 'Unauthorized subscription writes were accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;
SELECT 'PASS: backend role permissions and live reads' AS result;
