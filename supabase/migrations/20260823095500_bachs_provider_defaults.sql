-- Active payment provider defaults are Bachs. Historical migrations retain the
-- old Paystack name for auditability, but new rows/events must not inherit it.

ALTER TABLE public.payments
  ALTER COLUMN provider SET DEFAULT 'bachs';

ALTER TABLE public.payment_webhook_events
  ALTER COLUMN provider SET DEFAULT 'bachs';

COMMENT ON COLUMN public.payments.provider IS
  'Payment provider identifier. Active launch provider is Bachs; historical rows may contain prior provider values.';
COMMENT ON COLUMN public.payment_webhook_events.provider IS
  'Webhook provider identifier. Active launch provider is Bachs; historical rows may contain prior provider values.';
