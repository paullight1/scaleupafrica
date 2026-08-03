# Supabase project migration + auth rollout

Moving Cresciva from Supabase project `dwyglydswegyvjowzdot` to **`zttqskrvbkjdzwrxtzaa`**, and
enabling the two auth features added alongside it (passwordless sign-in, TOTP two-factor).

Nothing in this document has been executed — the app still points at the old project. These are the
steps to run once the Supabase MCP server is authenticated.

---

## 0. Authenticate the MCP server (blocks everything else)

`.mcp.json` already points at the new project. Authenticate in a **regular terminal**, not the IDE
extension:

```sh
claude
/mcp
```

Select **supabase** → **Authenticate**, complete the browser flow, reload the session.

Until this is done the new project's URL and publishable key can't be read, so steps 1–3 can't run.

---

## 1. Repoint the app

Three files carry the project ref. All still hold the **old** values:

| File | Key |
|---|---|
| `Frontend/.env` | `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `AdminPanel/.env` | same three |
| `supabase/config.toml` | `project_id` (line 1) |

`Backend/.env` needs `SUPABASE_URL` and `SUPABASE_JWT_SECRET` (or JWKS via the URL) repointed too —
see `Backend/.env.example`.

The client (`Shared/src/integrations/supabase/client.ts`) already handles both legacy JWT `anon`
keys and the newer opaque `sb_publishable_*` keys, so either key format works.

## 2. Apply the migrations

Nine files in `supabase/migrations/`, applied in filename order. The newest is
`20260727120000_admin_set_role_rpc.sql` (see §5).

## 3. Regenerate types

`Shared/src/integrations/supabase/types.ts` is generated. It was hand-edited to add the
`admin_set_role` signature so the build wasn't blocked — regenerate it against the new project and
confirm `admin_set_role` survives.

---

## ⚠️ What does not transfer

**`auth.users` rows do not migrate with the schema.** Every existing account is left behind, and
every `user_id` foreign key (`profiles`, `subscriptions`, `user_roles`, `resources.author_id`,
`admin_audit_log`) points at users that won't exist in the new project. Either:

- accept the reset (fine if the old project holds only test data), **or**
- export `auth.users` from the old project and import before applying data-bearing migrations, so
  the UUIDs are preserved.

Decide this **before** step 2 — it is far cheaper than reconciling afterwards.

Also does not transfer:

- **Google OAuth** — re-enter client ID/secret under Authentication → Providers, and add the new
  project's callback to the Google Cloud console's authorised redirect URIs.
- **Redirect URLs** — Authentication → URL Configuration must list the site origin plus
  `/auth`, `/auth/reset`.
- **Storage buckets** — `profile-media`, `content-media`, `resource-files` and their objects.
- **Edge function secrets** — `LOVABLE_API_KEY`, the Paystack keys.
- **The seeded admin.** `20260720120000` line ~57 grants `admin` to `nwosupaul3@gmail.com` via
  `SELECT ... FROM auth.users WHERE email = ...`. On an empty project that matches nothing and is a
  silent no-op. **Sign up with that address first, then re-run the INSERT**, or there will be no
  admin and no way to create one from the UI.

---

## 4. Dashboard settings for the new auth features

### Passwordless (magic link + OTP code)

Authentication → Providers → Email. `signInWithOtp` runs with `shouldCreateUser: false`, so it only
signs in accounts that already exist.

The **Magic Link** email template drives which of the two paths works:

- `{{ .ConfirmationURL }}` → magic link (Supabase default)
- `{{ .Token }}` → 6-digit code

`/auth` implements **both**, but the code entry box is dead until the template includes
`{{ .Token }}`. Add it to the template unless you only want the link path.

Defaults worth knowing: one send per address per 60s (the UI's resend cooldown matches), and links
and codes expire after 1 hour (Email OTP expiration).

### Two-factor (TOTP)

TOTP is enabled on all projects by default — no dashboard change needed. Confirm the project's MFA
factor cap suits you; `useMfa.enroll()` sweeps abandoned `unverified` factors before creating a new
one so retries don't hit it.

---

## 5. Included fix: role assignment was broken

`20260720120000_admin_panel_foundation.sql` line 53 grants only `SELECT` on `user_roles` to
`authenticated`, but `AdminPanel/src/hooks/queries/adminUsers.ts` wrote to the table directly from
the browser client. Postgres checks table GRANTs **before** RLS, so the `"Admins manage roles"`
`FOR ALL` policy never got a chance to fire — every admin got
`42501 permission denied for table user_roles`. Role management could not work at all.

`20260727120000_admin_set_role_rpc.sql` adds `admin_set_role(_user_id, _role, _add)`:

- `SECURITY DEFINER`, so it re-checks `is_admin(auth.uid())` in the function body — a
  `SECURITY DEFINER` function bypasses RLS, so it must do its own authorization.
- `EXECUTE` revoked from `PUBLIC` and `anon` (Postgres grants to `PUBLIC` by default, which would
  otherwise make it callable anonymously).
- Requires `aal2` from admins **who have enrolled MFA** — conditional on enrolment, so admins
  without a factor are never locked out.
- Refuses to let an admin remove their own `admin` role.

The client keeps `SELECT`-only on the table.

---

## 6. Verify after cutover

```sh
npm test    # 289 passing at time of writing
npm run build
```

Then by hand, against the new project:

1. Sign up → confirm email → land on `/dashboard`.
2. Sign in with Google.
3. "Email me a sign-in link instead" → both the link and (if `{{ .Token }}` is in the template) the
   code.
4. `/dashboard/billing` → set up two-factor → scan → verify → card reads "On".
5. Sign out, sign in again → the TOTP challenge appears and `/dashboard` is unreachable until it
   passes.
6. As an admin in the panel, grant and revoke a role — this exercises the new RPC and is the step
   that was previously failing.

---

## Known unrelated breakage

`Frontend/src/lib/api/types.ts:6` imports `../../../shared/contracts`, but the directory is
`Shared/contracts` (capital S). This produces 10 `tsc` errors under
`Frontend/tsconfig.app.json` and predates this work. It does not block Vite (tests and builds pass)
but it should be fixed — it will break any case-sensitive filesystem, i.e. most CI runners.
