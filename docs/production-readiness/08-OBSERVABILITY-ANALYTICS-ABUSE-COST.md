# Observability, Analytics, Abuse & Cost Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Cresciva enough production telemetry to detect failures in payments, funding AI, email, auth, directory/API traffic and deployment health before they become sustained user harm or uncontrolled cost.

**Architecture:** Use structured logs at server boundaries, Sentry for uncaught frontend/Backend errors, Vercel Web Analytics/Speed Insights for web performance/traffic, Supabase logs for Edge Functions/database services, and explicit business-health metrics for payments, funding, email and reconciliation. Alert only on actionable signals and never log secrets or raw sensitive payloads.

**Tech Stack:** Vercel Observability/Web Analytics/Speed Insights, Supabase logs, Sentry, structured JSON logging, React, NestJS, Edge Functions, Postgres audit/metric queries.

**Spec:** `docs/superpowers/specs/2026-08-20-cresciva-production-readiness-design.md`

## Global Constraints

- No secret keys, Authorization headers, full webhook payloads, payment gateway raw objects, passwords, JWTs, personal contact fields or AI prompts containing user-private data in observability events.
- Logs use request/correlation identifiers instead of PII.
- Payment references may be logged only where needed for operational reconciliation and should be treated as sensitive operational identifiers.
- Alerts must identify an owner/action path.
- Monitoring failure must not block payment settlement or other critical user actions.
- Existing funding and email rate limits remain in place and are measured rather than removed.

---

### Task 1: Create a shared structured logging contract

**Files:**
- Create: `Backend/src/observability/logger.ts`
- Create: `supabase/functions/_shared/log.ts`
- Add tests for redaction/shape
- Modify critical Backend/Edge boundaries to use the helpers

**Interfaces:**

Server log shape:

```ts
type LogEvent = {
  level: "info" | "warn" | "error";
  event: string;
  request_id?: string;
  route?: string;
  duration_ms?: number;
  status?: number;
  code?: string;
  reference?: string;
  metadata?: Record<string, string | number | boolean | null>;
};
```

- [ ] **Step 1: Write redaction tests**

Attempt to pass keys named `authorization`, `token`, `secret`, `password`, `service_role`, `gateway_response`, `email`, `phone`, `whatsapp`. The logger must drop/redact them.

- [ ] **Step 2: Add start/success/failure logs to critical boundaries**

Prioritize:

```text
paystack-init
paystack-verify
paystack-webhook
aggregate-funding
send-email
Backend health/auth/member funding/profile/payment endpoints
```

- [ ] **Step 3: Include duration and stable event names**

Example event names:

```text
payment.webhook.received
payment.webhook.duplicate
payment.webhook.retryable_failure
payment.grant.success
funding.deep_search.cache_hit
funding.deep_search.generated
funding.deep_search.rate_limited
email.dispatch.failed
api.request.failed
```

### Task 2: Add client and Backend exception tracking

**Files:**
- Create: `Frontend/src/lib/monitoring.ts`
- Create: `AdminPanel/src/lib/monitoring.ts` or shared safe initialization module
- Create: `Backend/src/observability/sentry.ts`
- Modify application bootstrap files to initialize monitoring
- Add environment docs without DSN values

- [ ] **Step 1: Configure Sentry projects/environments**

Separate production from preview/development through environment tags. DSNs are environment configuration, not committed secrets.

- [ ] **Step 2: Add privacy filters**

Disable automatic capture of sensitive form input. Scrub request headers/query parameters that can contain auth/payment references. Do not attach entire React query caches/user objects.

- [ ] **Step 3: Add release identifier**

Tag events with Git commit/deployment SHA so regressions map to code.

- [ ] **Step 4: Prove capture with a controlled non-production exception**

Record the event ID in evidence; remove the deliberate throw afterward.

### Task 3: Enable web performance/traffic telemetry

**Files:**
- Modify Frontend bootstrap/layout to include Vercel Web Analytics/Speed Insights if package integration is appropriate for the current Vite deployment
- Modify package manifests/lockfile

- [ ] **Step 1: Enable Web Analytics**

Track page views without adding sensitive custom dimensions.

- [ ] **Step 2: Enable Speed Insights/Web Vitals**

Monitor LCP, INP and CLS by route/device class where available.

- [ ] **Step 3: Define product events separately from raw analytics**

Minimum funnel events:

```text
signup_started
signup_completed
profile_published
funding_viewed
checkout_started
payment_confirmed
funding_deep_search_started
funding_opportunity_opened
resource_downloaded
```

Do not send opportunity search keywords if they can reveal confidential business information; use category/count metadata instead.

### Task 4: Create payment health dashboard/queries

**Files:**
- Extend admin/reconciliation work from Phase 1
- Create: `docs/production-readiness/evidence/observability-alerts.md`

- [ ] **Step 1: Track settlement health**

Metrics:

- initialized payments older than expected settlement window;
- successful payments without active access;
- webhook retryable failures;
- invalid-signature rate;
- amount/currency mismatches;
- callback verify pending rate;
- receipt failures;
- payment success count/value by currency without exposing customer PII.

- [ ] **Step 2: Alert on invariants, not normal declines**

Examples that require immediate alert:

```text
paid_no_access > 0
webhook non-duplicate DB failures > 0
amount/currency mismatch > 0
reconciliation job failure
```

Normal user card declines are product metrics, not pager incidents.

### Task 5: Create funding AI cost/quality telemetry

**Files:**
- Modify: `supabase/functions/aggregate-funding/index.ts`
- Modify Phase 5 ingestion service
- Update admin analytics if appropriate

- [ ] **Step 1: Record non-sensitive generation metrics**

Per request/event:

```text
cache_hit
rate_limited
gateway_status
duration_ms
result_count
validation_reject_count
model/provider identifier when returned
usage token/cost metadata when the provider exposes it
```

- [ ] **Step 2: Track cache effectiveness**

Daily cache-hit ratio and uncached generations/member identify cost regression.

- [ ] **Step 3: Track provenance health**

Verified/stale/source-error counts come from Phase 5.

- [ ] **Step 4: Define spend guardrail**

Configure provider/platform spend limits or alerts when available. The technical rate limit remains the last-resort per-user guard, not the only cost control.

### Task 6: Measure email health and abuse

**Files:**
- Existing: `supabase/functions/send-email/index.ts`
- Existing email event tables/admin views
- Modify admin telemetry/reporting as needed

- [ ] **Step 1: Monitor**

```text
contact saves
newsletter subscriptions
resource deliveries
send failures
unsubscribe events
rate-limited requests
honeypot hits
bounce/complaint events if provider webhooks are enabled
```

- [ ] **Step 2: Alert on sustained dispatch failure**

A single best-effort receipt/ack failure should not page. Sustained provider failures or a spike in complaint/bounce rate should alert operations.

### Task 7: Harden abuse limits at public/expensive boundaries

**Files:**
- Modify Edge/Backend throttling configuration where evidence shows gaps
- Add tests

- [ ] **Step 1: Inventory public boundaries**

```text
send-email
email-unsubscribe
paystack-webhook
public directory/contact reveal
public content endpoints
Backend public routes
```

- [ ] **Step 2: Keep limits purpose-specific**

Funding generation stays at three uncached searches/hour/member unless product data justifies change. Email remains IP-throttled. Contact reveal/public API paths need rate limits that deter scraping without making normal directory use unusable.

- [ ] **Step 3: Add request-size limits to all public functions**

Webhook receives the Phase 1 256 KiB limit. Contact/newsletter/resource JSON should have a substantially smaller explicit body limit because valid inputs are tiny.

### Task 8: Define actionable alerts and on-call routing

**Files:**
- Finalize: `docs/production-readiness/evidence/observability-alerts.md`

- [ ] **Step 1: Define alert severity**

**P0:** paid-no-access, data exposure/security event, widespread auth outage.  
**P1:** sustained payment initialization/verification failure, Funding Radar outage for active members, widespread email/contact loss, production 5xx spike.  
**P2:** performance regression, source staleness, elevated non-critical provider failure.

- [ ] **Step 2: Every alert includes**

```text
signal
threshold/condition
dashboard/log link
first diagnostic step
owner/escalation
rollback/mitigation link when applicable
```

- [ ] **Step 3: Test at least one alert from each P0/P1 subsystem in non-production**

## Phase 8 Definition of Done

- Structured server logging exists with tested redaction.
- Frontend/Admin/Backend exceptions are attributable to releases.
- Web performance and core funnel metrics are visible.
- Payment invariants are monitored and paid-no-access alerts immediately.
- Funding cost/cache/provenance signals are visible.
- Email deliverability/failure/abuse signals are visible.
- Public/expensive endpoints have intentional size/rate controls.
- P0/P1 alert paths are tested.
- Evidence ends with `PHASE 8 RELEASE GATE: PASS`.