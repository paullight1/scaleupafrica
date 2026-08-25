-- Tie each payment receipt audit row to the payment that triggered it.
-- Reconciliation previously inferred this relationship from the customer's
-- email address and timestamp, which attributed one failed send to several
-- unrelated checkout attempts by the same user.
ALTER TABLE public.email_events
  ADD COLUMN payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

CREATE INDEX email_events_payment_created_idx
  ON public.email_events (payment_id, created_at DESC)
  WHERE payment_id IS NOT NULL;

COMMENT ON COLUMN public.email_events.payment_id IS
  'Payment that triggered this receipt event; null for non-receipt email and legacy rows.';
