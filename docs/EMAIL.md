# Email delivery (Resend + Brevo)

Cresciva deliberately separates email by purpose:

- **Resend** sends transactional and visitor-triggered messages: contact acknowledgements, newsletter welcomes, resource delivery, payment receipts and Funding Intelligence notifications.
- **Brevo** sends administrator-authored marketing campaigns from `/admin/newsletter` and returns delivery/engagement events.

Both providers are called only from Supabase Edge Functions. Browser clients never hold provider keys or choose arbitrary provider IDs. Supabase remains the source of truth for newsletter consent, campaign revisions and immutable recipient snapshots; Brevo is the marketing-delivery executor.

## Shared email layer

`supabase/functions/_shared/email/` owns:

- `config.ts` — environment/brand configuration;
- `render.ts` — escaped HTML/text primitives;
- `templates.ts` — typed message templates;
- `resend.ts` — the only direct Resend HTTP client;
- `tokens.ts` — signed unsubscribe tokens;
- `dispatch.ts` — render → send → audit funnel;
- `receipt.ts` — provider-neutral membership receipt helper.

Keep pure template/config/render helpers free of `Deno.*` and `npm:` imports so Frontend Vitest can import and validate them.

## Current message families

The repository includes contact acknowledgements/team notifications, newsletter welcome messages, resource delivery, payment receipts and Funding Intelligence notification templates. Funding notifications are queued/delivered by the scheduler-only `funding-notifications` function and re-check member preferences/trust before send.

## Marketing campaigns (Brevo)

`supabase/functions/_shared/brevo/` owns the provider adapter, retries/timeouts, response redaction, contact synchronization, campaign operations and webhook normalization. The integration consists of:

- `newsletter-admin` — JWT-protected, explicitly re-checks `is_admin`, and owns campaign/subscriber/provider operations;
- `brevo-webhook` — public provider endpoint protected by a dedicated bearer token;
- `send-email` — persists public newsletter consent, sends the Resend welcome, and performs a best-effort Brevo contact upsert for new or renewed consent;
- `newsletter_campaigns`, `newsletter_campaign_recipients`, `newsletter_campaign_events`, `newsletter_consent_events` and `newsletter_sync_jobs` — local operational state from migration `20260824145932_newsletter_command_center.sql`.

Fresh public signups are valid as soon as Supabase persists them. A Brevo outage does not discard that consent: the contact is marked failed/pending, and the AdminPanel reconciliation action or campaign delivery retries synchronization. Campaign delivery always re-reads active local consent and creates a campaign-specific Brevo list, so a scheduled audience cannot drift with the master list.

Every changed campaign revision requires a successful test send before it can be sent or scheduled. Once queued, campaign content and audience criteria are immutable. Brevo unsubscribe, complaint and hard-bounce events suppress the local subscriber; routine synchronization never silently re-subscribes them.

## Bachs payment receipts

Payment settlement is owned by the Bachs Supabase Edge path (`bachs-webhook` / `bachs-verify`). A successful verified settlement can cause either path to complete the same entitlement. Receipt delivery therefore uses a stable idempotency key derived from the Cresciva payment ID/reference so a callback/webhook race does not intentionally send duplicate receipts.

A failed receipt is **not** a failed payment. Payment/access truth comes from the payment ledger and membership grant transaction; email delivery state is audited separately in `email_events`.

## Public email capture endpoint

`send-email` must remain callable by signed-out visitors because contact, newsletter and gated-resource flows can start without an account. It defends itself with:

- strict server-side payload validation;
- honeypot handling;
- per-IP throttling using a salted hash rather than the raw IP;
- server-selected recipients;
- server-resolved resource delivery URLs.

The throttle may fail open to preserve the contact path, but payload validation/recipient ownership must not.

## Unsubscribe and preferences

Bulk/non-essential email must honour the supported unsubscribe/preference model. Signed unsubscribe tokens must not expose secrets and must remain useful for already-delivered messages across their reasonable lifetime. Transactional receipts/security/account messages are not treated as optional marketing mail.

Funding-alert delivery additionally checks the member's funding-notification preferences immediately before sending.

## Audit log

`public.email_events` records send attempts (`sent`, `failed`, or `skipped`) and provider IDs/errors where available. Service-role owns writes and administrators can inspect the audit trail. Do not put raw authentication tokens, payment credentials or unrelated private provider payloads in this table.

## Configuration

Secrets belong in the deployment secret store / `supabase/.env` for local operation, never Vite/browser variables.

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API authentication |
| `EMAIL_FROM` | verified sending identity |
| `EMAIL_REPLY_TO` | monitored reply destination |
| `EMAIL_TEAM_INBOX` | contact/support notification inbox |
| `SITE_URL` | canonical link base used in emails |
| `EMAIL_TOKEN_SECRET` | HMAC secret for unsubscribe/safety tokens |
| `FUNDING_NOTIFICATION_SECRET` | scheduler authentication for funding delivery |
| `BREVO_API_KEY` | server-side Brevo Marketing API authentication |
| `BREVO_LIST_ID` | authoritative master newsletter list; its folder holds campaign snapshots |
| `BREVO_SENDER_ID` | verified Brevo sender identity used for every campaign |
| `BREVO_WEBHOOK_TOKEN` | long random bearer token required by `brevo-webhook` |

The actual sending domain/address must be one Cresciva controls and has authenticated with each active provider. Do not assume `cresciva.com` ownership from repository examples; configure the verified operational domain at deployment.

## Brevo account setup

1. Authenticate the Cresciva sending domain in Brevo (SPF/DKIM and any provider-requested DNS records), then create and verify the production sender. Record its numeric sender ID as `BREVO_SENDER_ID`.
2. Create one master contact list for the newsletter. Record its numeric list ID as `BREVO_LIST_ID`. Do not reuse an unrelated/imported list: Cresciva consent must remain authoritative.
3. Create a restricted Brevo API key for marketing/contact operations and store it only as `BREVO_API_KEY` in Supabase secrets.
4. Generate a long random `BREVO_WEBHOOK_TOKEN`. Register a Brevo marketing webhook at `https://<project-ref>.supabase.co/functions/v1/brevo-webhook`, configure `Authorization: Bearer <BREVO_WEBHOOK_TOKEN>`, and enable sent, delivered, opened, click, soft bounce, hard bounce, spam/complaint, unsubscribe, contact-updated and contact-deleted events.
5. Never copy these four values into `Frontend/.env`, `AdminPanel/.env`, Vite variables, source code or screenshots. `supabase/.env.example` documents names only.

After deployment, open **Admin → Newsletter → Settings**. It must show a connected Brevo account, the expected list and sender IDs, and then a webhook timestamp after the first test event. Use **Reconcile audience** to retry any pending/failed contacts.

## Deployment

Apply the newsletter migration before deploying functions that write the new subscriber fields:

```sh
supabase db push
supabase secrets set --env-file supabase/.env
supabase functions deploy send-email
supabase functions deploy newsletter-admin
supabase functions deploy brevo-webhook --no-verify-jwt
```

Also deploy `email-unsubscribe`, the current Bachs functions and, when scheduled funding alerts are enabled, `funding-notifications`. The repository deliberately does not require retired `paystack-*` functions.

Before the first production campaign, add a test subscriber you control, reconcile it, create a draft, send a test of the exact revision, send to that one-person segment, and verify delivered/clicked/unsubscribed events in the read-only campaign report. Do not use a production-wide audience as the first live smoke test.

## Adding a message

1. Add a typed template and text alternative in `templates.ts`.
2. Escape every user/provider string and validate URLs before rendering.
3. Add the payload to the exhaustive template dispatch union/switch.
4. Send through the shared audited dispatch funnel, never direct provider calls.
5. Add template tests, including hostile input/XSS cases where relevant.
6. Define whether the message is transactional or preference-controlled before shipping it.
