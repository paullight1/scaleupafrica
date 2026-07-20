# 02 — Auth flow overhaul + auth-aware AppHeader/AppFooter + route guards

> Source of truth: `docs/plans/00-FOUNDATION.md` (tokens, primitives, anti-slop rules, conventions).
> Fixes: IMPROVEMENTS §1.2 (no sign-out / no authed nav), §2.4 (invisible mobile Sign in), §2.5
> (auth gaps: false signup toast, no forgot-password, raw Supabase errors), §4 returning-user, and
> table items #2, #3 (partial: ScrollToTop + hash scroll), #9, #14 (footer legal links).

---

## 1. Goal

A complete, honest auth system — sign-in, sign-up, sign-out, forgot/reset password, email-confirm
branch, Google OAuth — with plain-language errors, plus a persistent auth-aware `<AppHeader>` and
`<AppFooter>` on every non-admin route, `<RequireAuth>` guards with `?next=` round-tripping, and
route-change scroll/focus management. Styled to the HubSpot navy/orange theme from plan `01`.

## 2. Scope

**In:**
- New routes: `/auth/forgot`, `/auth/reset`. Reworked `/auth` (modes via `?mode=signup`).
- `useAuth` expansion (single auth API surface for the app).
- `src/lib/authErrors.ts` (Supabase error → friendly copy) + `src/lib/routes.ts` (`sanitizeNext`,
  route constants).
- `<AppHeader>`, `<UserMenu>`, `<AppFooter>`, `<SiteLayout>`, `<RequireAuth>`, `<ScrollToTop>`,
  `<SkipLink>` under `src/components/common/`.
- `App.tsx` restructure into layout routes; retire `src/components/landing/Header.tsx` +
  `Footer.tsx`.
- Auth pages restyle (navy panel / orange CTA / illustration), a11y, loading/error states.
- Removal of per-page ad-hoc auth redirects (`CreateProfile.tsx:58`, `Funding.tsx:83`).

**Out (other plans):**
- `/dashboard` page itself → plan `03` (we add the guard + constants it will mount under).
- `/directory/:slug` public profile (the "My profile" menu target long-term) → plan `04`.
- Theme tokens, button variants, `EmptyState/LoadingState/ErrorState/SEO` primitives → plan `01`.
- Real Privacy/Terms/Contact *content* → plan `08` (footer links point at existing routes).
- Removing duplicate `Toaster`+`Sonner` mount, `React.lazy` splitting → plan `01`.

## 3. Dependencies

- **Plan `01` (design system)** must land first or in parallel: navy/orange tokens, retirement of
  `variant="gold"` / `text-gold` / `font-serif` (Playfair) — this plan writes all new UI against
  the FOUNDATION §1 tokens (`bg-navy`, `text-ink-strong`, primary = orange, focus ring orange) and
  consumes `<LoadingState>`, `<SEO>`, `<Illustration>` from `01`. If `01` is not merged yet,
  implement against the token *names* anyway (they are the canonical contract) and stub `<SEO>` as
  a `document.title` effect.
- **Supabase dashboard config (manual, not code):** add `${SITE_URL}/auth/reset` and
  `${SITE_URL}/auth` to Auth → URL Configuration → Redirect URLs. Note whether "Confirm email" is
  ON — code below handles both branches regardless.
- Consumed by plans `03`–`06`: `<RequireAuth>`, `DEFAULT_AUTHED_ROUTE`, `<AppHeader>` slots.

---

## 4. File-by-file changes

### 4.1 `src/lib/routes.ts` — NEW

Single home for route constants + the `next` param contract.

```ts
export const DEFAULT_AUTHED_ROUTE = "/dashboard";       // plan 03 target; see §7
export const POST_SIGNUP_ROUTE = "/dashboard";           // same until onboarding exists
export const AUTH_ROUTE = "/auth";

/** Only allow same-origin path redirects. Rejects absolute URLs, protocol-relative
 *  ("//evil.com"), and anything not starting with a single "/". Returns fallback otherwise. */
export function sanitizeNext(raw: string | null, fallback = DEFAULT_AUTHED_ROUTE): string;

/** Build "/auth?next=..." preserving the current location (pathname + search). */
export function authPathWithNext(location: { pathname: string; search: string }): string;
```

Every place that currently hand-builds `/auth?next=...` (`Directory.tsx:77,97`,
`AdminGuard.tsx:39`, landing CTAs) migrates to `authPathWithNext` / constants over this and later
plans; this plan updates the ones it touches.

### 4.2 `src/lib/authErrors.ts` — NEW

Plain-language mapping (IMPROVEMENTS §2.5 "raw Supabase error strings"). Match on
`AuthError.code` first (supabase-js v2 exposes `error.code`), fall back to message substring,
then to a generic fallback. Export:

```ts
export function mapAuthError(err: unknown): { title: string; message: string };
```

Required mappings (exact copy, brand voice: direct, never hypey):

| Supabase code / signal | Friendly copy |
|---|---|
| `invalid_credentials` | "Email or password is incorrect. Check both and try again — or reset your password below." |
| `email_not_confirmed` | "Your email isn't confirmed yet. Check your inbox (and spam) for our confirmation link." |
| `user_already_exists` / signup returns `identities: []` | "An account with this email already exists. Sign in instead — or reset your password if you've forgotten it." |
| `weak_password` | "Please choose a longer password (at least 6 characters)." |
| `over_email_send_rate_limit` / `over_request_rate_limit` | "Too many attempts. Wait a minute, then try again." |
| `same_password` (on reset) | "New password must be different from your current one." |
| network / `TypeError: Failed to fetch` | "Can't reach the server. Check your connection and try again." |
| anything else | "Something went wrong on our side. Please try again." (never show raw message) |

### 4.3 `src/hooks/useAuth.tsx` — MODIFY (expand, FOUNDATION §4 "see 02 for expansions")

Keep provider/subscription logic as-is. Expand the context value so components never import
`supabase`/`lovable` directly for auth (mockable in tests):

```ts
type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<{ error: AuthError | null }>;
  /** Returns confirmationRequired=true when signUp yields user but no session. */
  signUp(email: string, password: string, opts?: { emailRedirectTo?: string }):
    Promise<{ error: AuthError | null; confirmationRequired: boolean }>;
  signInWithGoogle(next: string): Promise<{ error: Error | null }>; // wraps lovable.auth.signInWithOAuth
  resetPassword(email: string): Promise<{ error: AuthError | null }>; // resetPasswordForEmail → redirectTo `${origin}/auth/reset`
  updatePassword(newPassword: string): Promise<{ error: AuthError | null }>; // supabase.auth.updateUser
  signOut(): Promise<void>;
};
```

Implementation notes:
- `signUp` passes `emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}``
  (the confirmation link lands the user back on `/auth`, whose existing already-authed effect
  forwards them to `next`). Detect duplicate account: `data.user?.identities?.length === 0`
  → return `{ error: synthetic user_already_exists }`.
- `signUp` result: `confirmationRequired = !!data.user && !data.session`.
- `signInWithGoogle(next)` calls
  `lovable.auth.signInWithOAuth("google", { redirect_uri: `${origin}/auth?next=${encodeURIComponent(next)}` })`
  — do NOT touch `src/integrations/lovable/index.ts` (generated, FOUNDATION §4).
- `signOut` stays; callers handle navigation (see UserMenu).
- Do not remove any existing field — `AdminLayout.tsx:110` keeps working unchanged.

### 4.4 `src/pages/Auth.tsx` — MODIFY (rewrite in place, route stays `/auth`)

**Behavioral changes:**
- Mode from URL: `?mode=signup` → signup, else signin (so "Get started" CTAs can deep-link
  `/auth?mode=signup&next=...`; the in-page toggle updates the param via `setSearchParams`,
  keeping `next`).
- `next` handling: `const next = sanitizeNext(params.get("next"))` — defaults to
  `DEFAULT_AUTHED_ROUTE`, fixes the open-redirect hole and the current hardcoded
  `/directory/create` default.
- **Sign-in:** `signIn(...)`; on success rely on the existing `user && !loading → navigate(next)`
  effect (keep it). Success toast "Welcome back." only on true success.
- **Sign-up:** `signUp(...)`. If `confirmationRequired` → **do not toast success, do not
  navigate**. Swap the card body to a "Check your inbox" state (fixes IMPROVEMENTS §2.5 false
  toast): mail illustration, heading "Confirm your email", body "We sent a confirmation link to
  {email}. Open it on this device to finish signing up.", secondary actions: "Resend email"
  (`supabase.auth.resend({ type: "signup", email })` via a `resendConfirmation` helper — add to
  `useAuth` alongside §4.3) with a 60s cooldown, and "Use a different email" (back to form). If a
  session IS returned (confirmation off) → toast "Account created." and let the redirect effect
  run.
- **Errors:** replace `toast.error(err.message)` with `mapAuthError`. Render inline in the card —
  a `role="alert"` box (destructive tokens) inside an always-mounted `aria-live="polite"`
  container above the submit button. Field-level zod errors render under each input
  (`aria-describedby` on the input, `aria-invalid` when errored) — not toasts.
- **Google:** `signInWithGoogle(next)`; on error show mapped inline error, clear busy.
- Link row: "Forgot password?" → `/auth/forgot` (preserve `?next=`), placed under the password
  field, right-aligned, `text-sm`.

**Visual restyle (HubSpot theme, FOUNDATION §1):**
- Full-height two-panel split under the SiteLayout header: left panel `lg:w-1/2` navy
  (`bg-navy-dark` with the single allowed navy hero gradient), containing the wordmark, one
  trust-forward sentence ("One credible profile. Real funding leads. No hype."), and an
  `<Illustration name="auth" />` (new SVG, see §4.11) — hidden below `lg` (mobile shows form
  only, 3G-friendly). Right panel: white, centered `max-w-md` form.
- Typography: heading `font-display` (Sora) `text-3xl font-semibold text-ink-strong`. No
  `font-serif`, no `text-gold`, no gradient text.
- CTA: default (orange) button variant, `w-full`, `rounded-lg`. Busy state: `disabled`,
  `aria-busy="true"`, inline `Loader2` spinner + "Signing in…" / "Creating account…". Google
  button: `variant="outline"` on white (visible here — the invisible-outline bug is a dark-bg
  problem, §4.7).
- Inputs ≥44px tall, visible labels (keep `<Label>`), `autoComplete` kept as today.
- `<SEO title="Sign in — ScaleUp Africa" />` (from plan 01/08; stub with `document.title` effect
  if not yet available).

### 4.5 `src/pages/ForgotPassword.tsx` — NEW (route `/auth/forgot`)

Same split-panel shell as Auth (extract the shell into a local `AuthShell` component inside
`src/pages/Auth.tsx`? No — make it shared: `src/components/common/AuthShell.tsx`, props
`{ children }`, used by all three auth pages).

- Single email field + "Send reset link" (orange, busy state as above).
- Calls `resetPassword(email)` → `supabase.auth.resetPasswordForEmail(email, { redirectTo:
  `${origin}/auth/reset` })`.
- **Always show the sent state on success or `user_not_found`-style errors** (don't leak account
  existence): "If an account exists for {email}, we've sent a password-reset link. Check your
  inbox and spam." Genuine failures (rate limit, network) show mapped inline error.
- Links: "Back to sign in" → `/auth` (preserve `next`).

### 4.6 `src/pages/ResetPassword.tsx` — NEW (route `/auth/reset`)

Landing page for the email link. Supabase redirects here with a recovery token in the URL hash;
the client consumes it and fires `PASSWORD_RECOVERY` / establishes a session.

- On mount, subscribe to `supabase.auth.onAuthStateChange` for `PASSWORD_RECOVERY` AND check
  `getSession()` (event may fire before mount). Three states:
  1. **Verifying** — brief `<LoadingState>` while waiting (≤3s).
  2. **Form** — session present: "New password" + "Confirm new password" fields (zod: min 6, max
     72, both match — named messages), submit → `updatePassword(newPassword)`; on success toast
     "Password updated." and `navigate(DEFAULT_AUTHED_ROUTE, { replace: true })`.
  3. **Invalid/expired** — no session after wait, or `error_description` in URL (Supabase appends
     `#error=access_denied&error_code=otp_expired…`): show "This reset link is invalid or has
     expired. Request a new one." + button → `/auth/forgot`. Parse the hash for `error_code` on
     mount and short-circuit to this state.
- Same `AuthShell`, same inline error pattern (`mapAuthError`, `aria-live`).
- **Important:** this route must NOT be wrapped in `<RequireAuth>` (the recovery session is being
  established on arrival) and the "already-signed-in → redirect" effect used on `/auth` must NOT
  run here (a recovery session would instantly bounce the user away before they set a password).

### 4.7 `src/components/common/AppHeader.tsx` — NEW (replaces `landing/Header.tsx` everywhere)

One persistent, auth-aware header on **every non-admin route** (marketing, auth, app, dashboard).

**Props:** none needed for v1 (reads `useAuth()` + `useRole()` itself). Keep it self-contained;
pages never pass auth state in.

**Structure & look (FOUNDATION §1 tokens — solid, not transparent):**
- `<header className="sticky top-0 z-50 bg-navy border-b border-white/10">` — solid navy always
  (no scroll-transparency logic; delete the `isScrolled` listener). White wordmark
  `font-display font-bold` "ScaleUp Africa" + orange dot (`text-primary`). Height 64px
  (`h-16`), container `max-w-7xl px-4 sm:px-6 lg:px-8`.
- Desktop nav (`hidden lg:flex`): Directory, Funding, Resources, Blog, Pricing — **all
  `<Link>`** (fixes full-reload `<a href>` bug, IMPROVEMENTS §8). Pricing → `/#pricing` handled
  by the hash-scroll logic in `<ScrollToTop>` (§4.10). Link style: `text-sm font-medium
  text-white/80 hover:text-white` (≥4.5:1 on navy; never `hover:text-gold`).
- **Logged-out right side:** "Sign in" → ghost-on-dark (`text-white hover:bg-white/10`) linking
  `authPathWithNext(location)`; "Get started" → orange default variant linking
  `/auth?mode=signup&next=/directory/create`. Use `<Button asChild><Link…/></Button>` (no
  `<Link><Button>` nesting — IMPROVEMENTS §6).
- **Logged-in right side:** `<UserMenu />` (§4.8) — and the primary CTA swaps to "My dashboard"
  (orange, → `/dashboard`) per IMPROVEMENTS §4 returning-user ("design for the 100th visit").
  While `useAuth().loading`, render a neutral 32px skeleton circle instead of flashing
  Sign in → avatar.
- Staff (`useRole().isStaff`): "Admin" ghost link with `ShieldCheck` icon, desktop + drawer,
  as today.
- **Mobile drawer (fixes IMPROVEMENTS §2.4 invisible outline-on-dark):** keep the
  slide-down panel, `bg-navy-dark border-t border-white/10`. Auth buttons at bottom:
  - Sign in: `variant="secondary"` styled explicitly for dark — `className="w-full bg-white/10
    text-white border border-white/25 hover:bg-white/20"` — **never bare `variant="outline"`
    on a dark surface**.
  - Get started: orange default, `w-full`.
  - Logged-in drawer: replace both with links "My dashboard", "My profile", "Funding", divider,
    "Sign out" (destructive-tinted text) — same items as UserMenu, as list rows ≥44px tall.
- A11y: toggle button gets `aria-label="Open menu"/"Close menu"`, `aria-expanded`,
  `aria-controls="mobile-nav"`; drawer nav `id="mobile-nav"`; Esc closes; close on route change
  (`useEffect` on `location.pathname`). Wrap drawer motion in reduced-motion-safe animation
  (root `MotionConfig reducedMotion="user"` comes from plan 01; don't add per-component hacks).

### 4.8 `src/components/common/UserMenu.tsx` — NEW

Avatar dropdown (shadcn `dropdown-menu` + `avatar`, already in `src/components/ui/`).

**Props:** none — reads `useAuth()`, `useRole()`.

- Trigger: 32px `<Avatar>`; image from `user.user_metadata.avatar_url ?? user.user_metadata.picture`
  (Google), fallback initials from `user_metadata.full_name` or the email local-part first two
  letters, `bg-primary text-primary-foreground`. Trigger `aria-label="Account menu"`.
- Content (align end, `z-50`): label row with full name/email (truncated, `text-muted-foreground`);
  separator; items:
  1. "My dashboard" → `/dashboard`
  2. "My profile" → `/directory/create` (until plan 04 ships `/directory/:slug`; leave a
     `// TODO(plan-04)` to retarget)
  3. "Funding" → `/funding`
  4. (staff only) "Admin panel" → `/admin`
  5. separator; "Sign out" — calls `signOut()` then `navigate("/")` + toast "Signed out." Wrap in
     try/catch; on failure toast mapped error. This is the missing global sign-out
     (IMPROVEMENTS §1.2, P0 — shared-device safety).
- All items `asChild` `<Link>`; keyboard operable for free via Radix.

### 4.9 `src/components/common/AppFooter.tsx` — NEW (replaces `landing/Footer.tsx`)

- `bg-navy-dark text-white/80`, `border-t border-white/10`. No framer-motion, no gradient text,
  no "Ready to Scale With Intent?" CTA block (the newsletter CTA belongs to the landing page
  body, not the global footer — plan 01/08 decides its landing placement; keep
  `<NewsletterSignup source="footer" />` as a slim single-row block inside the footer for now to
  avoid losing the capture point).
- Columns (reuse the existing `footerNav` data, updated): Product (Directory, Funding, List your
  business, Pricing `/#pricing`), Resources (Resource Library, Blog), Company (About, Contact),
  **Legal (Privacy Policy → `/privacy`, Terms of Service → `/terms`)** — all real `<Link>`s to
  existing routes (kills IMPROVEMENTS #14 dead `href="#"` pattern permanently).
- Bottom bar: "© {year} ScaleUp Africa" at `text-white/70` minimum (≥4.5:1 — not `/40`,
  IMPROVEMENTS §2.3). Links ≥44px touch targets (`py-2.5 inline-block`).
- Props: none.

### 4.10 `src/components/common/SiteLayout.tsx`, `ScrollToTop.tsx`, `SkipLink.tsx`, `RequireAuth.tsx` — NEW

**`SiteLayout.tsx`** — layout route element:

```tsx
<SkipLink />                 {/* "Skip to content" → #main */}
<AppHeader />
<main id="main" tabIndex={-1} className="min-h-[60vh]"> <Outlet /> </main>
<AppFooter />
```

**`ScrollToTop.tsx`** (mounted once inside `BrowserRouter`, outside Routes):
- On `pathname` change: `window.scrollTo(0, 0)` (instant; respect reduced motion by never using
  smooth), then move focus to `#main` (`preventScroll: true`) so SR/keyboard users start at
  content (IMPROVEMENTS §6 focus management).
- On `hash` present (e.g. `/#pricing` from any page): after paint (`requestAnimationFrame` ×2 or
  a short retry loop for lazy content), `document.getElementById(hash)?.scrollIntoView()` —
  fixes IMPROVEMENTS #3 (cross-page hash anchors never scroll). Requires the landing Pricing
  section to have `id="pricing"` (verify; add if missing).
- Skip both behaviors on hash-only changes within the same pathname.

**`SkipLink.tsx`** — visually-hidden-until-focus anchor, orange focus ring, first tabbable node.

**`RequireAuth.tsx`** — guard for authed areas:

```tsx
const { user, loading } = useAuth();
const location = useLocation();
if (loading) return <LoadingState variant="page" />;   // plan 01 primitive; never flash a redirect
if (!user) return <Navigate to={authPathWithNext(location)} replace />;
return <Outlet />;                                      // used as a layout route
```

No role logic here — `AdminGuard` keeps owning `/admin`. Round trip: guard redirects to
`/auth?next=%2Ffunding` → Auth navigates to sanitized `next` after session appears (works for
password, Google-OAuth-return, and email-confirmation-link arrivals identically, since all land
on `/auth?next=…` with a session).

### 4.11 `src/components/illustrations/AuthIllustration.tsx` — NEW

Inline SVG per FOUNDATION §3 (license-safe, authored, `currentColor`/token-recolored): simple
geometric scene (shield/handshake/storefront motif) in navy lines + orange accents, `aria-hidden`,
≤6KB. Exposed via plan 01's `<Illustration>` wrapper if available, else imported directly by
`AuthShell`.

### 4.12 `src/App.tsx` — MODIFY

Restructure to layout routes; add new routes:

```tsx
<BrowserRouter>
  <AuthProvider>
    <ScrollToTop />
    <Routes>
      {/* Global chrome on every non-admin route */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/forgot" element={<ForgotPassword />} />
        <Route path="/auth/reset" element={<ResetPassword />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/funding" element={<Funding />} />
        <Route path="/resources" … /> <Route path="/resources/:slug" … />
        <Route path="/blog" … /> <Route path="/blog/:slug" … />
        <Route path="/about" … /> <Route path="/contact" … />
        <Route path="/privacy" … /> <Route path="/terms" … />

        {/* Authed area */}
        <Route element={<RequireAuth />}>
          <Route path="/directory/create" element={<CreateProfile />} />
          {/* plan 03 mounts: <Route path="/dashboard" element={<Dashboard />} /> */}
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin keeps its own chrome — unchanged */}
      <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}> … </Route>
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

Decisions encoded above:
- `/funding` stays **public** under SiteLayout (it renders sample data + paywall to visitors —
  its current self-redirect at `Funding.tsx:83` is REMOVED in §4.13; plan `05/06` owns the
  member experience). `/directory/create` moves under `RequireAuth`.
- `/auth*` routes sit inside SiteLayout so the header is on literally every route ("Sign in"
  page shows the logged-out header; harmless and consistent).
- `/dashboard` route itself is plan 03's; the `RequireAuth` block and `DEFAULT_AUTHED_ROUTE`
  are ready for it. **Until plan 03 merges**, `DEFAULT_AUTHED_ROUTE` temporarily equals
  `/directory/create` (one-line flip in `src/lib/routes.ts`; leave `// TODO(plan-03)`; UserMenu
  hides "My dashboard" while the constant ≠ `/dashboard`).

### 4.13 Page cleanups — MODIFY

- `src/pages/Index.tsx` — remove `Header`/`Footer` imports + JSX (SiteLayout provides them).
  Landing hero: ensure top padding works under a **sticky solid** header instead of the old
  fixed transparent one (hero starts below `h-16`, not underneath it) — coordinate with plan
  01's hero rework; minimal `pt` fix here.
- `src/pages/Directory.tsx`, `src/pages/Funding.tsx`, `src/pages/CreateProfile.tsx` — delete the
  "Back home"/"Back to directory" pseudo-nav links (`Directory.tsx:58-59`, `Funding.tsx:177-178`,
  `CreateProfile.tsx:116`) and the ad-hoc auth redirects (`CreateProfile.tsx:58`,
  `Funding.tsx:83`) — guard + header replace them. Update `Directory.tsx:77,97` CTAs to use
  `authPathWithNext`/constants. **No other changes** to these pages (plans 04/05 own them).
- `src/components/landing/Header.tsx`, `src/components/landing/Footer.tsx` — DELETE after Index
  is migrated (grep confirms Index.tsx is the only consumer).
- `src/components/admin/AdminGuard.tsx:39` — switch its hand-built redirect to
  `authPathWithNext(location)` (keeps `search` too). One-line change, no behavior regression.

---

## 5. The `next` contract (single source of truth)

1. Any guard/CTA sends users to `/auth?next=<encoded pathname+search>[&mode=signup]`.
2. `/auth` reads `next` via `sanitizeNext` (internal single-`/` paths only; fallback
   `DEFAULT_AUTHED_ROUTE`).
3. All three entry mechanisms converge on "session appears while on `/auth`" → `navigate(next,
   { replace: true })`: password sign-in (state change), Google OAuth (`redirect_uri` returns to
   `/auth?next=…`), email-confirmation link (`emailRedirectTo` returns to `/auth?next=…`).
4. `/auth/reset` is exempt from the auto-forward effect (§4.6).
5. Returning logged-in user hitting `/auth` directly (no `next`) → `DEFAULT_AUTHED_ROUTE`.
6. Returning logged-in user landing on `/` → stays on `/`, sees the logged-in header
   ("My dashboard" CTA + avatar) — no forced redirect (marketing page stays reachable).

## 6. Test plan (Vitest + Testing Library, `src/**/*.test.tsx?`)

Mock `useAuth` context / supabase module per FOUNDATION testing conventions.

1. `src/lib/routes.test.ts` — `sanitizeNext`: accepts `/funding?x=1`; rejects
   `https://evil.com`, `//evil.com`, `javascript:…`, empty → fallback. `authPathWithNext`
   encodes pathname+search.
2. `src/lib/authErrors.test.ts` — each code in §4.2 maps to its copy; unknown error → generic;
   raw Supabase message never leaks through.
3. `src/pages/Auth.test.tsx` —
   a. signup with `session=null` renders "Confirm your email" (and does NOT render/success-toast
      "You're signed in") — the §2.5 regression test;
   b. signup with session → navigates to `next`;
   c. sign-in error `invalid_credentials` → friendly copy inside `role="alert"`;
   d. duplicate signup (`identities: []`) → "already exists" copy;
   e. `?mode=signup` opens signup mode; toggle preserves `next`.
4. `src/components/common/RequireAuth.test.tsx` — unauthenticated render at `/directory/create`
   redirects to `/auth?next=%2Fdirectory%2Fcreate`; `loading` renders LoadingState (no
   redirect); authed renders outlet.
5. `src/pages/ResetPassword.test.tsx` — session present → form; `#error_code=otp_expired` →
   expired state; successful update navigates to `DEFAULT_AUTHED_ROUTE`.
6. `src/components/common/AppHeader.test.tsx` — logged-out: "Sign in"/"Get started" links with
   correct `next`; logged-in: avatar menu present, "Sign in" absent; Sign out calls `signOut`
   and navigates home. Mobile toggle has `aria-expanded`.
7. Manual QA checklist: full password-reset email round trip against the dev Supabase project;
   Google OAuth round trip lands on `next`; mobile drawer Sign in **visible** on navy
   (contrast-check ≥4.5:1); keyboard-only pass (skip link → nav → menu → Esc); iOS Safari +
   low-end Android Chrome drawer behavior.

## 7. Acceptance criteria

- [ ] A signed-in user can sign out from every non-admin route (desktop menu + mobile drawer).
- [ ] Header on every route (marketing, auth, app) reflects auth state within one render after
      `loading` resolves; no logged-out flash for logged-in users (skeleton instead).
- [ ] Mobile drawer "Sign in" is plainly visible on the navy drawer (AA contrast) — §2.4 dead.
- [ ] Signup with email-confirmation ON shows "Confirm your email" + resend; **no** "you're
      signed in" toast — §2.5 dead.
- [ ] `/auth/forgot` sends a reset email; the emailed link lands on `/auth/reset`, sets a new
      password, and signs the user in; expired links show a recoverable state.
- [ ] No raw Supabase error string is ever rendered; all §4.2 cases show mapped copy inline with
      `aria-live`.
- [ ] `/directory/create` unauthenticated → `/auth?next=…` → after any auth method, user returns
      to `/directory/create`. No open redirect via `next`.
- [ ] Cross-page `/#pricing` scrolls to pricing; every route change scrolls to top and moves
      focus to `#main`; skip link works.
- [ ] Footer legal links (Privacy, Terms, Contact) navigate to real routes.
- [ ] Zero remaining references to `landing/Header`, `landing/Footer`, `variant="gold"`,
      `text-gold`, `font-serif` within files this plan touches.
- [ ] `npm run build`, `npm run lint`, `npm test` green.

## 8. Ordered implementation checklist

1. Create `src/lib/routes.ts` + tests (no UI deps — safe first).
2. Create `src/lib/authErrors.ts` + tests.
3. Expand `src/hooks/useAuth.tsx` (§4.3) — keep old surface intact; verify AdminLayout compiles.
4. Create `SkipLink`, `ScrollToTop`, `RequireAuth`, `SiteLayout` in `src/components/common/`.
5. Create `AppHeader` + `UserMenu` + `AppFooter` (§4.7–4.9) with the dark-drawer button fix.
6. Restructure `src/App.tsx` into layout routes (§4.12); add `/auth/forgot`, `/auth/reset`.
7. Page cleanups (§4.13): Index, Directory, Funding, CreateProfile, AdminGuard; delete
   `landing/Header.tsx` + `landing/Footer.tsx`.
8. Create `AuthShell` + `AuthIllustration`; rewrite `src/pages/Auth.tsx` (§4.4) with confirm
   branch, inline errors, restyle.
9. Create `ForgotPassword.tsx` (§4.5) and `ResetPassword.tsx` (§4.6).
10. Add remaining tests (§6 items 3–6); run full suite + lint + build.
11. Manual QA round trips (reset email, OAuth, mobile drawer, keyboard) + Supabase redirect-URL
    config note in PR description.
