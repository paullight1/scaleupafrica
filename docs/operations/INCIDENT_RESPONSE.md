# Cresciva Incident Response

## Severity

### P0 — contain immediately

Examples: private-data exposure, unauthorized access to restricted records, paid-without-access affecting users, payment amount/currency integrity failure, compromised production secret, destructive data corruption, false verified/open funding state at systemic scale.

Actions:

1. Assign incident owner and open an incident record.
2. Contain the affected path first: disable route/schedule/domain/secret or rollback the correlated release.
3. Preserve minimal evidence (release SHA, request/reference IDs, affected opportunity/payment IDs, timestamps) without copying raw secrets or unnecessary PII.
4. Protect users/data before optimizing availability.
5. Start root-cause analysis only after containment.

### P1 — urgent service degradation

Examples: Funding Radar unavailable, broad auth outage, sustained 5xx errors, repeated Bachs initialization/verification errors, verified source inventory suddenly stale/unavailable, notification/email system failure.

Restore a safe service path or known-good deployment, then investigate.

### P2 — degraded quality/operations

Examples: performance regression, broken crawler metadata, rising AI fallback/cost, individual source failures, small stale-data queue, isolated email errors.

Schedule remediation with evidence and ownership; promote to P1/P0 if scope increases.

## Component-specific containment

### Funding Intelligence

- Never preserve an `OPEN` label when source evidence is no longer trustworthy.
- Disable a corrupting source-refresh schedule and demote affected records to stale/unknown.
- Keep AI-assisted discoveries visibly unverified.
- Use the source registry and member correction reports to prioritize evidence re-checks.

### Payments

- Stop new payment-related changes when ledger/settlement integrity is uncertain.
- Use the Bachs reference + Cresciva payment ledger + reconciliation view.
- Never grant entitlement from screenshots or redirect parameters alone.

### Authentication/data

- Revoke/rotate compromised secrets.
- Disable affected privileged function/policy/domain if necessary.
- Do not dump full user tables into incident chat/tickets.

### Email/notifications

- Stop scheduled non-essential sends if targeting/preferences are wrong.
- Preserve transactional payment/account/security messages where safe.
- Honour unsubscribe/suppression state during recovery.

## Communication

State what is known, what is contained, user impact, next action and next update time. Do not speculate about causes before evidence exists. Do not publish private user/payment/source details.

## Recovery validation

Before declaring recovery:

- reproduce the original failure and prove it no longer occurs;
- check related authorization/data integrity paths;
- run relevant repository tests and production smoke checks;
- verify business invariants (payment/access, funding trust/status, privacy) rather than only HTTP 200;
- monitor the restored path for recurrence.

## Post-incident review

Document root cause, contributing controls that failed, why monitoring did/did not catch it, permanent corrective actions, tests added and whether the launch/runbook/certification gates need strengthening.
