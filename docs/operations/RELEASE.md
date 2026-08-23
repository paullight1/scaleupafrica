# Cresciva Release & Rollback Runbook

## Release principle

Repository readiness and production deployment are separate gates. A green branch means the code/configuration passed the available repository checks; it does not prove production DNS, Supabase migrations/secrets, Bachs credentials, schedules, monitoring or real traffic.

## Before deployment

1. Identify the exact release SHA/tag and create a release record.
2. Run the repository verification commands available to the operator, including `npm run verify` and the Funding Intelligence certification/evaluation gates appropriate for the release.
3. Review database migrations in order. Confirm destructive/backfill/retention effects before applying them.
4. Confirm production secrets/modes: Supabase, Bachs live key + webhook secret, Resend identity, Funding Intelligence refresh/notification secrets, canonical site origin and any monitoring configuration.
5. Confirm the intended API-domain flags. Cresciva launches Supabase-first unless a Backend domain has already passed parity evidence.
6. Confirm a rollback owner and rollback target before making production changes.

## Database first, code second

For schema-dependent releases, apply backward-compatible migrations before deploying code that requires them. Do not deploy an app that references columns/functions not yet present in production.

Migrations that cannot be safely reversed must have a documented forward-repair plan and verified backup/restore capability before application.

## Production smoke sequence

After deployment check, in order:

1. homepage and major public routes;
2. sign-up/sign-in/session restoration;
3. directory list/detail and contact privacy/reveal behaviour;
4. profile create/edit/media;
5. Bachs sandbox/live-mode boundary and one operator-controlled transaction when appropriate;
6. paid access after verified settlement;
7. Funding Radar `Open for you`, Watchlist and source links;
8. opportunity correction reporting;
9. notification preference/save/application workflow;
10. account export (do not test account deletion with a production owner/admin account);
11. admin funding/source/report/payment views;
12. error/telemetry dashboards and source-refresh schedules.

## Frontend rollback

Promote/restore the previously known-good deployment. Re-run smoke checks against the rollback target. A rollback that restores old frontend code while leaving incompatible new migrations must be evaluated before promotion; prefer backward-compatible migrations.

## Backend/API rollback

Remove the affected domain from `VITE_API_DOMAINS` and rebuild/promote the frontend so traffic returns to the existing Supabase path. Do not keep sending production traffic to an API domain with correctness/authorization mismatches just because the service itself is reachable.

## Funding Intelligence containment

If verification/status quality regresses:

- stop or disable the refresh schedule if it is corrupting canonical facts;
- demote affected records to stale/unknown rather than preserving a false `open` state;
- keep AI discoveries separated/unverified;
- preserve source evidence for investigation;
- use member correction reports to prioritize rechecks.

## Payment containment

If payment integrity fails, stop new payment-related releases and investigate reconciliation. Never solve a provider/ledger incident by mass-setting `has_access` without verified settlement evidence.

## Supabase/data rollback

Use `docs/production-readiness/evidence/restore-runbook.md`. Do not improvise destructive production SQL while incident pressure is high.

## Release closure

Record:

- release SHA/deploy identifiers;
- migrations applied;
- smoke-test outcome;
- live Funding Intelligence/Payment checks performed;
- monitoring/alert state;
- known deviations/deferred gates;
- GO/NO-GO owner and decision time.
