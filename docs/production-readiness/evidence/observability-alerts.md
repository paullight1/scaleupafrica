# Cresciva Observability & Alert Contract

> **Phase:** 8 — Observability, Analytics, Abuse & Cost  
> **Branch:** `docs/cresciva-production-readiness`

## Repository telemetry contract

Cresciva now has shared structured logging contracts for Backend and Supabase Edge boundaries. Metadata keys containing authentication tokens, secrets, passwords, service-role identifiers, gateway payloads, email/phone/WhatsApp, JWTs or cookies are removed before output.

Funding Intelligence already exposes deterministic source/certification signals and notification-delivery state. Payment reconciliation exposes paid/access discrepancies. Email delivery has event/audit records. These business invariants are more useful than generic request counts for launch operations.

## Alert severities

### P0 — immediate containment

| Signal | Condition | First action |
| --- | --- | --- |
| paid without access | any unexplained `paid_no_access` | freeze payment-related release, reconcile affected reference, inspect grant/webhook path |
| payment integrity mismatch | amount/currency mismatch > 0 | do not grant access; inspect provider/session/ledger evidence |
| data exposure | confirmed unauthorized private contact/payment/subscription access | disable affected route/policy and initiate security incident runbook |
| systemic auth outage | widespread valid-user login/session failures | inspect Supabase/auth status and last deploy; rollback if release-correlated |

### P1 — urgent investigation

| Signal | Condition | First action |
| --- | --- | --- |
| Funding Radar outage | sustained member feed/search failures | inspect source-refresh/Edge/DB health and serve verified cached feed where safe |
| verified inventory collapse | material drop in fresh authoritative opportunities | inspect failing source registry entries before users receive stale trust labels |
| Bachs initialization/verification failure | sustained provider/server errors | inspect provider mode/config and reconciliation queue |
| sustained email dispatch failure | repeated provider failures across unrelated requests | inspect provider status/config; preserve request data for retry where permitted |
| production 5xx spike | release-correlated or sustained API/Edge failures | identify route/release SHA and rollback if necessary |

### P2 — planned remediation

Performance regression, stale-source growth, elevated AI fallback usage, low cache-hit ratio, non-critical provider errors and SEO/bundle budget drift.

## Funding/AI health metrics

Track without raw private search text:

- verified/open opportunity count;
- stale/unverified count;
- source fetch failure rate;
- average source-check age;
- opportunities near deadline;
- verified-first result count;
- AI-assisted fallback count;
- AI cache-hit ratio;
- rate-limited searches;
- invalid AI-output count;
- funding notification queue/delivery/exhaustion state.

## Payment health metrics

- initialized payments older than the expected operator window;
- successful payment without active access;
- webhook duplicate vs retryable failure;
- invalid-signature count;
- amount/currency mismatch;
- receipt failure;
- payment count/value by currency without PII.

## Email/abuse health

Monitor send failures, unsubscribe/suppression state, rate limiting, honeypot hits and provider bounce/complaint events when configured. A single best-effort email failure is not a pager incident; sustained/systemic failure is.

## Deployment integrations deferred to operator

The following require external project access and are intentionally not marked repository-complete evidence:

- Sentry DSNs/projects and controlled exception capture;
- Vercel Web Analytics/Speed Insights activation;
- Supabase/Vercel dashboard links;
- provider spend alerts;
- real on-call destinations and notification routing;
- non-production alert fire drills.

## Phase state

Structured/redacted telemetry contract and actionable business alert definitions: **IMPLEMENTED**.

External monitoring projects/alert destinations/fire drills: **DEFERRED_EXTERNAL**.

**PHASE 8 REPOSITORY GATE: COMPLETE — MONITORING ACTIVATION DEFERRED**
