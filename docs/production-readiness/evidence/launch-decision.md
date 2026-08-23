# Cresciva Launch Decision Record

> **Purpose:** final Phase 10 GO/NO-GO record.  
> **Repository branch:** `docs/cresciva-production-readiness`

## Repository status

The production-readiness branch implements/hardens the repository-side controls for payments/Bachs, CI contracts, environment validation, Supabase security tests, Funding Intelligence P0, Backend cutover controls, web-quality budgets, structured/redacted telemetry, data rights, funding corrections, support and release/incident runbooks.

Run before release:

```bash
npm ci
npm run verify
```

Funding Intelligence releases must also run the repository certification/evaluation workflows/commands appropriate to the release corpus.

## Operator-owned live gates

The operator elected to defer CI/Vercel rate-limit/deployment blockers during repository implementation. The following must therefore be completed/recorded manually before a real **GO**:

- [ ] current repository verification completed from a clean checkout;
- [ ] Supabase project identity confirmed and all intended migrations applied in order;
- [ ] Supabase security/performance advisors reviewed after final DDL;
- [ ] backup/restore evidence is current;
- [ ] Bachs sandbox/live configuration and webhook endpoint verified;
- [ ] one successful and representative failed/pending payment path checked;
- [ ] paid settlement grants exactly the intended access period;
- [ ] production site origin/domain/OAuth/email callback identities are correct;
- [ ] source-refresh and funding-notification schedules/secrets are configured;
- [ ] sufficient authoritative funding sources are populated for the paid market promise;
- [ ] Funding Intelligence certification thresholds are satisfied on the release corpus;
- [ ] browser/device/accessibility smoke matrix completed;
- [ ] production Web Vitals/error/monitoring dashboards are active;
- [ ] legal counsel/operator review of Terms, Privacy, refund/retention/entity/jurisdiction obligations completed;
- [ ] operator support inbox/on-call/escalation destinations configured;
- [ ] production smoke test completed after deploy;
- [ ] rollback target and owner recorded.

## Non-negotiable product gates

No release should claim the primary paid funding list is trustworthy if any of these are false:

1. AI-assisted discoveries remain separated/unverified until source verification.
2. `Apply now` requires verified source evidence, current/fresh application status, eligible member state and an official application URL.
3. Unknown/stale current-cycle state cannot masquerade as `Open`.
4. Member funding corrections enter staff/source review rather than directly modifying canonical truth.
5. Payment entitlement requires server-verified settlement/ledger consistency.
6. Private contact/payment/member data is not exposed by public directory/search paths.

## Decision

**CRESCIVA LAUNCH DECISION: NO-GO (repository implementation complete; operator live gates intentionally deferred)**

This is not a statement that the product code is unfinished. It records that repository work cannot substitute for the live deployment/security/payment/funding-source/browser/legal checks that the operator chose to perform separately.

Change this line to **GO** only after all applicable live gates above have concrete evidence attached to the release record.
