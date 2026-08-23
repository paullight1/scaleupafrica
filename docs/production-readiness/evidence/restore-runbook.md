# Cresciva Database Restore Rehearsal Runbook

> **Purpose:** prove Cresciva can recover its Supabase/Postgres data and authorization model without experimenting on the production database.  
> **Status:** procedure defined; rehearsal evidence is still required on an isolated Cresciva Supabase target.

## Preconditions

- Confirm the actual Cresciva Supabase project and organization.
- Confirm the account's real backup capability, retention window and whether PITR is enabled. Do not assume PITR.
- Choose an isolated non-production restore/branch/project with no production traffic.
- Never commit dump files, user PII, API keys, database passwords or service-role keys.
- If production data must be used for a provider-supported restore rehearsal, restrict access to the smallest authorized operations group and destroy the isolated target after evidence capture.

## Evidence to record

Record only:

- source project identifier/reference (non-secret);
- restore mechanism used;
- backup/PITR restore point or provider job identifier;
- start/end timestamps;
- resulting isolated project/reference;
- migration/schema version observed;
- counts/checksums for selected non-sensitive validation sets where appropriate;
- authorization-matrix outcome;
- critical application smoke outcomes;
- observed recovery steps and elapsed time;
- failures and remediation.

Do not record row payloads containing user information.

## Rehearsal procedure

### 1. Freeze the expected repository baseline

Record the Git SHA and migration list used for the rehearsal.

Expected verification command before restore work:

```bash
npm ci
npm run verify
```

### 2. Create the isolated recovery target

Use the current Supabase-supported restore/PITR/branch mechanism that matches the Cresciva plan. The target must not share production traffic or callbacks.

If the provider plan cannot restore into a disposable target, stop and document the exact capability limitation instead of testing destructively in production.

### 3. Restore from the selected recovery point

Restore through the provider-supported mechanism. Record the provider job/restore identifier and timestamps, not credentials.

### 4. Validate schema and migrations

Confirm representative critical objects exist:

```text
profiles
subscriptions
payments
funding_opportunities
funding_sources
funding_status_checks
business_enrichment_runs
notification_events
user_roles
email_events
```

Confirm critical routines/policies exist, including payment entitlement, admin authorization, enrichment confirmation, source-status recording and notification claiming.

Generate current Supabase TypeScript types from the isolated target and compare them with the repository-generated types before claiming schema parity.

### 5. Run the authorization matrix

Execute:

```text
supabase/tests/authorization-matrix.sql
```

against the isolated restored database after migrations are reconciled.

Any failed privilege/RLS/security-definer assertion is a restore failure for launch purposes.

### 6. Validate critical application reads

Using non-sensitive test accounts/data in the isolated target, prove:

- public directory can read only public-safe profile information;
- authenticated user can read/edit own allowed profile fields;
- one user cannot read another user's payment/subscription private rows;
- paid subscription state reads correctly;
- curated funding feed loads;
- current funding provenance/status rows load;
- admin-only operational reads reject non-admin callers.

### 7. Validate storage behavior

Confirm required buckets/policies survived the restore or are recreated through infrastructure/migrations as designed. Test an isolated user's profile-media upload/read/delete path without touching production objects.

### 8. Reconcile migrations after the restore point

If the restored backup predates current repository migrations, apply only the migrations that should exist after that restore point using the current Supabase migration process. Re-run the authorization matrix afterwards.

### 9. Perform application smoke tests

Point a non-production Cresciva environment at the isolated restored target and verify at minimum:

- sign-in/session resolution;
- dashboard/profile read;
- directory listing/profile detail;
- Funding Radar curated feed;
- admin authentication/authorization boundary.

Do not perform real Bachs live payments or send real production customer email from the restore environment.

### 10. Destroy or quarantine the recovery target

After evidence is captured, remove the disposable restored project/branch according to organizational policy. If retention is required for investigation, restrict access and record the owner/expiry.

## Pass criteria

A restore rehearsal passes only when:

- provider restore finishes successfully;
- expected schema/migrations reconcile;
- authorization matrix passes;
- critical application reads pass;
- storage access boundaries work;
- no production callbacks/side effects occur;
- observed recovery steps and elapsed time are recorded.

Until an actual rehearsal is performed:

**RESTORE REHEARSAL STATUS: BLOCKED_EXTERNAL**
