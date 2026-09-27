-- Paystack is the active payment provider. The earlier Bachs migration changed
-- database defaults, so restore Paystack explicitly for any future inserts that
-- do not provide a provider value.
ALTER TABLE public.payments
  ALTER COLUMN provider SET DEFAULT 'paystack';

ALTER TABLE public.payment_webhook_events
  ALTER COLUMN provider SET DEFAULT 'paystack';

COMMENT ON COLUMN public.payments.provider IS
  'Payment provider identifier. Active provider is Paystack; historical rows may contain legacy provider values.';

COMMENT ON COLUMN public.payment_webhook_events.provider IS
  'Webhook provider identifier. Active provider is Paystack; historical rows may contain legacy provider values.';

-- Admin finance views must report the active provider only. Legacy Bachs rows
-- remain in the ledger for auditability but cannot appear as current payments.
DO $$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef('public.admin_payment_report(date,date)'::regprocedure)
    INTO definition;
  definition := replace(
    definition,
    'where status = ''success''',
    'where provider = ''paystack'' and status = ''success'''
  );
  definition := replace(
    definition,
    'where status in (''failed'', ''abandoned'')',
    'where provider = ''paystack'' and status in (''failed'', ''abandoned'')'
  );
  EXECUTE definition;

  SELECT pg_get_functiondef('public.admin_reporting_summary(integer)'::regprocedure)
    INTO definition;
  definition := replace(
    definition,
    'where status = ''success''',
    'where provider = ''paystack'' and status = ''success'''
  );
  definition := replace(
    definition,
    'where status in (''failed'', ''abandoned'')',
    'where provider = ''paystack'' and status in (''failed'', ''abandoned'')'
  );
  EXECUTE definition;
END;
$$;
