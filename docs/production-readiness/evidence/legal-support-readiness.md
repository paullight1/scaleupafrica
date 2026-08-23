# Cresciva Legal, Privacy & Support Readiness

> **Phase:** 9 — Legal, Privacy, Support & Trust Operations  
> **Branch:** `docs/cresciva-production-readiness`

## Repository implementation

### User-facing legal/trust copy

- Terms describe the current one-time annual Bachs membership model rather than Paystack/automatic renewal.
- Funding language distinguishes source verification/current-cycle evidence from any guarantee of award success.
- Privacy policy reflects Bachs, business enrichment, funding-preference/activity data, conditional contact visibility, data export/deletion and minimal detached payment retention.
- User-facing data-rights contact routes through the monitored contact page rather than assuming ownership of an unverified `@cresciva.com` mailbox.

### Data rights

Account settings provides:

- server-generated JSON export of account/profile/member funding data, enrichment evidence/candidates, funding-correction history and portable payment-ledger fields;
- destructive deletion behind exact confirmation + recent authentication;
- server-side profile-media cleanup before destructive database/account work;
- transactional database sanitization attached to deletion of `auth.users` itself;
- raw webhook/direct-email cleanup and analytics identity unlinking inside that database transaction;
- minimal payment-ledger retention with account link/raw gateway payload removed.

Because database sanitization is a `BEFORE DELETE` trigger on `auth.users`, a failed Auth/database deletion transaction rolls the database cleanup back rather than leaving a partially detached active account. Account deletion remains server-side; the browser does not attempt a fragile cascade across product tables.

### Funding correction workflow

Members can report a curated opportunity as closed, wrong deadline, wrong eligibility, wrong/broken source or other. Reports enter `funding_opportunity_reports`, are deduplicated while active, and do not directly mutate canonical funding trust/status. Staff can triage reports at `/admin/funding/reports`.

### Operations documentation

- `docs/operations/PAYMENT_SUPPORT.md`
- `docs/operations/FUNDING_CORRECTIONS.md`
- `docs/operations/SUPPORT.md`
- `docs/operations/RELEASE.md`
- `docs/operations/INCIDENT_RESPONSE.md`
- updated `docs/EMAIL.md`

## Trust boundary

A support operator must never:

- grant paid access from a screenshot/browser redirect alone;
- mark a funding opportunity verified/open because a member or AI says so;
- perform destructive account changes from an unauthenticated email request alone;
- request passwords, OTPs, full payment credentials or service secrets;
- place raw private provider payloads in general support tickets/logs.

## External/legal work intentionally deferred

The repository does not certify legal compliance for every jurisdiction. Before public launch the operator should obtain/record qualified legal review of Terms, Privacy, refund/consumer obligations, data retention/transfer obligations and the operating legal entity/jurisdiction.

Deployment-time provider identities, verified email domain/support inbox and any jurisdiction-specific notices remain operator configuration.

## Phase state

Repository product/data-rights/support implementation: **COMPLETE**.

Qualified legal review and live provider/support configuration: **DEFERRED_EXTERNAL**.

**PHASE 9 REPOSITORY GATE: COMPLETE — LEGAL/PROVIDER SIGN-OFF DEFERRED**
