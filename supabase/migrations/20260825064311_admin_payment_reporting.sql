-- Calendar-based payment totals for the deployed admin finance desk.
-- Amounts remain integer subunits and currencies are never combined.

create index if not exists payments_success_paid_at_idx
  on public.payments (paid_at)
  where status = 'success' and paid_at is not null;

create index if not exists payments_failed_created_at_idx
  on public.payments (created_at)
  where status in ('failed', 'abandoned');

create or replace function public.admin_payment_report(
  _from date default null,
  _to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  range_start timestamptz;
  range_end timestamptz;
  result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if (_from is null) <> (_to is null) then
    raise exception 'Both report dates are required' using errcode = '22023';
  end if;
  if _from is not null and _from > _to then
    raise exception 'Report start date must not follow end date' using errcode = '22023';
  end if;

  if _from is not null then
    range_start := _from::timestamp at time zone 'UTC';
    range_end := (_to + 1)::timestamp at time zone 'UTC';
  end if;

  select jsonb_build_object(
    'by_currency', coalesce((
      select jsonb_object_agg(
        currency,
        jsonb_build_object(
          'amount', amount_total,
          'payments', payment_count,
          'average', round(amount_total::numeric / payment_count)::bigint
        )
      )
      from (
        select
          upper(trim(currency)) as currency,
          sum(amount)::bigint as amount_total,
          count(*)::bigint as payment_count
        from public.payments
        where status = 'success'
          and paid_at is not null
          and (range_start is null or paid_at >= range_start)
          and (range_end is null or paid_at < range_end)
        group by upper(trim(currency))
      ) currency_totals
    ), '{}'::jsonb),
    'successful_payments', (
      select count(*)::bigint
      from public.payments
      where status = 'success'
        and paid_at is not null
        and (range_start is null or paid_at >= range_start)
        and (range_end is null or paid_at < range_end)
    ),
    'failed_payments', (
      select count(*)::bigint
      from public.payments
      where status in ('failed', 'abandoned')
        and (range_start is null or created_at >= range_start)
        and (range_end is null or created_at < range_end)
    )
  ) into result;

  return result;
end;
$$;

revoke execute on function public.admin_payment_report(date, date) from public, anon;
grant execute on function public.admin_payment_report(date, date) to authenticated, service_role;
