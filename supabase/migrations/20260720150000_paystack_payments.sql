-- =============================================================================
-- Plan 06 — Paystack payments: audit trail, idempotent webhook log, access flip.
-- Owner: payments (FOUNDATION §8.3). Reserved timestamp 20260720150000.
--
-- Adds:
--   * public.payments                — one row per initialized transaction (audit)
--   * public.payment_webhook_events  — raw webhook audit + idempotency backstop
--   * public.grant_annual_access()   — the ONLY code path that grants access
--
-- RLS on public.subscriptions is UNCHANGED (read-own, service_role-writes-only).
-- After applying, regenerate src/integrations/supabase/types.ts (never hand-edit).
-- =============================================================================

-- Payment attempts + completions. One row per initialized transaction.
CREATE TABLE public.payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL DEFAULT 'paystack',
  reference     TEXT NOT NULL UNIQUE,          -- our reference, sent to Paystack ("sua_" || uuid)
  plan_code     TEXT NOT NULL,                 -- 'annual'
  amount        BIGINT NOT NULL,               -- integer subunits (kobo/cents)
  currency      TEXT NOT NULL,                 -- 'NGN' | 'USD'
  status        TEXT NOT NULL DEFAULT 'initialized'
                CHECK (status IN ('initialized','success','failed','abandoned')),
  channel       TEXT,                          -- card / bank / mobile_money / bank_transfer (from Paystack)
  paid_at       TIMESTAMPTZ,
  gateway_response JSONB,                      -- verbatim Paystack data object at settlement (audit)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_user_idx ON public.payments (user_id, created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- Users read their own payments only. No INSERT/UPDATE for authenticated:
-- writes are service_role only (mirrors subscriptions).
CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Raw webhook audit + idempotency backstop.
CREATE TABLE public.payment_webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL DEFAULT 'paystack',
  event_type      TEXT NOT NULL,               -- e.g. charge.success
  reference       TEXT,                        -- data.reference
  signature_valid BOOLEAN NOT NULL,
  payload         JSONB NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_type, reference)      -- Paystack has no event id; this is the dedupe key
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.payment_webhook_events TO service_role;   -- no client access at all (raw payloads carry PII)

-- Single, atomic access-flip routine — the ONLY code path that grants access.
CREATE OR REPLACE FUNCTION public.grant_annual_access(_payment_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.payments;
BEGIN
  -- Idempotency gate: only the transition initialized/failed/abandoned -> success grants access.
  UPDATE public.payments SET status = 'success', paid_at = COALESCE(paid_at, now())
    WHERE id = _payment_id AND status <> 'success'
    RETURNING * INTO _row;
  IF _row.id IS NULL THEN
    RETURN false;   -- already processed: no-op (idempotent)
  END IF;
  UPDATE public.subscriptions
    SET has_access = true,
        -- renewal extends from the current expiry, not from now
        expires_at = GREATEST(COALESCE(expires_at, now()), now()) + INTERVAL '1 year'
    WHERE user_id = _row.user_id;
  -- Access is only granted if the subscription row was actually updated. If it wasn't
  -- (missing row), raise so the whole tx rolls back (incl. the payment->success flip):
  -- the caller sees an error and retries; access is never claimed as granted-but-not.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'grant_annual_access: no subscription row for user %', _row.user_id;
  END IF;
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.grant_annual_access(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_annual_access(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_annual_access(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_annual_access(UUID) TO service_role;
