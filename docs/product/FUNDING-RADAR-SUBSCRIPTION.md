# Cresciva Funding Radar — Core Subscription Experience

## Implementation status — 22 August 2026

**Repository implementation:** substantially complete for P0-C.

**Live production certification:** **BLOCKED_EXTERNAL** until the Cresciva Supabase project, production Edge functions/scheduler, Bachs membership flow, notification transport and current GitHub Actions runners are available and evidenced.

## Paid product promise

Funding Radar is not a generic opportunity list. The primary paid surface answers:

> Which verified opportunities are actually open now, and which ones can this member apply for based on the facts Cresciva currently knows?

The primary surface is fail-closed. Relevance score cannot override source trust, current-cycle status or deterministic eligibility.

Primary `Apply now` requires:

```text
verification_status = verified
AND effective application_status IN (open, closing_soon, rolling)
AND application status is fresh
AND eligibility_status = eligible
AND application_url is present and valid
```

If any part is missing, the record leaves the primary action experience instead of being padded into it.

## Four Funding Radar surfaces

### Open for you

Verified + fresh + current OPEN/ROLLING/CLOSING_SOON + deterministic ELIGIBLE.

This is the core paid recommendation surface.

### Closing soon

A subset of `Open for you` where deterministic current-cycle status is `closing_soon`. The deadline must already be source-confirmed by P0-B.

### Watchlist

Verified records that are worth monitoring but are not safe primary applications yet, including:

- upcoming opportunities;
- paused opportunities;
- unknown current-cycle status;
- stale current-cycle status;
- open opportunities with missing/uncertain member eligibility information.

### Explore

Everything intentionally outside the paid primary trust gate, including:

- closed records;
- hard ineligible records;
- stale/unverified source records;
- AI-assisted discoveries.

AI discovery is always Explore-only until P0-B authoritative verification succeeds.

## Truthful zero state

When no opportunity passes the primary gate, Cresciva renders:

> **You’re not currently eligible for any verified open opportunities.**
>
> We’ll keep checking verified sources. Review Watchlist for upcoming programs or missing profile details.

The product must not fill this state with closed, stale, unverified or AI-generated opportunities.

## Eligibility and relevance are different

The card UI intentionally shows separate concepts:

- match score;
- deterministic eligibility state;
- current application state;
- source verification state;
- member workflow state.

Eligibility states:

```text
eligible
possibly_eligible
insufficient_information
ineligible
```

A high match score with insufficient eligibility information belongs in Watchlist, not `Open for you`.

## Returning-member profile completion

`FundingProfilePrompt` asks only for missing decision-critical fields:

- country;
- sector;
- business stage;
- preferred funding types;
- funding target;
- application readiness.

Each CTA deep-links to the relevant profile-edit section. Once saved, existing query invalidation/reranking recomputes Funding Radar without a second onboarding flow.

## Member application workflow

`member_opportunity_state` is member-local state under owner-only RLS:

```text
saved
preparing
applied
won
rejected
dismissed
```

It never mutates canonical funding verification, current-cycle status or deterministic eligibility.

The UI supports:

- Save
- I’m preparing
- Mark applied
- Won / Rejected after Applied
- Not relevant

Writes are not optimistic. The database mutation must succeed before query state/analytics report success.

## Notifications

P0-C adds two independent member preferences:

- `email_new_matches`
- `email_deadline_alerts`

Only saved/preparing opportunities may create transition notifications. Supported high-signal events:

```text
watchlist_opened
closing_soon
deadline_changed
```

`notification_events.dedupe_key` prevents refresh retries from creating duplicate member events. The source-check UUID is the transition key.

The P0-B source worker enqueues notifications only after a successful deterministic status update. Failed fetch/extraction attempts do not enqueue optimistic alerts.

The repository includes the preference hook/component and deterministic queueing. Production email delivery evidence remains external until the Cresciva Resend/deployment environment is connected and exercised.

## Analytics

Funding Radar lifecycle events include:

- `recommendation_impression`
- `recommendation_open`
- `recommendation_apply_click`
- `recommendation_save`
- `recommendation_not_relevant`
- `application_started`
- `application_submitted`
- `application_won`
- `application_rejected`

General analytics is restricted to identifiers, scores, state names, counts and bounded operational metadata. Raw search text, fetched source text and provider response bodies are forbidden.

## Acceptance fixtures implemented across repository tests

- verified + fresh + open + eligible -> `Open for you`;
- closing soon + eligible -> `Open for you` + `Closing soon`;
- open + insufficient eligibility information -> `Watchlist`;
- verified upcoming -> `Watchlist`;
- verified closed -> `Explore`;
- AI discovery claiming open -> `Explore` only;
- no primary-qualified records -> exact honest zero state;
- saved upcoming -> notification when authoritative state becomes open;
- closing-soon/deadline transition -> preference-aware notification;
- member workflow state never carries canonical opportunity fields.

## External evidence still required for LIVE PASS

- Deploy P0-A/P0-B/P0-C migrations to Cresciva Supabase project `dwyglydswegyvjowzdot`.
- Deploy enrichment/status Edge functions and configure scheduler/provider secrets.
- Verify Bachs membership unlocks Funding Radar only after payment settlement evidence.
- Exercise notification queue plus actual email transport in staging/live.
- Verify member state and notification RLS on the live database.
- Observe source-status transitions over multiple freshness windows.
- Obtain a real current GitHub Actions run for the final branch head. Current Actions jobs are failing before checkout with `steps: null`, so the latest full compile/test/Deno gate is not evidenced.

Until these exist, P0-C is **repository implemented / live BLOCKED_EXTERNAL**, not production-certified.