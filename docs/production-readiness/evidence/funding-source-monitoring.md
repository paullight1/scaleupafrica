# Funding Source Monitoring — P0-B Evidence

Status: **REPOSITORY IMPLEMENTED / LIVE EVIDENCE BLOCKED_EXTERNAL**

This document defines the operational alerts and fail-closed behavior for Cresciva's paid current-opportunity promise. It is repository evidence only until the actual Cresciva Supabase/Vercel environment and scheduler are connected and observed.

## Trust invariant

Primary paid application actions require all of the following at read time:

`verified source + fresh current-cycle status + (open | closing_soon | rolling) + eligible`

A stale stored `open` value is downgraded to effective `unknown`. Worker failures append evidence but do not refresh `status_checked_at`, so a failed recheck can never make an old OPEN record look fresh.

## Freshness windows

| Stored status | Maximum age before effective `unknown` |
| --- | ---: |
| `closing_soon` | 6 hours |
| `open` | 24 hours |
| `rolling` | 48 hours |
| `upcoming` | 24 hours |
| `closed` | 7 days |
| `paused` | 24 hours |
| `unknown` | 12 hours |

These windows are implemented in `Shared/src/lib/fundingStatus.ts` and are enforced again at Frontend/NestJS/Edge read boundaries.

## Required alerts / release blockers

### 1. Primary OPEN freshness breach

Alert when **more than 5%** of records eligible for the primary paid OPEN output are beyond their configured status freshness window.

Release rule: any stale record is removed from effective OPEN immediately; the >5% metric is an operations incident, not permission to continue showing stale data.

### 2. Source retrieval failure streak

Alert when an authoritative source has **3 consecutive failed checks**.

The admin Funding Source Health console shows the latest bounded error class, consecutive failure count, and last successful check. Source registry health is updated by `funding-source-refresh` without copying raw source bodies into analytics.

### 3. Conflicting current-cycle evidence

Alert whenever **conflict count > 0** for an opportunity that would otherwise appear in primary recommendations.

Conflict always classifies to `unknown`. Current conflict detection includes open+closed, open+paused, rolling+closed, rolling+paused, and closed+paused signals. There is no manual `Force open` control.

### 4. Broken authoritative links

Alert when sampled authoritative funding source links show a **broken-link rate >= 1%**.

Fetch/network failures are recorded in append-only `funding_source_checks` with bounded `error_class`. A broken link does not refresh canonical status.

## Operational events

General analytics may contain only identifiers, counts, status names, error classes, confidence-independent control metadata, and transition metadata. It must not contain fetched page bodies or source quotes.

Events implemented:

- `funding_source_check_success`
- `funding_source_check_failure`
- `funding_status_changed`
- `funding_status_conflict`
- `funding_source_overdue`
- `recommendation_apply_click`
- `opportunity_source_click`

## Staff operating surface

`/admin/funding/sources` provides:

- Due for refresh
- Failures
- Conflicts / Unknown
- Authoritative source registry health
- Recent successful status transitions
- Individual `Recheck`
- Bounded browser-side `Refresh due` using staff-authenticated individual checks
- Add/Edit authoritative source registry

The scheduler secret `FUNDING_REFRESH_SECRET` is never exposed to the browser. Source base-URL changes use `update_funding_source_and_invalidate(...)`, which revokes dependent source verification and current-cycle trust until fresh evidence succeeds.

## Scheduler contract

The production scheduler calls `funding-source-refresh` in `mode: "due"` using `X-Cresciva-Refresh-Secret`. Each invocation is hard-capped at 25 targets and prioritises:

1. closing-soon overdue >6h
2. open overdue >24h
3. upcoming overdue >24h
4. unknown/conflict overdue >12h
5. rolling overdue >48h
6. paused overdue >24h
7. closed overdue >7d

Staff-initiated checks use JWT-authenticated `mode: "opportunity"` and do not receive the scheduler secret.

## Evidence still required for LIVE PASS

- Deploy `20260822050000_opportunity_application_status.sql` to Cresciva Supabase project `dwyglydswegyvjowzdot`.
- Deploy `funding-source-refresh` and configure `FUNDING_REFRESH_SECRET` plus the existing AI extraction key.
- Configure the production scheduler and capture run evidence over multiple freshness windows.
- Verify source-registry updates invalidate affected canonical rows in the live database.
- Exercise at least one fetch failure, extraction failure, conflict, open, closing-soon, rolling, upcoming and closed transition in staging/live evidence.
- Confirm alerting/dashboards observe the thresholds above.

Until these checks exist, live P0-B certification remains **BLOCKED_EXTERNAL**.