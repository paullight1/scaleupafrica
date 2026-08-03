# Transactional email (Resend)

Every outbound email Cresciva sends goes through Resend, from Supabase edge
functions. The browser never holds an API key and never picks a recipient.

## Layout

```
supabase/functions/_shared/email/
├── config.ts      brand palette + env → EmailConfig, address validation
├── render.ts      esc(), safeUrl(), layout(), button() — HTML primitives
├── templates.ts   one pure function per message; render() dispatches on `kind`
├── resend.ts      the only code that talks to api.resend.com (retry, idempotency)
├── dispatch.ts    render → send → audit. The single funnel.
├── tokens.ts      HMAC-signed unsubscribe tokens
└── receipt.ts     payment receipt, shared by both Paystack paths

supabase/functions/send-email/          public capture + notify endpoint
supabase/functions/email-unsubscribe/   List-Unsubscribe handler
Frontend/src/lib/email.ts               the browser's only entry point
```

`config.ts`, `render.ts`, `templates.ts`, `resend.ts`, `tokens.ts` and
`dispatch.ts` are pure TypeScript — no `Deno.*`, no `npm:` imports — so they run
on the Deno edge runtime *and* under Vitest. That is why the test suite in
`Frontend/src/lib/__tests__/email-*.test.ts` can import them directly.
Keep it that way: an `npm:` import in any of those files breaks the tests.

## The five messages

| kind | Trigger | Recipient |
|---|---|---|
| `contact_ack` | `/contact` form | the sender |
| `contact_notify` | `/contact` form | `EMAIL_TEAM_INBOX`, reply-to = sender |
| `newsletter_welcome` | newsletter box | the subscriber (once) |
| `resource_delivery` | gated `/resources/:slug` form | the requester |
| `payment_receipt` | successful Paystack charge | the buyer |

## Flows

**Contact, newsletter and gated downloads** all POST to the `send-email` edge
function, which owns the row write *and* the notification. The browser no longer
inserts into `leads` / `newsletter_subscribers` directly. This buys three things:

- The team is always told about a lead that was captured — one code path, not two.
- The download URL in a delivery email is resolved from the `resources` table
  server-side. A client cannot make us mail an arbitrary link over our domain.
- Validation, honeypot and throttling live somewhere devtools can't reach.

**A failed send is not a failed submit.** Once the row is persisted the caller
gets a 200 even if Resend is down; the failure lands in `email_events`. Telling
a founder "your message failed" because our mail provider blipped is strictly
worse than a missing acknowledgement.

**Payment receipts** are sent by `paystack-webhook` *and* `paystack-verify` —
either can complete the same grant. Both use the `receipt:<paymentId>`
idempotency key, and Resend collapses identical keys for 24h, so the customer
gets exactly one receipt whichever path wins.

## Why `send-email` has no JWT

The contact form, newsletter box and resource form are all used by signed-out
visitors, so `verify_jwt = false`. That makes the function internet-facing, and
it defends itself:

- strict server-side validation of every field;
- a honeypot field (`hp`) that silently absorbs naive bots — the response is a
  normal 200 so they learn nothing;
- a per-IP throttle of 10 sends/hour, counted against `public.email_events`
  using a **salted SHA-256 of the IP**, never the raw address;
- recipients are never caller-controlled beyond the single address being
  confirmed. There is no "send to whoever you like" shape in the API.

The throttle **fails open**: if the count query errors, the request proceeds. A
broken throttle must not take the contact form offline.

## Unsubscribe

Bulk-ish mail (newsletter welcome, resource delivery) carries RFC 8058
`List-Unsubscribe` + `List-Unsubscribe-Post` headers pointing at
`email-unsubscribe`, plus a footer link. Tokens are HMAC-SHA256 over
`{purpose, email}` and **do not expire** — a link sits in an inbox for years,
and a token that stops working turns a legal obligation into a support ticket.

Rotating `EMAIL_TOKEN_SECRET` invalidates every unsubscribe link already
delivered. Treat it as permanent.

Transactional mail (receipts, contact acknowledgements) carries no unsubscribe
link, which is correct: you cannot opt out of a receipt for something you bought.

## Audit log

`public.email_events` records every dispatch — `sent`, `failed`, or `skipped`
(the last means `RESEND_API_KEY` was not configured). Service-role write, admin
read. It answers "did the receipt actually go out?" without opening the Resend
dashboard, and it backs the throttle.

## Configuration

Secrets live in `supabase/.env` (gitignored — see `supabase/.env.example`):

| Var | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | yes | Missing → every send is logged `skipped`, flows still work |
| `EMAIL_FROM` | no | Default `Cresciva <hello@cresciva.com>`. Domain must be verified in Resend |
| `EMAIL_REPLY_TO` | no | Default `hello@cresciva.com` |
| `EMAIL_TEAM_INBOX` | no | Where contact-form notifications land |
| `SITE_URL` | no | Link base inside emails. No trailing slash |
| `EMAIL_TOKEN_SECRET` | yes for unsubscribe | `openssl rand -hex 32`. Also salts the IP hash |

Local:

```sh
supabase functions serve --env-file supabase/.env
```

Production:

```sh
supabase secrets set --env-file supabase/.env
supabase db push
supabase functions deploy send-email email-unsubscribe paystack-webhook paystack-verify
```

### Before the first real send

1. **Verify the sending domain** in Resend (Domains → add `cresciva.com`, then
   the DKIM/SPF/DMARC records at your DNS host). Until that is green, Resend
   only accepts sends to your own account address and everything else 403s.
2. Point `EMAIL_FROM` at a mailbox on that verified domain.
3. Set `EMAIL_TOKEN_SECRET`, or unsubscribe links are silently omitted.

## Adding a template

1. Write a pure `(ctx) => RenderedEmail` in `templates.ts`, escaping every
   interpolated value with `esc()` / `safeUrl()` and producing a plain-text
   alternative (HTML-only mail is penalised by spam filters).
2. Add it to the `EmailPayload` union and the `render()` switch — the
   exhaustiveness check makes a missed case a compile error.
3. Call it through `dispatch()`, never `sendEmail()` directly, or you skip the
   audit row, the unsubscribe headers and the tagging.
4. Add cases to `Frontend/src/lib/__tests__/email-templates.test.ts`, including
   one that proves a `<script>` in the input does not survive rendering.

## MCP

`.mcp.json` registers Resend's hosted MCP server at `https://mcp.resend.com/mcp`
for sending/inspecting mail from the agent. It authenticates with
`Bearer ${RESEND_API_KEY}`, expanded from the environment — the key itself sits
in `.claude/settings.local.json`, which is gitignored. `.mcp.json` is committed,
so never inline the literal key there.
