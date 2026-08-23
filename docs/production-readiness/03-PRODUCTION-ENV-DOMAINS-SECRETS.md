# Production Environment, Domains & Secrets Implementation Plan

> **For agentic workers:** use the Superpowers executing-plans and verification-before-completion workflows for further environment changes.

**Goal:** Prove that Cresciva's live environment matches the repository architecture and that every domain, callback, redirect, Edge Function, secret and deploy target points at the intended production identity.

**Architecture:** Source control and cloud configuration are two halves of one release. The repository owns a non-secret environment contract and one public-origin source; external launch certification proves Supabase, Vercel, Bachs, OAuth and email actually match it.

**Tech Stack:** Vercel, Supabase, Bachs, Google OAuth, Resend, Vite, React, NestJS.

## Global constraints

- [x] Secret values are excluded from source/evidence.
- [x] Repository identifies intended Supabase project as `dwyglydswegyvjowzdot`.
- [x] One public-origin contract drives canonical links, static metadata, sitemap/robots and the Bachs `APP_URL` rule.
- [x] Current default public origin is `https://cresciva.vercel.app` until an owned production domain is intentionally selected.
- [x] `cresciva.com` is **not** assumed/used; public research shows that hostname belongs to an unrelated organization.
- [ ] Preview deployments must be verified not to claim themselves canonical/indexable contrary to policy.
- [ ] Production configuration is not complete until live smoke tests pass.

---

## Task 1 — Non-secret environment inventory

**Files:**
- `docs/production-readiness/evidence/environment-inventory.md`
- `README.md`

- [x] Product identity recorded as Cresciva.
- [x] Declared public origin recorded.
- [x] Admin path recorded as `/admin/` on the same production artifact.
- [x] Supabase project ref recorded.
- [x] Bachs is recorded as payment provider and annual membership is one-time/non-recurring.
- [x] Optional NestJS API cutover is recorded.
- [x] Repository rename decision is recorded: defer until after launch certification.
- [ ] Actual Vercel project ID/domain mapping is externally unverified.
- [ ] Supabase project region/live ownership is externally unverified.
- [ ] Production OAuth/email/provider states are externally unverified.

### Required Frontend/Admin public variables

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_SITE_ORIGIN          # Frontend optional override
VITE_ADMIN_URL            # Frontend when admin is separate origin
VITE_SITE_URL             # AdminPanel when site is separate origin
VITE_API_URL
VITE_API_DOMAINS
```

### Required Supabase Edge Function secret/config contract

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BACHS_SECRET_KEY
BACHS_BASE_URL
BACHS_WEBHOOK_SIGNING_SECRET
BACHS_ORGANIZATION_ID        # recommended merchant pin
BACHS_ANNUAL_PRODUCT_NGN     # one-time product, exact canonical NGN annual price
BACHS_ANNUAL_PRODUCT_USD     # one-time product, exact canonical USD annual price
APP_URL                      # official Cresciva origin for this environment
LOVABLE_API_KEY              # current funding gateway until later funding phase replaces it
RESEND_API_KEY
EMAIL_FROM
EMAIL_TEAM_INBOX
EMAIL_TOKEN_SECRET
```

### Backend when deployed

```text
NODE_ENV
PORT
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET or verified JWKS path
CORS_ORIGINS
BACHS_SECRET_KEY
BACHS_BASE_URL
BACHS_WEBHOOK_SIGNING_SECRET
BACHS_ORGANIZATION_ID
AI_GATEWAY_URL
AI_GATEWAY_KEY
AI_MODEL
```

Payment fulfillment remains intentionally single-homed in Supabase Edge Functions during these launch-hardening phases.

## Task 2 — Single public-origin contract

**Files:**
- `config/site-origin.js`
- `Shared/src/lib/siteMeta.ts`
- `Frontend/vite.config.ts`
- `scripts/generate-sitemap.mjs`
- `Shared/src/test/site-origin-contract.test.ts`

- [x] Default production-origin literal lives in one build-safe config module.
- [x] Runtime SEO metadata imports the contract.
- [x] Vite static HTML transform imports the contract.
- [x] Sitemap/robots generator imports the contract.
- [x] Contract test rejects drift/duplicate literal use in those consumers.
- [x] `VITE_SITE_ORIGIN` remains deployment override.
- [x] `APP_URL` is documented to equal the official public origin for the relevant Bachs environment.
- [ ] Generated production HTML/sitemap/robots still require fresh CI/build evidence from Phase 2.

## Task 3 — Certify live Supabase schema and Edge Functions

Connected Supabase scope in this chat currently exposes only:

- `turnpay` (`gkpueopmdlqlfbvrzuqh`)
- `edutu.ai` (`sioxocmrjmdevsdlzjns`)

It does not expose Cresciva project `dwyglydswegyvjowzdot`, so no substitute project may be used.

Once authorized access exists:

- [ ] compare repository migration history with production;
- [ ] inspect Supabase security/performance advisors;
- [ ] verify deployed versions/JWT configuration for:
  - `bachs-init`
  - `bachs-verify`
  - `bachs-webhook`
  - `payment-reconciliation`
  - `aggregate-funding`
  - `send-email`
  - `email-unsubscribe`
- [ ] unauthenticated calls to JWT-protected payment/funding functions are rejected;
- [ ] invalid Bachs signature is rejected;
- [ ] non-member funding call is denied;
- [ ] paid staging member gets controlled successful access.

## Task 4 — Certify Bachs environment and merchant configuration

Current repository contract:

- sandbox: `https://sandbox-api.bachs.io` + `sk_sandbox_…`;
- live: `https://api.bachs.io` + `sk_live_…`;
- key environment and base URL must agree;
- checkout is product-based;
- membership products are one-time products with **no billing cycle**;
- settlement/callback money is revalidated against the internal Cresciva price ledger;
- fulfillment authority is signed `collection.succeeded`.

Required external checks:

- [ ] Bachs sandbox key present in staging only.
- [ ] `BACHS_ANNUAL_PRODUCT_NGN` points to one-time product with exact Cresciva NGN annual price.
- [ ] `BACHS_ANNUAL_PRODUCT_USD` points to one-time product with exact Cresciva USD annual price.
- [ ] Live product IDs are separately verified before key swap/go-live.
- [ ] Webhook endpoint is exactly:

```text
https://dwyglydswegyvjowzdot.supabase.co/functions/v1/bachs-webhook
```

- [ ] Webhook subscribes to at least:

```text
collection.succeeded
collection.failed
collection.underpaid
checkout.expired
checkout.completed   # audit only, never fulfillment
```

- [ ] Bachs signing secret matches the configured endpoint.
- [ ] Optional `BACHS_ORGANIZATION_ID` matches the intended merchant organization.
- [ ] `APP_URL` equals the staging/live Cresciva origin being certified.
- [ ] Bachs return URL generated by `bachs-init` is `<APP_URL>/payment/callback?reference=<crv_…>`.
- [ ] Callback verifies server-side via the internal reference; no redirect alone can grant access.

## Task 5 — OAuth and email identity

Once Cresciva Supabase/Vercel provider scopes are available:

- [ ] Supabase Auth Site URL equals official Cresciva origin.
- [ ] Google authorized origins/redirects include production auth/reset flow.
- [ ] obsolete ScaleUp Africa/temporary preview origins are removed when no longer needed.
- [ ] contact acknowledgement works.
- [ ] newsletter welcome/unsubscribe works.
- [ ] payment receipt works.
- [ ] From/Reply-To/support identity is Cresciva.
- [ ] links in email use official origin.
- [ ] SPF/DKIM/DMARC status is verified for chosen sending domain.

## Task 6 — Vercel production topology and rollback

Connected Vercel team in this chat currently lists zero projects. That does not prove Cresciva is undeployed; it means this connection cannot inspect the intended project.

Once correct Vercel scope is available:

- [ ] identify Cresciva project ID/name;
- [ ] confirm production branch/promotion rule;
- [ ] confirm `VITE_SITE_ORIGIN`/other public env values;
- [ ] confirm preview builds use preview-safe settings;
- [ ] confirm ordinary previews do not receive Bachs live secrets/products;
- [ ] verify `/admin/*` rewrite serves AdminPanel rather than public SPA;
- [ ] exercise rollback/promotion to a known-good deployment.

## Task 7 — Repository/deployment naming

**Decision:** keep repository as `paullight1/scaleupafrica` through launch certification; consider rename to `paullight1/cresciva` afterwards.

Before any rename:

- [ ] inventory Vercel Git integration;
- [ ] local remotes;
- [ ] documentation/badges;
- [ ] GitHub Actions/rulesets/webhooks;
- [ ] verify redirects and deploy linkage after rename.

## Phase 3 release state

Repository environment/origin contract: **implemented**.

External proof still required:

1. authorized Cresciva Supabase project access and deployment comparison;
2. Bachs sandbox/live products, secrets and webhook configuration;
3. actual Vercel project/domain/env inventory and rollback proof;
4. OAuth/email production identity smoke tests;
5. live end-to-end smoke tests.

`PHASE 3 RELEASE GATE: BLOCKED_EXTERNAL`
