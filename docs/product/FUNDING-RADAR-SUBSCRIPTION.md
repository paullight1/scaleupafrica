# Cresciva Funding Radar — Core Subscription Experience

## Implementation status — 23 August 2026

**Repository implementation:** substantially complete for P0-C.

**Live production certification:** **BLOCKED_EXTERNAL** until the real Cresciva Supabase project, schedulers/provider secrets, live Resend delivery, GitHub Actions execution and human/live accuracy certification are available and evidenced.

## Paid product promise

Funding Radar answers:

> Which source-verified opportunities are actually accepting applications now, and which of those can this member apply for based on the facts Cresciva currently knows?

Relevance score cannot override source trust, current-cycle status or hard eligibility.

Primary application eligibility requires:

```text
discovery_source = verified_feed
AND verification_status = verified
AND effective application_status IN (open, closing_soon, rolling)
AND current-cycle status is fresh
AND eligibility_status = eligible
AND application_url is valid
```

The member-facing CTA is **Apply on official site**.

## Four Funding Radar surfaces

### Open for you

Verified + fresh + currently open/rolling/closing-soon + deterministic eligible.

### Closing soon

A subset of Open for you where the Status Engine produced `closing_soon` from current-cycle source evidence.

### Watchlist

Verified records that are relevant but not safe primary applications yet:

- upcoming;
- paused;
- current status unknown;
- current status stale;
- open but member eligibility is incomplete/uncertain.

### Explore

Everything intentionally outside the paid primary gate, including:

- closed records;
- hard-ineligible records;
- stale/unverified records;
- AI discoveries.

AI discovery stays Explore-only until authoritative verification upgrades a canonical record.

## Truthful zero state

When nothing passes the primary gate, Cresciva shows:

> **You’re not currently eligible for any verified open opportunities.**
>
> We’ll keep checking verified sources. Review Watchlist for upcoming programs or missing profile details.

The product does not fill this state with closed or uncertain results.

## Opportunity Search inside Funding Radar

Search is secondary to automatic recommendations and is separated into:

```text
Verified current matches
Other verified records
AI discoveries
```

Verified-current search results require a verified source plus a fresh current `open | closing_soon | rolling` status.

Search itself never grants the member-specific primary application CTA. Search cards remain exploratory; Funding Radar applies the full profile eligibility gate.

## Profile improvement

Returning members see prompts for missing decision-critical facts such as country, sector, business stage, preferred funding types, funding target and application readiness.

Cresciva explains **what decision a field improves** rather than inventing percentage-lift claims.

## Member application workflow

`member_opportunity_state` is member-local under owner-only RLS:

```text
saved
preparing
applied
won
rejected
dismissed
```

The first `applied` transition records `applied_at`. Later transitions preserve that original timestamp.

Workflow state never changes source verification, application status or hard eligibility.

## Notifications

Member preferences:

- `email_new_matches`
- `email_deadline_alerts`

High-signal transition events:

```text
watchlist_opened
closing_soon
deadline_changed
```

Repository notification flow:

```text
authoritative source refresh
    ↓
deterministic canonical status persisted
    ↓
enqueue_funding_transition_notifications
    ↓
notification_events (dedupe key)
    ↓
funding-notifications delivery worker
    ↓
recheck saved/preparing + preferences + verified/current freshness
    ↓
existing email dispatch / Resend
```

Delivery is bounded to 25 leased events, uses `FOR UPDATE SKIP LOCKED`, retries at most three queue attempts, suppresses events that became irrelevant, and uses `funding-alert:<event-id>` as the email transport idempotency key.

Production delivery evidence is still external until the real scheduler/secret/Resend environment is deployed and exercised.

## Analytics/privacy

Funding events include impressions, opens, saves, dismissals, apply clicks, application outcomes, source clicks and search aggregate counts.

The shared analytics boundary strips raw search/page/source-body fields and bounds retained metadata. Raw third-party page text is not product analytics.

## Repository acceptance coverage

The targeted P0 gates now cover:

- verified + fresh + open + eligible -> Open for you;
- closing soon -> Open for you + Closing soon;
- open + missing eligibility data -> Watchlist;
- verified upcoming -> Watchlist;
- verified closed -> Explore;
- AI result claiming OPEN -> Explore/unverified/unknown;
- honest zero primary state;
- official application CTA requires hard eligibility + source/current trust;
- Search groups verified current / other verified / AI separately;
- member workflow does not mutate canonical opportunity truth;
- applied timestamp is not overwritten by later workflow states;
- authoritative refresh queues transition notifications;
- delivery rechecks member state, preference and current opportunity trust before email;
- notification delivery is idempotent/retry-bounded;
- raw source bodies are excluded from notification/analytics payloads.

## External evidence required for LIVE PASS

1. Deploy P0 migrations to Cresciva Supabase project `dwyglydswegyvjowzdot`.
2. Deploy business enrichment, source refresh and notification Edge functions.
3. Configure discovery/status/notification scheduler secrets and actual schedules.
4. Exercise live source transitions across freshness windows.
5. Exercise real funding-alert email sends/suppressions/retries.
6. Verify member-state and notification RLS on the live database.
7. Complete the required human-adjudicated accuracy corpus and live link checks.
8. Obtain a genuine successful GitHub Actions run on the final branch head.
9. Complete Bachs/Vercel/OAuth/email launch gates from the wider readiness PR.

Until these exist, P0-C is **repository implemented / live BLOCKED_EXTERNAL**, not production-certified.
