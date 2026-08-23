-- Cresciva Supabase authorization matrix
-- Run against an isolated database after all repository migrations are applied.
-- This file intentionally avoids production data and validates catalog/policy invariants.

begin;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if coalesce(condition, false) is not true then
    raise exception 'AUTHORIZATION MATRIX FAILED: %', message;
  end if;
end;
$$;

-- 1) Every exposed Cresciva table that exists must have RLS enabled.
do $$
declare
  table_name text;
  rls_enabled boolean;
begin
  foreach table_name in array array[
    'profiles','subscriptions','payments','payment_webhook_events',
    'funding_results','funding_opportunities','saved_opportunities',
    'user_preferences','user_roles','email_events','funding_sources',
    'notification_events','business_enrichment_runs','business_enrichment_candidates',
    'funding_status_checks'
  ] loop
    select c.relrowsecurity
      into rls_enabled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = table_name
       and c.relkind in ('r','p');

    if found then
      perform pg_temp.assert_true(rls_enabled, format('public.%I must have RLS enabled', table_name));
    end if;
  end loop;
end;
$$;

-- 2) Browser roles must not directly mutate privileged ledgers/authorization tables.
do $$
declare
  table_name text;
  role_name text;
begin
  foreach table_name in array array[
    'subscriptions','payments','payment_webhook_events','user_roles',
    'email_events','funding_sources','notification_events','funding_status_checks'
  ] loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    foreach role_name in array array['anon','authenticated'] loop
      perform pg_temp.assert_true(
        not has_table_privilege(role_name, format('public.%I', table_name), 'INSERT'),
        format('%s must not INSERT public.%I directly', role_name, table_name)
      );
      perform pg_temp.assert_true(
        not has_table_privilege(role_name, format('public.%I', table_name), 'DELETE'),
        format('%s must not DELETE public.%I directly', role_name, table_name)
      );
    end loop;
  end loop;
end;
$$;

-- 3) Anonymous directory reads must not expose raw contact columns.
do $$
declare
  column_name text;
begin
  if to_regclass('public.profiles') is not null then
    foreach column_name in array array['email','phone','whatsapp'] loop
      if exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='profiles' and columns.column_name = column_name
      ) then
        perform pg_temp.assert_true(
          not has_column_privilege('anon', 'public.profiles', column_name, 'SELECT'),
          format('anon must not SELECT profiles.%I directly', column_name)
        );
      end if;
    end loop;
  end if;
end;
$$;

-- 4) Owner-scoped policies must exist for user-owned data.
do $$
begin
  if to_regclass('public.profiles') is not null then
    perform pg_temp.assert_true(
      exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='profiles' and cmd in ('UPDATE','ALL')
          and coalesce(qual,'') || coalesce(with_check,'') ilike '%auth.uid%'
      ),
      'profiles requires an auth.uid()-scoped update policy'
    );
  end if;

  if to_regclass('public.subscriptions') is not null then
    perform pg_temp.assert_true(
      exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='subscriptions' and cmd in ('SELECT','ALL')
          and coalesce(qual,'') ilike '%auth.uid%'
      ),
      'subscriptions requires an auth.uid()-scoped read policy'
    );
  end if;

  if to_regclass('public.payments') is not null then
    perform pg_temp.assert_true(
      exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='payments' and cmd in ('SELECT','ALL')
          and coalesce(qual,'') ilike '%auth.uid%'
      ),
      'payments requires an auth.uid()-scoped read policy'
    );
  end if;
end;
$$;

-- 5) SECURITY DEFINER routines in public must pin search_path.
do $$
declare
  bad_count integer;
begin
  select count(*)
    into bad_count
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and not exists (
       select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
       where cfg like 'search_path=%'
     );

  perform pg_temp.assert_true(bad_count = 0, format('%s SECURITY DEFINER functions are missing a pinned search_path', bad_count));
end;
$$;

-- 6) Service-only functions must not be executable by browser roles.
do $$
declare
  function_name text;
  proc_oid oid;
  role_name text;
begin
  foreach function_name in array array[
    'grant_annual_access',
    'confirm_business_identity',
    'record_funding_status_check',
    'enqueue_funding_transition_notifications',
    'claim_funding_notification_events'
  ] loop
    for proc_oid in
      select p.oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname=function_name
    loop
      foreach role_name in array array['anon','authenticated'] loop
        perform pg_temp.assert_true(
          not has_function_privilege(role_name, proc_oid, 'EXECUTE'),
          format('%s must not EXECUTE service-only function public.%I', role_name, function_name)
        );
      end loop;
    end loop;
  end loop;
end;
$$;

-- 7) Privileged browser-callable admin RPCs must contain an explicit authorization check.
do $$
declare
  function_name text;
  proc_oid oid;
  function_def text;
begin
  foreach function_name in array array['admin_set_role','update_funding_source_and_invalidate'] loop
    for proc_oid in
      select p.oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname=function_name
    loop
      select lower(pg_get_functiondef(proc_oid)) into function_def;
      perform pg_temp.assert_true(
        function_def like '%auth.uid%'
          and (function_def like '%admin%' or function_def like '%user_roles%' or function_def like '%is_admin%'),
        format('public.%I must explicitly authorize the caller', function_name)
      );
    end loop;
  end loop;
end;
$$;

-- 8) Profile-media storage policies must bind writes to the authenticated UID path.
do $$
declare
  policy_text text;
begin
  if to_regclass('storage.objects') is not null then
    select string_agg(lower(coalesce(qual,'') || ' ' || coalesce(with_check,'')), ' ')
      into policy_text
      from pg_policies
     where schemaname='storage' and tablename='objects';

    perform pg_temp.assert_true(
      coalesce(policy_text,'') like '%profile-media%'
        and coalesce(policy_text,'') like '%auth.uid%',
      'storage.objects profile-media policies must scope writes to auth.uid()'
    );
  end if;
end;
$$;

rollback;
