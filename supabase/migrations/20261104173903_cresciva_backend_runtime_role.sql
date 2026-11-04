-- Private server login for the existing verified-JWT NestJS API.
-- Password/LOGIN activation are provisioned only through the deployment secret.
-- This role is NOT granted to authenticator/anon/authenticated and has no access
-- to auth schema, DDL, subscription writes, RBAC writes or curated-feed writes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cresciva_backend') THEN
    CREATE ROLE cresciva_backend NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS CONNECTION LIMIT 10;
  ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='cresciva_backend' AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolbypassrls OR rolreplication)) THEN
    RAISE EXCEPTION 'Existing cresciva_backend role has unexpected elevated attributes';
  END IF;
END $$;
-- Permit the existing database owner to manage/test the private runtime role.
GRANT cresciva_backend TO postgres;
GRANT CONNECT ON DATABASE postgres TO cresciva_backend;
GRANT USAGE ON SCHEMA public TO cresciva_backend;
GRANT SELECT ON public.profiles, public.subscriptions, public.user_roles,
  public.funding_opportunities, public.funding_results TO cresciva_backend;
GRANT INSERT, UPDATE, DELETE ON public.profiles, public.funding_results TO cresciva_backend;

-- The backend derives row ownership/subscription access from verified JWTs in
-- its controllers/services. Its private DB connection needs the same row reads
-- the former postgres connection expected, but only on these five app tables.
CREATE POLICY cresciva_backend_profiles ON public.profiles
  FOR ALL TO cresciva_backend USING (true) WITH CHECK (true);
CREATE POLICY cresciva_backend_subscriptions ON public.subscriptions
  FOR SELECT TO cresciva_backend USING (true);
CREATE POLICY cresciva_backend_roles ON public.user_roles
  FOR SELECT TO cresciva_backend USING (true);
CREATE POLICY cresciva_backend_funding ON public.funding_opportunities
  FOR SELECT TO cresciva_backend USING (true);
CREATE POLICY cresciva_backend_results ON public.funding_results
  FOR ALL TO cresciva_backend USING (true) WITH CHECK (true);

ALTER ROLE cresciva_backend SET statement_timeout = '15s';
ALTER ROLE cresciva_backend SET lock_timeout = '5s';
