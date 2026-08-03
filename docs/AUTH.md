# Authentication

Everything a visitor can do with an account, and where it lives.

## Screens

| Route | Owns |
|---|---|
| `/auth` | Sign in — password, Google, passwordless link/code — and the TOTP step-up. |
| `/auth/signup` | Account creation only: a three-step wizard. |
| `/auth/forgot` | Request a reset email. |
| `/auth/reset` | Set a new password from a recovery link. |

`/auth?mode=signup` is the pre-wizard entry point. `Auth.tsx` forwards it to
`/auth/signup` with `?next=` intact — marketing CTAs and already-sent emails
still carry it, so the redirect is load-bearing, not tidy-up.

### Components

Screens are one-per-file under `Frontend/src/components/auth/`. The wizard's
state machine is `signup/useSignUpWizard.ts`; the steps are dumb and take props.
`Shared/src/components/auth/PasswordField.tsx` (show/hide toggle) and
`PasswordStrength.tsx` are shared so signup, sign-in and reset behave alike.

## The signup wizard

1. **Email** — plus the Google button. Validation only; nothing is sent yet.
2. **Password** — password + confirm, each with its own reveal toggle, a live
   strength meter and a live match indicator.
3. **Name + business** — both optional, stored on `user_metadata` as
   `full_name` / `business_name`.

Two rules worth keeping:

- **Nothing reaches Supabase before step 3.** An abandoned wizard creates no
  account and burns none of the per-address email rate limit.
- **State is memory-only.** No `sessionStorage`: a password typed into a wizard
  must not outlive the tab.

`user_metadata` is user-controlled and therefore never a trust boundary. It is
read once, as a *default*, by `DashboardProfileEdit` when the user has no
profile row yet — the profile schema still validates every field.

## Passwords

`Shared/src/lib/passwordStrength.ts` is the single source of truth:
`MIN_PASSWORD_LENGTH` (8) and `MAX_PASSWORD_LENGTH` (72, bcrypt's input limit).

The meter is **advisory** — there are no composition rules, because "must
contain a symbol" pushes people towards `Passw0rd!` and away from passphrases.
The only hard rules are the two lengths and "the two boxes must match".

Sign-in deliberately does **not** enforce the minimum: accounts created under
the old 6-character rule must still be able to sign in. Only signup and reset do.

> ⚠️ The client is not the enforcement point. Supabase's own minimum lives in
> **Authentication → Policies → Minimum password length** and must be set to 8
> to match. Without it the API still accepts a 6-character password.

## Google sign-in

`signInWithGoogle` (`Shared/src/hooks/useAuth.tsx`) is a plain
`supabase.auth.signInWithOAuth` with `prompt: select_account` — without that,
Google silently reuses the only signed-in account and nobody on a shared device
can pick a different one.

**supabase-js builds the `/authorize` URL locally and navigates to it — it does
not fetch it.** So a provider that is enabled but misconfigured cannot surface
as an `error` in JS. The browser leaves the app and GoTrue answers with a raw
JSON body instead:

```json
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: missing OAuth secret"}
```

That means exactly one thing: **the Google provider has no client secret saved.**
No code change fixes it. Configure it:

1. **Google Cloud Console → APIs & Services → Credentials → Create OAuth client
   ID → Web application.**
2. **Authorized JavaScript origins:** `http://localhost:8080` and the production
   origin.
3. **Authorized redirect URI:** Supabase's callback, *not* the app's —
   `https://<project-ref>.supabase.co/auth/v1/callback`.
4. **OAuth consent screen** must be configured (external, app name, support
   email) or Google blocks the request before the account picker.
5. **Supabase → Authentication → Providers → Google:** enable, paste the Client
   ID **and** Client Secret, save.
6. **Supabase → Authentication → URL Configuration:** Site URL = production
   origin. The Redirect URLs allowlist must include `http://localhost:8080/auth*`
   and `https://<prod-domain>/auth*` — otherwise the callback lands on Site URL
   and silently drops `?next=`.

### Callback failures

When a round trip fails, Supabase redirects back carrying `error`, `error_code`
and `error_description` — on the **query string** for the PKCE flow, on the
**hash fragment** for the implicit one. `Frontend/src/lib/authCallbackError.ts`
reads both, maps the code through `mapAuthError`, shows it once, then scrubs the
params via `history.replaceState` so a refresh doesn't resurrect a stale alert.

Checking only `useSearchParams()` is the trap: supabase-js consumes the hash on
*success* but leaves failures behind, so a hash-borne error would render a blank
sign-in form with no explanation.

`error_description` is prose from GoTrue and is never rendered — it is passed to
`mapAuthError` purely as a matching hint.

## Two-factor

See the TOTP notes in `CLAUDE.md`. `challengeRequired` (a session at `aal1` while
a *verified* factor exists) is the load-bearing flag; `/auth` renders
`MfaChallenge` ahead of every other state, because a first-factor session already
holds a usable JWT and a skippable second factor is a decorative one.

Guards are UX only — **the database is the real boundary.**
