# HANDOFF — ScaleUp Africa overhaul

Status: **all code implemented and verified** across 5 waves. Root: `tsc` clean, `npm run build` ✓,
**207 tests** pass. Server (`server/`): build ✓, **52 tests** pass. Zero Lovable branding remains
(only the functional AI-gateway key in `aggregate-funding`). Everything below is work only a human
can do — none of it was faked as done. The app **keeps running on Supabase today**; the new NestJS
API is off by default until you opt domains in.

Branch: `overhaul/hubspot-theme-dashboard-backend`.

---

## 1. Database — apply the 4 new migrations (REQUIRED for Wave-3 features)
The app compiles against these via typed casts, but the tables/columns/RPCs don't exist until applied.
Apply in this order (already timestamp-ordered) via Supabase SQL editor or `supabase db push`:
1. `supabase/migrations/20260720130000_directory_search_slug.sql` — `profiles.slug` (+ trigger/backfill),
   pg_trgm search, `directory_facets()`, `show_email/phone/whatsapp`, `get_profile_contact()`,
   `increment_profile_views()`, and the **anon column-grant rewrite** (removes email/phone/whatsapp/user_id
   from public reads).
2. `supabase/migrations/20260720140000_funding_feed_cache.sql` — `funding_results` cache,
   `funding_opportunities` new cols, member-gated RLS.
3. `supabase/migrations/20260720150000_paystack_payments.sql` — `payments`, `payment_webhook_events`,
   `grant_annual_access()`.
4. `supabase/migrations/20260720160000_dashboard_tables.sql` — `saved_opportunities`, `user_preferences`.

Then **regenerate the typed client**:
`supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts`
After regen, the temporary casts in `src/hooks/queries/*.ts` and `src/components/billing/PaymentHistory.tsx`
become fully typed (optional cleanup — remove the `as never`/`untypedDb` casts).

## 2. Auth (Google OAuth + reset flow) — REQUIRED for those features
In Supabase Dashboard → Authentication:
- **Providers → Google:** enable, add Client ID/Secret (Google Cloud OAuth consent + credentials).
- **URL Configuration → Redirect URLs:** add `${SITE_URL}/auth` and `${SITE_URL}/auth/reset`
  (and your localhost equivalents for dev).

## 3. Payments (Paystack) — REQUIRED to actually take money
- Supabase **function secrets**: `PAYSTACK_SECRET_KEY` (sk_test_… then sk_live_…), `APP_URL`.
- Deploy the 3 edge functions: `supabase functions deploy paystack-init paystack-verify paystack-webhook`
  (also `aggregate-funding` if not already deployed). They're registered in `supabase/config.toml`.
- Paystack Dashboard → set the **webhook URL** to
  `https://<project>.supabase.co/functions/v1/paystack-webhook`.
- Confirm **USD is enabled** on the Paystack account (else the app uses the NGN-only path).
- Replace the placeholder concierge number `WHATSAPP_CONCIERGE_NUMBER = "2340000000000"` in
  `src/lib/billing.ts`, and staff the 12-hour concierge SLA.

## 4. NestJS backend (`server/`) — OPTIONAL now (off by default), REQUIRED for the scalable API
The frontend only calls the API when you opt a domain in; unset = it keeps using Supabase directly.
- `server/.env` (all server-side, never `VITE_`): `PORT=3001`, `NODE_ENV`, `DATABASE_URL`
  (**Supavisor transaction pooler**, port 6543: `postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres`),
  `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (HS256 fallback; JWKS is auto), `SUPABASE_SERVICE_ROLE_KEY`,
  `AI_GATEWAY_URL`/`AI_GATEWAY_KEY`/`AI_MODEL`, `PAYSTACK_SECRET_KEY`, `CORS_ORIGINS=<web origin>`.
- Run locally: `cd server && npm install && npm run start:dev` (Vite dev already proxies `/api` → :3001).
- Deploy: **Railway** (or Render) in the Supabase region. Build `cd server && npm ci && npm run build`,
  start `node dist/server/src/main.js`, health `/api/v1/health`.
- Enable per-domain cutover (build-time frontend env): `VITE_API_URL=https://api.<domain>` and
  `VITE_API_DOMAINS=directory,profiles,subscriptions,funding` (add domains incrementally; each is
  reversible by removing it). Optional: `drizzle-kit db:pull` as a schema drift-check (never authors DDL).

## 5. Follow-ups (nice-to-have, not blocking)
- **Weekly funding feed population:** the member-facing feed reads `funding_opportunities`; build a
  `refresh-funding-feed` job/edge-fn + surface review in the existing `/admin/funding` UI. Until then
  the per-user AI "deep search" fallback works.
- **Bundle size:** main chunk ~1 MB (Dashboard already split). Add route-level `React.lazy` for the
  remaining heavy pages + `manualChunks` for a mobile/3G win.
- **OG for crawlers:** SPA `<SEO>` tags are client-set (invisible to WhatsApp/FB crawlers). The server
  ships `GET /api/v1/og/directory/:slug` that returns crawler-visible OG HTML — point social unfurls
  there (or add prerendering) once the server is deployed.
- **og-banner font:** `public/og-banner.png` used a system-sans fallback (no Sora rasterizer in the build
  env). Regenerate with real Sora via `npx playwright` from `scripts/og-banner.html` for final fidelity.
- **Package manager:** switched to **npm** (`package-lock.json`); the stale `bun.lockb` was removed.
- Landing copy: a couple of template headings (e.g. "Two Tools. One Growth Engine.") remain — rewrite
  in the honest brand voice when convenient.

## 6. What changed (map)
`docs/plans/00-FOUNDATION.md` is the source of truth; `01`–`08` are the per-workstream plans.
Waves: 1 design system · 2 auth+chrome · 3 dashboard/directory/funding/payments · 4 NestJS+Drizzle +
branding removal · 5 integration+gate. See git log on this branch.
