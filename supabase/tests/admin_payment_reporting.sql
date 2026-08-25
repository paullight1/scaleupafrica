begin;

select plan(5);

select has_function('public', 'admin_payment_report', array['date', 'date']);
select has_index('public', 'payments', 'payments_success_paid_at_idx');
select function_privs_are(
  'public', 'admin_payment_report', array['date', 'date'],
  'anon', array[]::text[]
);
select function_privs_are(
  'public', 'admin_payment_report', array['date', 'date'],
  'authenticated', array['EXECUTE']
);
select ok(
  pg_get_functiondef('public.admin_payment_report(date,date)'::regprocedure)
    ilike '%is_admin(auth.uid())%',
  'payment report self-authorizes administrators'
);

select * from finish();
rollback;
