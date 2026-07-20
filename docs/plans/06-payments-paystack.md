# 06 — Payments: Paystack checkout, webhook, billing UI, honest copy

> Workstream owner: payments. Basis: `00-FOUNDATION.md`, `IMPROVEMENTS.md` §1.1 (P0), §3 item 1,
> §3.18, §4 "Paywall → payment journey", §10 Q1. Provider decision (user-locked): **Paystack**
> (cards + mobile money, strong African coverage).

## 1. Goal

Fix the P0 "nobody can pay" closed loop. A signed-in founder must be able to go from the `/funding`
paywall → Paystack checkout → back to `/funding` with `subscriptions.has_access = true` and
`expires_at` set, **without any human touching the database** — while every payment is verified
server-side against Paystack with an HMAC-signed webhook, recorded in an auditable payments table,
and idempotent under retries. In parallel: remove every claim the product cannot honor, and ship an
honest concierge fallback (WhatsApp + bank transfer / mobile money, activated by an admin within
12 hours) for users Paystack can't serve.

## 2. Scope

**In scope**
- Paystack transaction initialize + verify + webhook (server-side only; secret key never in client).
- `payments` + `payment_webhook_events` tables, `grant_annual_access()` SQL routine, audit trail.
- Pricing model rewrite: canonical server-side price list, NGN + USD only as *charge* currencies;
  kill the 90-row hardcoded FX table and the "Eurozone" fake country.
- New paywall → checkout → `/payment/callback` → return-to-`/funding` journey (zero dead ends).
- Billing UI components (current plan, renew, payment history, cancel explanation) that plan 03
  mounts in the dashboard; a standalone `/billing` route until plan 03 lands.
- Honest copy pass on `Pricing.tsx`, `FAQ.tsx`, `Funding.tsx` paywall; `/#pricing` hash-scroll fix.
- Concierge fallback flow using the existing admin panel's subscription-update capability.

**Out of scope (owned elsewhere)**
- Dashboard shell and the other three pillars (plan 03). We ship components; 03 mounts them.
- Global auth-aware header, guards (plan 02). Funding gating hardening beyond payments (plan 05).
- The full NestJS/Drizzle migration (plan 07) — but see §4 "Webhook ownership seam".
- Auto-renewing card subscriptions via Paystack Plans API (deliberate v1 exclusion, see §5.4).
- Refund tooling (manual via Paystack dashboard for v1; recorded copy says "no partial refunds").

## 3. Current state (verified in repo)

- `src/pages/Funding.tsx:162` — paywall CTA is `<Link to="/#pricing">`; no hash-scroll handler
  exists anywhere, so it lands at the top of `/`. Dead end #1.
- `src/components/landing/Pricing.tsx:195` — "Join the Collective" → `/auth?next=/directory/create`
  → the profile form. No checkout exists. Dead ends #2–4 (auth → profile form → directory → ???).
- `Pricing.tsx:23-113` — 90 hardcoded FX prices ("~US$200 equivalent") that will drift, incl.
  `{ code: "EU", name: "Eurozone" }` — not a country, and `EU` is not an ISO code (§3.18).
- `Pricing.tsx:220` — "Immediate access to all features on join." False today.
- `FAQ.tsx:33` — "our payment processor supports major cards and mobile money" — no processor
  exists. To a scam-wary audience this is the scam fingerprint (IMPROVEMENTS §1.1).
- `supabase/migrations/20260713...sql` — `subscriptions(user_id UNIQUE, has_access, expires_at)`;
  RLS: users SELECT own row; **only `service_role` can write** (correct — keep).
  `on_auth_user_created` trigger auto-creates `has_access = false` row.
  `has_active_subscription(_user_id)` SQL fn exists, service_role-only, currently never called.
- `supabase/migrations/20260720120000_admin_panel_foundation.sql` — admins can already
  INSERT/UPDATE `subscriptions` and there is an `admin_audit_log` table → the concierge fallback
  needs zero new backend, only copy + process.
- Active-subscription rule is triplicated (SQL fn, `aggregate-funding/index.ts:24`,
  `Funding.tsx:91`). This plan centralizes the client copy; plan 05/07 consume it.
- Edge-function pattern to mirror: `supabase/functions/aggregate-funding/index.ts` (`Deno.serve`,
  `corsHeaders` from `npm:@supabase/supabase-js@2/cors`, `Deno.env.get`, `json()` helper,
  anon-key client with forwarded `Authorization` header for user-scoped reads).
- `supabase/config.toml` contains only `project_id` — per-function `verify_jwt` config is missing
  and **required** for the webhook (Paystack sends no Supabase JWT).

## 4. Architecture decision: where do init/verify/webhook live?

Foundation §5 locks NestJS + Drizzle (plan 07) as the eventual API. Two viable seams:

| | A. Supabase Edge Functions | B. NestJS endpoints (plan 07) |
|---|---|---|
| Ship date | Now — deploys independently of 07 | Blocked on 07 scaffolding, JWT verify, hosting, public URL |
| Webhook needs | Public HTTPS URL — already exists (`/functions/v1/...`) | New deployment + domain before Paystack config |
| Raw-body access for HMAC | Native (`req.text()`) | Needs body-parser rawBody config (footgun) |
| Long-term home | Migrates later | Final destination |

**Recommendation: A — Supabase Edge Functions now.** This is a P0; it must not wait on a backend
migration. The seam is cheap to move later because (1) the webhook target URL is a one-line change
in the Paystack dashboard, (2) all state mutation goes through one SQL routine
(`grant_annual_access`) that NestJS/Drizzle can call identically, and (3) the HTTP contracts below
are transport-agnostic. **Plan 07 MUST port these three endpoints 1:1** (`POST /billing/checkout`,
`POST /billing/verify`, `POST /webhooks/paystack` with `rawBody: true` in the Nest bootstrap) and
must not invent new contracts. Until 07 ports them, 07 must leave these functions running.

## 5. Design

### 5.1 Plan / tier model (canonical, server-side)

One product, one tier, one term — matching current marketing ("annual membership only", FAQ.tsx:38).
Modeled so more tiers can be added without schema change:

```
plan_code: "annual"     term: 1 year     charge currencies:
  NGN  9_500_000 kobo   (₦95,000)   — Paystack home currency
  USD    20_000 cents   ($200)      — requires USD enabled on the Paystack account*
```

- Canonical price list lives in **one server-side module**:
  `supabase/functions/_shared/billing.ts` → `PLANS = { annual: { NGN: 9_500_000, USD: 20_000 } }`
  (integer subunits only — kobo/cents; never floats). The client **never** sends an amount; it sends
  `{ plan_code, currency }` and the server resolves the amount. A mirror constant for *display only*
  lives in `src/lib/billing.ts` with a comment pointing at the server file as source of truth and a
  unit test asserting the two agree (fixture-copied values).
- *If USD is not enabled on the Paystack account at launch, `paystack-init` returns a typed
  `CURRENCY_UNAVAILABLE` error and the UI shows NGN + the concierge option for non-Nigerian users.
  Verify USD status in the Paystack dashboard during implementation and record it in `.env.example`
  comments.
- **The 90-country FX table is deleted.** `Pricing.tsx` shows exactly two prices via a
  NGN / USD toggle (default by `navigator.language` region NG → NGN, else USD), with the honest
  line: "Paying by card from outside Nigeria? You'll be charged in USD (or NGN) and your bank
  converts at its prevailing rate." This kills drift (§3.18) and the Eurozone bug in one move.

### 5.2 Data model (new migration `supabase/migrations/<ts>_payments_paystack.sql`)

```sql
-- Payment attempts + completions. One row per initialized transaction.
CREATE TABLE public.payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL DEFAULT 'paystack',
  reference     TEXT NOT NULL UNIQUE,          -- our reference, sent to Paystack ("sua_" || gen_random_uuid())
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
CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- No INSERT/UPDATE policies for authenticated: writes are service_role only (like subscriptions).
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Raw webhook audit + idempotency backstop.
CREATE TABLE public.payment_webhook_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       TEXT NOT NULL DEFAULT 'paystack',
  event_type     TEXT NOT NULL,                -- e.g. charge.success
  reference      TEXT,                         -- data.reference
  signature_valid BOOLEAN NOT NULL,
  payload        JSONB NOT NULL,
  processed      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_type, reference)     -- Paystack has no event id; this is the dedupe key
);
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.payment_webhook_events TO service_role;   -- no client access at all

-- Single, atomic access-flip routine — the ONLY code path that grants access.
CREATE OR REPLACE FUNCTION public.grant_annual_access(_payment_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.payments;
BEGIN
  -- Idempotency gate: only the transition initialized -> success grants access.
  UPDATE public.payments SET status = 'success', paid_at = COALESCE(paid_at, now())
    WHERE id = _payment_id AND status <> 'success'
    RETURNING * INTO _row;
  IF _row.id IS NULL THEN RETURN false; END IF;   -- already processed: no-op
  UPDATE public.subscriptions
    SET has_access = true,
        expires_at = GREATEST(COALESCE(expires_at, now()), now()) + INTERVAL '1 year'
    WHERE user_id = _row.user_id;                  -- renewal extends from current expiry, not from now
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.grant_annual_access(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_annual_access(UUID) TO service_role;
```

Notes: `expires_at` stays on `subscriptions` as the single access-truth (no schema change to the
existing check in `has_active_subscription()`, the edge fn, or `Funding.tsx`). Regenerate
`src/integrations/supabase/types.ts` after migrating (never hand-edit). Plan 07's Drizzle schema
must mirror these tables and call `grant_annual_access` via `sql` — not re-implement the flip.

### 5.3 Edge functions (mirror `aggregate-funding` conventions)

Shared module `supabase/functions/_shared/paystack.ts`: `PLANS`, `paystackFetch()` (base URL
`https://api.paystack.co`, `Authorization: Bearer ${PAYSTACK_SECRET_KEY}`), and
`verifyPaystackSignature(rawBody: string, signature: string, secret: string): Promise<boolean>`
implemented with WebCrypto `crypto.subtle` HMAC-SHA512 → hex, compared **timing-safely**
(constant-time byte compare, not `===` on strings — write the small helper).

**`supabase/functions/paystack-init/index.ts`** — `POST`, user JWT required (default verify_jwt on).
1. Resolve user via anon client + forwarded `Authorization` (aggregate-funding pattern, lines 16-21).
2. Body: `{ plan_code, currency }`. Validate against `PLANS`; anything else → 400. Reject if the
   user already has an active subscription that expires > 30 days out (409 `ALREADY_ACTIVE`) to
   prevent accidental double-purchase; allow renewal inside the 30-day window.
3. Service-role client: INSERT `payments` row (`status='initialized'`, `reference = 'sua_' + crypto.randomUUID()`).
4. `POST /transaction/initialize` with `{ email: user.email, amount, currency, reference,
   callback_url: `${APP_URL}/payment/callback`, metadata: { user_id, plan_code },
   channels: ["card","bank","bank_transfer","ussd","mobile_money"] }`.
5. Return `{ authorization_url, reference }`. On Paystack error: mark row `failed`, return typed
   error. Never return or log the secret key; log reference + status only.

**`supabase/functions/paystack-webhook/index.ts`** — `POST`, **no JWT** (add to `supabase/config.toml`):
```toml
[functions.paystack-webhook]
verify_jwt = false
```
1. `const raw = await req.text()` **before any JSON.parse** — HMAC is over the exact raw body.
2. `verifyPaystackSignature(raw, req.headers.get("x-paystack-signature") ?? "", PAYSTACK_SECRET_KEY)`.
   Invalid/missing → log, INSERT `payment_webhook_events` with `signature_valid=false`, return
   **401 with an empty body**. No CORS headers needed (server-to-server); do not echo the payload.
3. Parse; INSERT into `payment_webhook_events` (`signature_valid=true`). On unique-violation →
   duplicate delivery → return 200 immediately (idempotent ack).
4. Only `charge.success` is actionable (ignore-and-200 everything else). Load `payments` by
   `data.reference`. **Validate `data.amount === payments.amount` and `data.currency ===
   payments.currency`** — a signature-valid event for a tampered/lesser charge must not grant
   access (defense against init-parameter tampering and cross-transaction confusion). Mismatch →
   log loudly, mark event processed=false, return 200 (never 5xx-retry-loop on a poison event).
5. Persist `channel`, `gateway_response = data`; call `grant_annual_access(payment.id)` via
   service-role RPC; mark event `processed = true`. Return 200 fast (<10s; no external calls
   besides the DB).

**`supabase/functions/paystack-verify/index.ts`** — `POST`, user JWT required. The
callback-page path (webhooks can lag or be missed):
1. Body `{ reference }`. Load `payments` row; require `payments.user_id === auth user id` (403
   otherwise — users can only verify their own transactions).
2. `GET /transaction/verify/:reference` with the secret key. If `data.status === "success"` **and
   amount + currency match the payments row** → `grant_annual_access(payment.id)` (idempotent —
   safe if the webhook already ran), persist channel/gateway_response.
3. Return `{ status: "success" | "pending" | "failed" }` (pending covers `ongoing`/`pending`/
   `send_otp` etc. for bank-transfer/USSD channels; failed covers `failed`/`abandoned`/`reversed`).

**Secrets / env** (`supabase secrets set …`; document in `.env.example` — server side only, never
`VITE_`-prefixed): `PAYSTACK_SECRET_KEY`, `APP_URL` (e.g. `https://scaleupafrica.com`). Use test
keys (`sk_test_…`) until launch checklist flips to live. The redirect flow means **no Paystack
public key and no Paystack JS in the client bundle at all** — chosen deliberately over the inline
popup: fewer bytes for 3G/low-end Android (Foundation §0), no third-party script, secret handling
stays entirely server-side. (If inline is ever wanted, only `pk_…` may ship client-side.)

### 5.4 Renewal / cancel semantics (v1)

One-time annual charge; **no auto-renew** (Paystack Plans/recurring deliberately excluded: card-only
recurring fits the mobile-money audience poorly and adds subscription-lifecycle webhooks we don't
need for P0). Therefore "Cancel" = nothing to switch off: billing UI explains "Your membership does
not auto-renew. Access runs until {expires_at}; renew any time — renewing early adds a year to your
current expiry" (matches `grant_annual_access` GREATEST logic and the existing FAQ refund stance).
Renew = the same checkout. Copy must never say "recurring", "auto-renews", or "we'll charge you".

### 5.5 Frontend journey (kills the 4 dead context switches)

```
/funding (no access)                       /payment/callback?reference=sua_…
┌─────────────────────────┐   redirect    ┌──────────────────────────────┐
│ Paywall card:            │  Paystack →  │ calls paystack-verify         │
│ plan, price (NGN/USD),   │  hosted page │ success → "You're in" + CTA   │
│ fraud ack (keep), CTA    │  ←──────────│   "Open the Funding Radar"     │
│ [Pay with Paystack]      │  callback_url│ pending → poll verify ×~6/60s │
│ [Pay by transfer/momo →  │              │   + honest bank-transfer copy │
│  WhatsApp concierge]     │              │ failed → retry / concierge    │
└─────────────────────────┘              └──────────────────────────────┘
```

- **`src/components/billing/CheckoutButton.tsx`** — calls `paystack-init`
  (`supabase.functions.invoke`), then `window.location.assign(authorization_url)`. Handles: not
  signed in → `/auth?next=/funding` (existing param pattern); `ALREADY_ACTIVE` → "You're already a
  member until {date}"; `CURRENCY_UNAVAILABLE`; network error → toast + retry, never a dead end.
- **`src/pages/PaymentCallback.tsx`** (route `/payment/callback`) — reads `reference` (Paystack
  also sends `trxref`; accept either), invokes `paystack-verify`, renders success / pending /
  failed states per diagram. On success invalidate the subscription query so `/funding` re-renders
  unlocked. No reference param → friendly error + link to `/billing`.
- **`src/components/funding/FundingPaywall.tsx`** — extract the paywall JSX from `Funding.tsx`
  (keep the fraud-acknowledgement checkbox gate — it's good trust UX) and replace the
  `/#pricing` link with `<CheckoutButton>` + price display + concierge link **inline**. The user
  never leaves `/funding` except to Paystack itself. Also fix §2.1 here: the subscription fetch in
  `Funding.tsx:90` must surface `error` and render a retry state — a paying member on a flaky
  connection must never see the paywall.
- **`src/lib/subscription.ts`** — `isActiveSubscription({ has_access, expires_at })` — single
  client-side copy of the rule (used by Funding, billing, plan 03/05); mirrors
  `has_active_subscription()` SQL.
- **`/#pricing` hash-scroll fix** (§3.3): tiny `src/components/common/HashScrollHandler.tsx`
  mounted in `App.tsx` — on location change, if `location.hash`, `scrollIntoView` the element
  (retry once on next frame for lazy content), else scroll to top. Plan 02 may later absorb this
  into its `<ScrollToTop/>`; land it here because the broken CTA is part of this P0. Remaining
  `/#pricing` links (landing header, footer) then work; the paywall itself no longer needs one.

### 5.6 Billing UI (plan 03 "Account & billing" pillar)

Build as self-contained components under `src/components/billing/` so plan 03 mounts them in the
dashboard; until then expose route **`/billing`** (auth-guarded like `/funding`) rendering the same
panel — plan 03 will swap the route into the dashboard shell without rework.

- **`BillingPanel.tsx`** — composes:
  - **`CurrentPlanCard.tsx`** — TanStack Query on own `subscriptions` row (Foundation §4: TanStack
    for every server read; loading skeleton + `<ErrorState>` w/ retry, never a false "no plan").
    States: Active until {date} (+ "Renew" `CheckoutButton` when <60 days left, with the
    adds-a-year copy) · Expired → renew CTA · Never subscribed → plan pitch + `CheckoutButton` +
    concierge link · plus the no-auto-renew "cancel" explanation (§5.4).
  - **`PaymentHistory.tsx`** — query own `payments` (RLS-scoped) ordered desc: date, amount
    formatted per currency, channel, status badge, reference (their receipt proof for support).
    Empty state: "No payments yet."
  - **Concierge card** — WhatsApp deep link + bank-transfer instructions (§5.7).
- Styling per Foundation tokens (orange CTA, navy ink, no gradient text, no anti-slop tells).

### 5.7 Honest copy pass + concierge fallback

Principle (Foundation §0 + IMPROVEMENTS §7): claim nothing that isn't literally true the day it
ships. Per §10 Q1, the concierge lane is **kept permanently as a first-class option**, not hidden —
"a human you can message" is a trust feature for this audience, and it covers mobile-money users
outside Paystack's card rails (see honesty note below).

- **`Pricing.tsx`**: delete the FX table + country Select; NGN/USD toggle (§5.1). CTA → signed-out:
  `/auth?next=/funding` (auth then lands on the paywall with inline checkout — profile-form detour
  removed); signed-in: `<CheckoutButton>` directly. Replace line 220 with: "Access is activated
  automatically once payment is confirmed — usually under a minute. Paying by transfer or mobile
  money? We activate within 12 hours." Remove the corner star ribbon while editing (Foundation §1.4).
- **`FAQ.tsx:31-34`** "Can I pay in my local currency?" → honest version: "Card payments are
  processed by Paystack in NGN or USD; if you pay a USD price with a local card your bank converts
  at its rate. Prefer mobile money or bank transfer? Message us on WhatsApp — we confirm and
  activate your membership within 12 hours." **Do not** claim pan-African mobile-money checkout:
  Paystack's mobile-money channels depend on account country (a Nigerian account cannot collect
  M-Pesa/MTN MoMo directly) — that's exactly what the concierge lane honestly covers. Add one FAQ:
  "How fast is access after payment?" (card: automatic, ~1 min; transfer/concierge: within 12 h).
  Update the cancel FAQ to the no-auto-renew wording (§5.4).
- **`Funding.tsx` paywall**: swap in `FundingPaywall` (§5.5). While in the file, remove the
  "AI-powered" sparkles pill (line 180-182) per Foundation §1.4 if plan 01 hasn't already.
- **Concierge mechanics**: `WHATSAPP_CONCIERGE_URL` constant in `src/lib/billing.ts` (`wa.me/<number>`
  with a prefilled message including the user's email). Admin receives payment proof, uses the
  existing admin panel (admin UPDATE policy on `subscriptions`, 20260720 migration) to set
  `has_access = true` + `expires_at = now() + 1 year`, logging to `admin_audit_log`. Document the
  runbook in this plan's checklist, not in user-facing copy. The 12-hour promise must be one the
  team actually staffs — confirm the number and SLA with the owner before the copy ships.

### 5.8 Security review checklist (must all hold before live keys)

1. `PAYSTACK_SECRET_KEY` only in Supabase function secrets; grep CI check: no `sk_live`/`sk_test`
   under `src/`; no `VITE_PAYSTACK*` secret vars.
2. Webhook: HMAC-SHA512 over the **raw** body, timing-safe compare, reject-before-parse; unsigned
   requests never touch the DB beyond the failed-signature audit row.
3. Amount + currency validated against the server-created `payments` row in **both** webhook and
   verify paths (client never supplies an amount anywhere).
4. Access flip only via `grant_annual_access` (service_role-only EXECUTE); RLS on
   `subscriptions`/`payments` unchanged: authenticated users read own rows, write nothing.
5. Idempotency: `payments.reference` UNIQUE; status-transition gate in `grant_annual_access`;
   `payment_webhook_events` UNIQUE dedupe — replaying the same `charge.success` N times yields
   exactly one year, once. Webhook + verify racing yields one grant.
6. `paystack-verify` enforces reference ownership (`user_id` match) — no cross-user probing.
7. Webhook returns 200 for handled/duplicate/ignored events; 401 only for bad signatures; never
   leaks payload contents in error responses. Optional hardening: check Paystack's published
   webhook IP allowlist, log-only (IPs change; signature is the real gate).
8. `payment_webhook_events` has zero client grants (raw payloads contain PII).

## 6. Dependencies

- **Plan 02 (auth)**: journey uses existing `/auth?next=` — no hard dependency. Header/nav link to
  `/billing` arrives with 02/03.
- **Plan 03 (dashboard)**: consumes `BillingPanel`; owns final placement. Interim `/billing` route
  is ours and is handed over.
- **Plan 05 (funding/gating)**: consumes `src/lib/subscription.ts` and the fixed error-handled
  subscription query; no waiting either direction.
- **Plan 07 (NestJS)**: ports the three endpoint contracts (§4) + Drizzle mirrors of §5.2; must
  call `grant_annual_access`, not re-implement it; webhook URL switch is a Paystack-dashboard
  config change at 07 cutover time.
- **External**: Paystack account (business verification!), USD-currency enablement status, live
  keys, webhook URL configured (`https://<project>.supabase.co/functions/v1/paystack-webhook`),
  WhatsApp business number + staffing for the 12-hour SLA.

## 7. Test plan

Unit (Vitest, `src/**` + shared logic kept in plain TS so it runs under vitest even though the
functions deploy on Deno — put pure logic in `_shared` files with no Deno globals):
- **Signature verify**: known secret + body fixture → expected SHA512 hex (generate fixture with
  node `crypto.createHmac("sha512")`); valid passes, tampered body fails, wrong secret fails,
  missing header fails; compare is length-safe.
- **`isActiveSubscription`**: has_access false; true + null expiry; true + future; true + past;
  boundary now.
- **Plan table**: client display constants match server `PLANS` fixture; only NGN/USD; integers.
- **Paywall gate** (Testing Library): no access → paywall with enabled CheckoutButton only after
  acknowledgement; subscription-fetch error → retry state, **not** paywall; active → radar renders.
- **PaymentCallback**: success/pending/failed render branches; missing reference; accepts `trxref`.

Integration / manual (staging + Paystack test keys, scripted in the checklist):
- `curl` webhook with correctly signed fixture → payment success + access flipped + expires_at ≈
  +1 year; **replay same body → 200, no double-extend** (assert expires_at unchanged).
- Bad signature → 401, `signature_valid=false` row, subscription untouched.
- Signed event with wrong amount → no grant, event logged.
- Full happy path with Paystack test card via the real hosted page → return to callback → funding
  unlocked without manual DB touch. Renewal path extends existing expiry by 1 year (GREATEST).
- `paystack-verify` with another user's reference → 403.
- `paystack-init` while already active → 409 `ALREADY_ACTIVE`.

## 8. Acceptance criteria

1. A new user can sign up, click Pay on `/funding` (or `/billing`/pricing), complete a Paystack
   test-card payment, land on `/payment/callback`, and see the Funding Radar unlocked — with zero
   manual intervention and no context switch dead-ends.
2. `subscriptions.has_access`/`expires_at` are only ever written by `grant_annual_access`
   (service_role) or the pre-existing admin-panel path; RLS unchanged; secret key absent from the
   client bundle (`grep -r sk_ dist/` clean).
3. Webhook rejects invalid signatures (401) and is idempotent under replay (proven by test); every
   delivery is recorded in `payment_webhook_events`; every purchase is a `payments` row visible to
   its owner in Payment History.
4. Pricing shows exactly NGN + USD from one canonical source; the FX table and "Eurozone" country
   are gone; no copy anywhere promises instant access via rails that don't exist — card copy says
   automatic, concierge copy says within 12 hours, and both are true.
5. `/#pricing` links scroll to the pricing section from any route; the paywall itself no longer
   depends on that hop. Billing panel shows current plan, renew, history, and the no-auto-renew
   cancel explanation with loading/empty/error states.
6. `npm run build`, `npm run lint`, `npm test` green; `src/integrations/supabase/types.ts`
   regenerated, not hand-edited.

## 9. Ordered implementation checklist

1. [ ] Confirm externals: Paystack account + test keys; USD enablement (record outcome; if absent,
       enable `CURRENCY_UNAVAILABLE` path); WhatsApp concierge number + 12 h SLA sign-off.
2. [ ] Migration `supabase/migrations/<ts>_payments_paystack.sql` (§5.2: `payments`,
       `payment_webhook_events`, `grant_annual_access`, grants/RLS/trigger). Apply; regenerate
       `src/integrations/supabase/types.ts`.
3. [ ] `supabase/functions/_shared/paystack.ts` + `_shared/billing.ts` (PLANS, signature verify,
       timing-safe compare, paystackFetch) — pure TS, no Deno globals in the testable parts.
4. [ ] Vitest: signature fixtures, PLANS parity, `isActiveSubscription` (`src/lib/subscription.ts`).
5. [ ] `paystack-init` function (§5.3) incl. ALREADY_ACTIVE / CURRENCY_UNAVAILABLE errors.
6. [ ] `paystack-webhook` function + `supabase/config.toml` `verify_jwt = false` entry.
7. [ ] `paystack-verify` function (ownership check, status mapping).
8. [ ] Set secrets (`PAYSTACK_SECRET_KEY` test, `APP_URL`); deploy functions; configure webhook URL
       in Paystack test dashboard; run the signed/replayed/tampered `curl` suite (§7) against staging.
9. [ ] `src/lib/billing.ts` (display prices, currency formatter, `WHATSAPP_CONCIERGE_URL`).
10. [ ] `CheckoutButton.tsx`; `PaymentCallback.tsx` + `/payment/callback` route in `App.tsx`.
11. [ ] `FundingPaywall.tsx` extraction: inline checkout + concierge link, keep fraud ack, add
        subscription-fetch error/retry state; wire into `Funding.tsx`.
12. [ ] `HashScrollHandler` in `App.tsx`; verify `/#pricing` from `/funding`-adjacent routes.
13. [ ] Billing UI: `CurrentPlanCard`, `PaymentHistory`, `BillingPanel`, `/billing` guarded route
        (TanStack Query, skeleton/empty/error states).
14. [ ] Copy pass: `Pricing.tsx` (table→toggle, CTA target, honest access line), `FAQ.tsx`
        (payment/currency/cancel/speed answers), paywall copy; sweep for any remaining "instant
        access"/"payment processor" claims (`grep -ri "immediate access\|payment processor" src/`).
15. [ ] Component tests: paywall gate branches, PaymentCallback branches.
16. [ ] Full test-mode E2E on staging (happy path, renewal, failure, pending/bank-transfer).
17. [ ] Security checklist §5.8 walkthrough; `grep` bundle for secrets.
18. [ ] Write concierge runbook note for admins (proof → admin panel flip → audit log) in the admin
        docs; confirm staffing.
19. [ ] Launch: switch to live keys, live webhook URL, one real low-value NGN payment, refund it
        via Paystack dashboard, verify records + access flip + history rendering.
20. [ ] Handoffs: notify plan 03 (mount `BillingPanel`), plan 05 (use `isActiveSubscription`),
        plan 07 (port contracts §4/§5.3, keep functions until cutover).
