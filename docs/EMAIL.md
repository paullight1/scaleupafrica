# Transactional email (Resend)

Every outbound Cresciva email goes through Resend from Supabase Edge Functions. Browser clients never hold the Resend API key and never choose arbitrary recipients.

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

The repository includes contact acknowledgements/team notifications, newsletter/resource delivery, payment receipts and Funding Intelligence notification templates. Funding notifications are queued/delivered by the scheduler-only `funding-notifications` function and re-check member preferences/trust before send.

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

The actual sending domain/address must be one Cresciva controls and has verified with Resend. Do not assume `cresciva.com` ownership from repository examples; configure the verified operational domain at deployment.

## Deployment

After database migrations/secrets are applied, deploy the email/payment/funding functions used by the release, including at minimum the current Bachs functions plus `send-email`, `email-unsubscribe` and, when scheduled funding alerts are enabled, `funding-notifications`.

The repository deliberately does not require retired `paystack-*` functions.

## Adding a message

1. Add a typed template and text alternative in `templates.ts`.
2. Escape every user/provider string and validate URLs before rendering.
3. Add the payload to the exhaustive template dispatch union/switch.
4. Send through the shared audited dispatch funnel, never direct provider calls.
5. Add template tests, including hostile input/XSS cases where relevant.
6. Define whether the message is transactional or preference-controlled before shipping it.
