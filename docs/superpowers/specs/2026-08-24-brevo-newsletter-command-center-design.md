# Brevo Newsletter Command Center Design

**Date:** 2026-08-24
**Status:** Approved

## Purpose

Replace the underdeveloped AdminPanel subscriber list with a complete newsletter command center. Cresciva administrators can manage consent, compose rich branded campaigns, target all active subscribers or useful segments, send tests, schedule or send through Brevo, and inspect delivery and engagement without leaving the AdminPanel.

## Product decisions

- Brevo is the marketing-email platform.
- Existing Resend-based transactional email remains unchanged. Welcome messages, receipts, contact acknowledgements, resource delivery, and funding notifications continue through the audited Resend transport.
- Supabase is authoritative for consent, local campaign content, immutable audience snapshots, administrative audit history, and normalized delivery events.
- Brevo is authoritative for marketing delivery execution and provider reporting.
- Only administrators may create, edit, test, schedule, send, cancel, or synchronize campaigns and subscribers.
- Campaigns may target every active subscriber or a combination of signup-source and subscription-date filters.
- Sent campaigns are immutable. An administrator edits a sent campaign by duplicating it into a new draft.

## Admin experience

The `/admin/newsletter` workspace has four tabs.

### Overview

Overview shows active and unsubscribed subscriber totals, 30-day subscriber growth, unsubscribe rate, delivery rate, click rate, recent campaigns, and integration health. Empty metrics display an honest zero/empty state rather than fabricated trends. Integration health reports configuration, last successful contact sync, last webhook receipt, and outstanding failed sync operations.

### Campaigns

Campaigns lists drafts, scheduled, sending, sent, failed, and cancelled campaigns. Administrators can search, filter, create, open, duplicate, archive drafts, and cancel a scheduled campaign before Brevo begins delivery. Each sent campaign opens a read-only report with recipient, delivered, bounced, opened, clicked, complained, and unsubscribed counts.

### Subscribers

Subscribers are server-paginated and searchable. Filters cover consent status, signup source, subscription date, and provider sync state. The table supports manual addition, explicit unsubscribe, CSV import, active-list CSV export, row-level sync retry, and a consent-history drawer. Manual resubscription requires a confirmation that the person supplied renewed consent; the action records the administrator and timestamp.

### Settings

Settings shows masked provider configuration, connection/list/sender status, last webhook and sync times, and a guarded full-audience resynchronization action. Browser code never reads or displays the Brevo API key or webhook bearer token.

## Campaign studio

Campaign creation is a three-step workflow with autosave.

### 1. Compose

The administrator enters an internal campaign name, subject, preview text, sender name, configured sender identity, and reply-to address. A structured block editor supports:

- heading;
- paragraph;
- image with alternative text and link;
- call-to-action button;
- divider;
- funding opportunity card;
- resource card;
- social-link row.

Blocks can be added, reordered, duplicated, and removed. The editor stores validated block JSON, not arbitrary raw HTML. A pure renderer produces responsive, inline-styled HTML and a meaningful plain-text alternative. All text is escaped, links allow only `http:` or `https:`, and images require an HTTPS URL. The renderer adds Cresciva branding and a Brevo-compatible unsubscribe footer.

### 2. Audience

The sender chooses all active subscribers or a segment. A segment may include one or more signup sources and optional inclusive joined-after/joined-before dates. Filters combine with AND across dimensions and OR within selected sources. The server returns an estimated count and a small sample. The client does not download the subscriber list to calculate eligibility.

### 3. Review and deliver

The review step provides desktop and mobile previews, validation findings, and a test-email action. Sending and scheduling remain disabled until at least one successful test send exists for the current content revision. The final confirmation names the campaign, shows the exact eligible-recipient count, repeats whether delivery is immediate or scheduled, and requires an explicit confirmation.

At confirmation, the server creates an immutable audience snapshot from locally subscribed recipients matching the chosen filters. Delivery uses that snapshot, so later source changes do not alter a campaign already queued. A final consent check excludes recipients who unsubscribed between snapshot creation and provider submission.

## Data model

### Existing subscriber table additions

`newsletter_subscribers` gains:

- `updated_at timestamptz not null default now()`;
- `subscribed_at timestamptz`;
- `unsubscribed_at timestamptz`;
- `unsubscribe_reason text`;
- `consent_source text`;
- `brevo_contact_id bigint`;
- `brevo_sync_status text not null default 'pending'` with values `pending`, `synced`, `failed`, and `suppressed`;
- `brevo_synced_at timestamptz`;
- `brevo_sync_error text`.

Existing subscribed records are backfilled with `subscribed_at = created_at` and `consent_source = coalesce(source, 'legacy')`. Status changes always update timestamps and append a consent event.

### `newsletter_consent_events`

An append-only consent ledger stores subscriber ID, email snapshot, event type (`subscribed`, `unsubscribed`, `resubscribed`, `hard_bounced`, `complained`, `admin_added`), source, reason, actor user ID, provider event ID, and creation time. Administrators can read it; writes occur only through the service role or guarded database functions.

### `newsletter_campaigns`

Stores the local campaign ID, status, content revision, internal name, subject, preview text, sender fields, block JSON, rendered HTML/text, audience-filter JSON, estimated recipient count, final recipient count, Brevo campaign ID, test metadata, scheduling timestamps, delivery timestamps, provider error, creator/updater IDs, and created/updated timestamps.

Statuses are `draft`, `scheduled`, `sending`, `sent`, `failed`, `cancelled`, and `archived`. Database checks prevent modification of content/audience fields after a campaign leaves `draft`.

### `newsletter_campaign_recipients`

Stores the immutable campaign/subscriber snapshot with email, source, consent timestamp, provider contact ID, and exclusion/delivery state. A unique `(campaign_id, email)` constraint makes snapshot creation idempotent.

### `newsletter_campaign_events`

Stores normalized Brevo marketing events. The unique provider event identity (or a deterministic hash where Brevo does not provide one) prevents duplicate webhook delivery from inflating metrics. Fields include campaign ID, recipient email, event type, event timestamp, provider event ID, URL for clicks, reason, and a redacted raw-metadata subset.

### `newsletter_sync_jobs`

Stores contact synchronization work with operation (`upsert`, `unsubscribe`, `resync`), subscriber ID, status, attempt count, next attempt, last error, and timestamps. A partial index over queued/failed work supports retries without scanning completed history.

All new public-schema tables enable RLS and receive explicit grants. Admin read policies call the established `is_admin(auth.uid())` helper. Browser clients do not receive insert/update/delete grants for provider, event, snapshot, or sync-job tables.

## Provider boundary

`supabase/functions/_shared/brevo/` contains provider-neutral types plus a small fetch-based Brevo client. It owns API authentication, timeouts, retry classification, response validation, error redaction, contact upsert/blacklist, campaign create/update/test/schedule/send/cancel, and reporting retrieval. The API key is read only from `BREVO_API_KEY` in the Edge Function environment.

The integration uses a configured Brevo list ID and sender ID rather than allowing arbitrary browser-supplied provider identifiers. Subscriber upserts use normalized email, `ext_id` set to the Cresciva subscriber UUID, `updateEnabled: true`, the configured list, and `emailBlacklisted` derived from local consent.

## Server interfaces

### `newsletter-admin` Edge Function

This JWT-protected function verifies the authenticated user and checks the administrator role server-side. It provides action-based endpoints for:

- overview and integration health;
- paginated subscribers and consent history;
- add, subscribe, unsubscribe, and retry-sync subscriber actions;
- campaign CRUD while draft;
- audience estimation;
- campaign preview rendering;
- test delivery;
- audience snapshot plus immediate send or schedule;
- scheduled-campaign cancellation;
- campaign report and event retrieval;
- guarded full resync.

All payloads are strictly validated. Arbitrary recipients, sender IDs, list IDs, template HTML, SQL filters, and provider credentials are rejected.

### `brevo-webhook` Edge Function

This public-platform function accepts only POST requests bearing the configured `Authorization: Bearer <BREVO_WEBHOOK_TOKEN>` value. It validates bounded payloads, supports single and batched Brevo marketing events, deduplicates each event, normalizes timestamps, and returns quickly.

Unsubscribe, hard-bounce, and spam events immediately update local consent/suppression state and append consent history. Delivery/open/click events update only the event ledger. Webhook processing never resubscribes a local contact from a provider-side list-addition event.

## Synchronization and consent rules

1. Public signup writes/resubscribes locally first, preserving the current successful user response and welcome-email behavior.
2. The same server operation enqueues a Brevo contact upsert. Provider failure does not undo valid local consent.
3. Worker/admin sync execution retries transient failures with bounded exponential backoff and retains a visible final error for permanent failures.
4. Local unsubscribe immediately prevents selection for new campaigns, then blacklists/unlinks the contact in Brevo.
5. Brevo unsubscribe, hard-bounce, or spam webhooks suppress locally and cannot be reversed by a routine sync.
6. Manual resubscription is permitted only through the guarded admin action and records renewed consent.
7. Bulk resync reconciles contacts toward local consent; it never imports an unknown Brevo contact as locally consented.

## Error handling and safety

- Missing Brevo configuration disables provider actions while leaving subscriber management readable.
- Provider timeouts, `429`, and `5xx` responses are retryable; validation/authentication and other permanent `4xx` responses surface actionable redacted errors.
- Every external mutation carries a stable idempotency key where the Brevo endpoint supports it and is also protected by local unique constraints/state transitions.
- Campaign send uses a guarded compare-and-set transition from `draft` to `sending`/`scheduled`, preventing double clicks from creating duplicate campaigns.
- The final subscriber count is calculated server-side inside the snapshot transaction.
- No raw API keys, webhook tokens, entire provider payloads, or unrestricted recipient data enter logs.
- Open metrics are labelled approximate because mailbox privacy protections can inflate them; delivery, bounce, complaint, unsubscribe, and click counts remain distinct.

## Visual direction

The workspace follows the existing Cresciva admin shell and shared component library. It uses a restrained editorial operations aesthetic: warm paper-like cards, Cresciva navy/orange emphasis, clear status typography, compact data density, and a split editor/preview composition on wide screens. It avoids introducing a parallel design system or modifying stock shared UI primitives.

## Testing and verification

- Pure unit tests cover audience-filter validation, HTML/text rendering, URL sanitization, provider error redaction, webhook normalization/deduplication, campaign state transitions, and consent transition rules.
- React Testing Library covers navigation between workspace tabs, subscriber filtering, composer block operations, autosave status, audience selection, successful-test gating, final confirmation, and read-only sent reports.
- SQL tests cover RLS/grants, admin-only access, immutable sent campaigns, idempotent snapshots/events, consent history, and indexed query shapes.
- Edge Function tests use injected fetch/database adapters; they never contact Brevo during the automated suite.
- Verification runs targeted tests after every red-green cycle, followed by AdminPanel tests, Frontend email tests, typecheck, lint, builds, and Supabase SQL tests where the local stack is available.

## Configuration and operations

Required server-side secrets/configuration:

- `BREVO_API_KEY`;
- `BREVO_LIST_ID`;
- `BREVO_SENDER_ID`;
- `BREVO_WEBHOOK_TOKEN`;
- existing `EMAIL_REPLY_TO` as the default reply address.

Deployment includes the database migration, `newsletter-admin`, `brevo-webhook`, Brevo list/sender verification, and creation of a secured batched marketing webhook for delivered, opened, click, hardBounce, softBounce, spam, unsubscribed, contactUpdated, and contactDeleted events. Domain authentication must be complete before production campaigns are enabled.

## Explicit non-goals

- Replacing Resend transactional email.
- A general-purpose drag-and-drop HTML/CSS editor.
- Arbitrary SQL-like audience rules or behavioral segmentation.
- SMS, WhatsApp, automation journeys, A/B testing, or best-time optimization in the first release.
- Importing provider-only contacts as consented Cresciva subscribers.
