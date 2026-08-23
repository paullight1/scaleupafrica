create or replace function public.admin_reporting_summary(_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bounded_days integer := greatest(1, least(coalesce(_days, 30), 365));
  since_at timestamptz;
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  since_at := now() - make_interval(days => bounded_days);

  select jsonb_build_object(
    'period_days', bounded_days,
    'audience', jsonb_build_object(
      'page_views', (select count(*) from public.analytics_events where event_type = 'page_view' and created_at >= since_at),
      'unique_sessions', (select count(distinct session_id) from public.analytics_events where session_id is not null and created_at >= since_at),
      'new_users', (select count(*) from auth.users where created_at >= since_at),
      'funding_searches', (select count(*) from public.analytics_events where event_type = 'funding_search' and created_at >= since_at)
    ),
    'content', jsonb_build_object(
      'published_posts', (select count(*) from public.blog_posts where status = 'published'),
      'draft_posts', (select count(*) from public.blog_posts where status = 'draft'),
      'published_resources', (select count(*) from public.resources where status = 'published'),
      'draft_resources', (select count(*) from public.resources where status = 'draft'),
      'resource_downloads', (select count(*) from public.analytics_events where event_type = 'resource_download' and created_at >= since_at)
    ),
    'revenue', jsonb_build_object(
      'by_currency', coalesce((
        select jsonb_object_agg(currency, amount_total)
        from (
          select upper(currency) currency, sum(amount)::bigint amount_total
          from public.payments
          where status = 'success' and paid_at >= since_at
          group by upper(currency)
        ) currency_totals
      ), '{}'::jsonb),
      'by_plan', coalesce((
        select jsonb_agg(jsonb_build_object('plan_code', plan_code, 'currency', currency, 'amount', amount_total, 'payments', payment_count))
        from (
          select plan_code, upper(currency) currency, sum(amount)::bigint amount_total, count(*)::bigint payment_count
          from public.payments
          where status = 'success' and paid_at >= since_at
          group by plan_code, upper(currency)
          order by payment_count desc
        ) plan_totals
      ), '[]'::jsonb),
      'successful_payments', (select count(*) from public.payments where status = 'success' and paid_at >= since_at),
      'failed_payments', (select count(*) from public.payments where status in ('failed', 'abandoned') and created_at >= since_at)
    ),
    'operations', jsonb_build_object(
      'new_leads', (select count(*) from public.leads where status = 'new'),
      'flagged_profiles', (select count(*) from public.profiles where status = 'flagged'),
      'unprocessed_webhooks', (select count(*) from public.payment_webhook_events where not processed),
      'draft_content', (select count(*) from public.blog_posts where status = 'draft') + (select count(*) from public.resources where status = 'draft')
    )
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_content_performance(_days integer default 30, _limit integer default 10)
returns table(content_type text, content_id uuid, title text, status text, views bigint, downloads bigint, total_engagement bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  bounded_limit integer := greatest(1, least(coalesce(_limit, 10), 50));
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query
    select ranked.content_type, ranked.content_id, ranked.title, ranked.status,
           ranked.views, ranked.downloads, ranked.views + ranked.downloads
    from (
      select 'blog'::text content_type, b.id content_id, b.title, b.status,
             b.view_count::bigint views, 0::bigint downloads
      from public.blog_posts b
      union all
      select 'resource'::text, r.id, r.title, r.status,
             r.view_count::bigint, r.download_count::bigint
      from public.resources r
    ) ranked
    order by ranked.views + ranked.downloads desc, ranked.title
    limit bounded_limit;
end;
$$;

revoke execute on function public.admin_reporting_summary(integer) from public, anon;
revoke execute on function public.admin_content_performance(integer, integer) from public, anon;
grant execute on function public.admin_reporting_summary(integer) to authenticated, service_role;
grant execute on function public.admin_content_performance(integer, integer) to authenticated, service_role;
