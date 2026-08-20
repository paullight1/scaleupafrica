# Production Environment, Domains & Secrets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that Cresciva's live environment matches the repository architecture and that every domain, callback, redirect, Edge Function, secret and deploy target points at the intended production identity.

**Architecture:** Treat source control and cloud configuration as two halves of one release. Build a non-secret environment inventory, centralize the production-origin contract, verify Vercel/Supabase/Paystack/OAuth/email settings against that contract, and record smoke-test evidence before launch.

**Tech Stack:** Vercel, Supabase, Paystack, Google OAuth, Resend/email configuration, Vite, React, NestJS.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Global Constraints

- Never commit secret values.
- The repository currently identifies the Supabase project ref as `dwyglydswegyvjowzdot`; verify live ownership/access before making changes.
- One official production web origin must drive canonical links, sitemap/robots, Paystack callback URL, OAuth redirects, transactional-email links and API CORS.
- `https://cresciva.vercel.app` may remain the canonical host only if it is intentionally the public production identity; otherwise the chosen custom domain becomes authoritative everywhere.
- Preview deployments must not claim themselves as canonical.
- Production configuration is not considered complete until a live smoke test proves it.

---

### Task 1: Create the non-secret production environment inventory

**Files:**
- Create: `docs/production-readiness/evidence/environment-inventory.md`
- Modify: `README.md`

**Interfaces:**
- Evidence document lists identifiers and presence/status only, never secret values.

- [ ] **Step 1: Record public deployment topology**

Record:

- public web production URL;
- admin production URL/path;
- Vercel project name/id and production branch;
- Supabase project ref and region;
- whether NestJS Backend is deployed and its base URL;
- which `VITE_API_DOMAINS` are enabled in production;
- Paystack mode (`test` or `live`);
- email provider sending domain/status;
- Google OAuth enabled/disabled state.

- [ ] **Step 2: Record required environment variable presence by target**

Use a table with `present`, `missing`, or `not-used` only.

Frontend production:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_SITE_ORIGIN
VITE_ADMIN_URL
VITE_API_URL
VITE_API_DOMAINS
```

Admin production:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_SITE_URL
```

Supabase Edge Function environment:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PAYSTACK_SECRET_KEY
APP_URL
LOVABLE_API_KEY
RESEND_API_KEY
EMAIL_FROM
EMAIL_TEAM_INBOX
EMAIL_TOKEN_SECRET
```

Backend production when deployed:

```text
NODE_ENV
PORT
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET or verified JWKS configuration
CORS_ORIGINS
PAYSTACK_SECRET_KEY
AI gateway/model configuration used by the deployed Backend
```

- [ ] **Step 3: Update README operational section**

Replace obsolete owner placeholders once real support/license decisions exist. Keep the README descriptive; detailed live identifiers remain in the evidence file.

### Task 2: Centralize the production-origin contract

**Files:**
- Modify: `Shared/src/lib/siteMeta.ts`
- Modify: `Frontend/vite.config.ts`
- Modify: `scripts/generate-sitemap.mjs`
- Create: `scripts/site-origin.mjs` or another single build-time source that can be consumed by the sitemap/Vite build without importing browser-only `import.meta.env` code
- Modify tests under `Shared/src/test/` or create a focused metadata contract test

**Interfaces:**
- Browser/runtime and build-time consumers resolve the same default production origin.
- `VITE_SITE_ORIGIN` remains the deployment override.

- [ ] **Step 1: Write a failing consistency test**

The test must fail if HTML metadata, shared runtime metadata and sitemap generation use different origins for a production build.

- [ ] **Step 2: Move the default literal to one build-safe module/config contract**

Do not maintain the same URL literal independently in three files.

- [ ] **Step 3: Verify preview behavior**

Build with a preview-specific `VITE_SITE_ORIGIN` only when that preview is intentionally indexable. Default preview deployments should remain non-canonical/non-indexed according to the deployment policy.

- [ ] **Step 4: Verify generated files**

```bash
npm run sitemap
npm run build:web
```

Inspect `Frontend/dist/index.html`, sitemap and robots output and confirm they use the intended production origin.

### Task 3: Certify Supabase live schema and Edge Functions

**Files:**
- Update: `docs/production-readiness/evidence/environment-inventory.md`
- Source of truth: `supabase/migrations/`, `supabase/functions/`, `supabase/config.toml`

- [ ] **Step 1: Establish authorized access to project ref `dwyglydswegyvjowzdot`**

If the current Supabase connector/account cannot see that project, use the project's authorized dashboard/CLI connection. Do not silently substitute another Supabase project.

- [ ] **Step 2: Compare migration history**

Run:

```bash
supabase migration list
```

Every repository migration required by current code must be present in the production history. Investigate divergence rather than blindly reapplying SQL.

- [ ] **Step 3: Verify deployed Edge Functions**

At minimum verify current versions/status of:

```text
aggregate-funding
paystack-init
paystack-verify
paystack-webhook
send-email
email-unsubscribe
```

Confirm JWT settings match `supabase/config.toml`.

- [ ] **Step 4: Smoke endpoints with safe test identities**

- unauthenticated request to JWT-protected payment/funding functions -> rejected;
- invalid Paystack signature -> 401;
- contact/newsletter invalid input -> 400/appropriate rejection;
- valid authenticated funding request without subscription -> 403;
- valid paid test member -> Funding endpoint succeeds or returns a controlled upstream failure, never an authorization bypass.

### Task 4: Certify Paystack external configuration

**Files:**
- Update: `docs/production-readiness/evidence/environment-inventory.md`

- [ ] **Step 1: Verify mode and secret alignment**

The deployed `PAYSTACK_SECRET_KEY` mode must match the Paystack dashboard/webhook environment being tested. Test and live references must not be mixed.

- [ ] **Step 2: Verify webhook URL**

The Paystack webhook must point exactly at the production `paystack-webhook` Edge Function.

- [ ] **Step 3: Verify callback URL source**

`APP_URL` must equal the official production web origin so `paystack-init` creates a callback under `/payment/callback` on the correct host.

- [ ] **Step 4: Verify accepted currencies/channels**

The UI/server price list must advertise only Paystack currencies/channels enabled for the merchant account. Exercise both supported and rejected currency paths.

### Task 5: Certify OAuth and email identity

**Files:**
- Update: `docs/production-readiness/evidence/environment-inventory.md`
- Update docs if needed: `docs/AUTH.md`, `docs/EMAIL.md`

- [ ] **Step 1: Verify Google OAuth redirects**

Authorized origins/redirects must include the official production host and actual auth callback/reset flows used by Supabase. Remove obsolete old-brand domains once no longer required for migration.

- [ ] **Step 2: Verify Supabase Auth URL Configuration**

`Site URL` and permitted redirects must not point at an obsolete ScaleUp Africa or temporary preview host.

- [ ] **Step 3: Verify email sending identity**

Send test contact acknowledgement, newsletter welcome/unsubscribe and payment receipt. Confirm From/Reply-To/support identity is Cresciva and links use the official production origin.

- [ ] **Step 4: Verify SPF/DKIM/DMARC status for the sending domain**

Record pass/fail/status, not DNS secrets.

### Task 6: Decide repository/deployment naming cleanup

**Files:**
- Update: `docs/production-readiness/evidence/environment-inventory.md`

- [ ] **Step 1: Record whether `paullight1/scaleupafrica` will be renamed to `paullight1/cresciva` before or after launch**

This is not a functional blocker if URLs/CI integrations survive GitHub redirects, but the decision must be explicit because repository identity already caused discovery confusion.

- [ ] **Step 2: If renaming before launch, inventory integrations first**

Check Vercel Git integration, deployment badges, local remotes, webhook URLs, documentation references and automation rules. Rename only after this list is known.

- [ ] **Step 3: Verify post-rename redirects and CI/deployment linkage**

No integration may silently stop receiving pushes.

## Phase 3 Definition of Done

- Official production web origin is explicitly recorded.
- All production URLs/callbacks/redirects/CORS/email links agree with it.
- Origin fallback is single-source rather than triplicated.
- Cresciva production Supabase project is positively identified and migration/function state is verified.
- Paystack webhook/callback configuration is proven.
- Google OAuth and email identity are proven.
- No secret values are committed.
- Repository/deployment naming decision is recorded.
- Live smoke tests pass.
- Evidence ends with `PHASE 3 RELEASE GATE: PASS`.