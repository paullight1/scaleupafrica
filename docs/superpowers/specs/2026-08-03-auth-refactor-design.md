# Auth refactor + three-step signup

**Date:** 2026-08-03
**Status:** implemented

## Problem

Three things at once:

1. **Google sign-in was dead.** Clicking "Continue with Google" left the app and
   showed a raw JSON 400 from GoTrue.
2. **`Auth.tsx` was 521 lines** holding five unrelated screens (sign-in, signup,
   MFA challenge, magic-link-sent, confirm-email) behind early returns.
3. **Signup was one screen with one password box** — no confirmation field, no
   reveal toggle, no strength feedback, and no chance to learn who the user is.

## 1. Google OAuth

**Diagnosis.** `{"code":400,"error_code":"validation_failed","msg":"Unsupported
provider: missing OAuth secret"}` is GoTrue's answer at `/auth/v1/authorize`
when the Google provider row exists without a client secret. The app code was
never at fault.

**Why no client-side guard is possible.** supabase-js builds the authorize URL
locally and navigates to it — it never fetches it — so the 400 is served to the
browser, not returned to JS. A misconfigured provider cannot be detected from
the client. The fix is configuration; the full runbook is in `docs/AUTH.md`.

**What did change in code:**

- `prompt: select_account` on the OAuth call, so a shared device can switch
  accounts.
- `Frontend/src/lib/authCallbackError.ts` — reads `error` / `error_code` /
  `error_description` from **both** the query string (PKCE) and the hash
  fragment (implicit), maps them through `mapAuthError`, and scrubs them from
  the URL afterwards. Previously a failed OAuth return rendered a blank sign-in
  form with no explanation.
- New provider codes in `authErrors.ts`: `access_denied`, `otp_expired`,
  `flow_state_expired`, `bad_oauth_state`, `provider_email_needs_verification`,
  `validation_failed`, `provider_disabled`, `signup_disabled`, `server_error`,
  plus a message fallback for "missing OAuth secret". No raw GoTrue string ever
  reaches the DOM.

## 2. Structure

`/auth` is sign-in (plus the MFA step-up). `/auth/signup` is the wizard.
`/auth?mode=signup` forwards to the latter with `?next=` intact — old marketing
CTAs and already-sent emails still use it.

```
Frontend/src/pages/          Auth.tsx (sign-in), AuthSignUp.tsx (wizard)
Frontend/src/components/auth/ AuthAlert, GoogleButton, StepIndicator,
                              SignInForm, CheckEmailPanel,
                              signup/{StepEmail,StepPassword,StepProfile,useSignUpWizard}
Frontend/src/hooks/          useResendCooldown  (was duplicated, and leaked)
Frontend/src/lib/            authCallbackError
Shared/src/components/auth/  PasswordField, PasswordStrength
Shared/src/lib/              passwordStrength
```

`CheckEmailPanel` collapses two near-identical screens (signup confirmation and
magic-link-sent) into one, which keeps the 60s resend cooldown identical across
both — it used to be copy-pasted.

## 3. The wizard

Email → password + confirm → name + business.

- Nothing is sent to Supabase before step 3: an abandoned wizard creates no
  account and burns none of the per-address email rate limit.
- State is memory-only. No `sessionStorage` — a password should not outlive the
  tab; a refresh restarting signup is the cheaper failure.
- Back preserves every field.
- Step 3 is optional and writes `full_name` / `business_name` to
  `user_metadata`. `DashboardProfileEdit` reads it once as a *default* when the
  user has no profile row. It is user-controlled data, so never a trust
  boundary; the profile schema still validates it. **No migration needed** — the
  `on_auth_user_created` trigger only creates the `subscriptions` row.
- `user_already_exists` renders a "Sign in instead" link carrying `?next=`.

## 4. Passwords

`Shared/src/lib/passwordStrength.ts` owns `MIN_PASSWORD_LENGTH` (8) and
`MAX_PASSWORD_LENGTH` (72). The meter is advisory — no composition rules, since
they push people towards `Passw0rd!` and away from passphrases. It does floor
the obvious failures: under-length, top common passwords, a password built from
the user's own email local part, and a single repeated character.

Sign-in does **not** enforce the minimum — accounts created under the old
6-character rule must still be able to sign in. Signup and reset do.

⚠️ **Deployment step:** Supabase → Authentication → Policies → Minimum password
length must be raised to 8. Until then the client is the only enforcement.

`PasswordField` renders a real `<button aria-pressed>` toggle, not an icon with
an onClick — assistive tech has to be able to tell that the password is
currently visible. Visibility is per-field, so the confirm box reveals
independently, which is the point of having one.

## 5. Testing

- `Shared/src/lib/__tests__/passwordStrength.test.ts` — scoring, including the
  email-substring penalty and length-beats-complexity.
- `Frontend/src/pages/AuthSignUp.test.tsx` — step gating, mismatch, minimum
  length, independent reveal, back-preserves-state, one `signUp` call with the
  right metadata, duplicate-email shortcut.
- `Frontend/src/pages/Auth.test.tsx` — legacy `?mode=signup` forward, callback
  errors from query **and** hash, provider-unavailable copy, URL scrubbing, and
  that sign-in doesn't apply the signup length rule.

287 Frontend tests, 175 Shared, 68 AdminPanel — all passing.
