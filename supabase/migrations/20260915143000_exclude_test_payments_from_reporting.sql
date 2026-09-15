-- Keep test settlements in the payment ledger, but do not include them in
-- revenue summaries. This is intentionally separate from payment status so
-- reconciliation and account-data exports remain complete.

alter table public.payments
  add column if not exists exclude_from_reporting boolean not null default false;

comment on column public.payments.exclude_from_reporting is
  'Report-only exclusion for known test or internal transactions; never removes the settlement audit row.';

create index if not exists payments_reporting_success_paid_at_idx
  on public.payments (paid_at)
  where status = 'success'
    and paid_at is not null
    and exclude_from_reporting = false;

-- These are the two known test settlements currently present in the deployed
-- ledger. They remain visible in Payments and reconciliation, but no longer
-- inflate dashboard or finance revenue totals.
update public.payments
set exclude_from_reporting = true
where reference in (
  'crv_c1713912-7ceb-4757-a119-5751e2fd31b1',
  'crv_59035edd-6089-465f-b5f4-9da1ecd5f71e'
);

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.admin_reporting_summary(integer)'::regprocedure)
    into definition;
  definition := replace(
    definition,
    'where status = ''success'' and paid_at >= since_at',
    'where status = ''success'' and paid_at >= since_at and not exclude_from_reporting'
  );
  execute definition;

  select pg_get_functiondef('public.admin_payment_report(date,date)'::regprocedure)
    into definition;
  definition := replace(
    definition,
    'where status = ''success''\n          and paid_at is not null',
    'where status = ''success''\n          and not exclude_from_reporting\n          and paid_at is not null'
  );
  execute definition;
end;
$$;
