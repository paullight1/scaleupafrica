# 03 — User Dashboard (`/dashboard`, net-new flagship)

> Consumes: `docs/plans/00-FOUNDATION.md` (tokens, primitives §2, anti-slop §1.4, conventions §4).
> Basis: `PRODUCT.md`, `IMPROVEMENTS.md` §4 (post-publish payoff, returning-user, share loop),
> `IMPROVEMENTS.md` §10 Q4 ("who is the home page for — the 1st visit or the 100th?").

## Goal

A logged-in founder home at `/dashboard` that answers, on every visit: *"what funding is new for
me, how is my storefront doing, and what should I do next?"* Four pillars:

- **A. Funding feed home** (`/dashboard`, index) — matched + saved + new-this-week opportunities,
  subscription status. The reason to return.
- **B. Profile hub** (`/dashboard/profile`) — completeness %, edit/preview, shareable public link,
  directory visibility.
- **C. Account & billing** (`/dashboard/account`) — subscription state, upgrade/pay (plan 06),
  password/security, sign-out, notification prefs.
- **D. Activity & guidance** (`/dashboard/activity`) — onboarding checklist, profile views,
  next-best-actions.

## Scope

**In:** dashboard routes/layout/nav, all four pillar pages and their widgets, TanStack Query data
layer (`src/hooks/queries/*` + `src/lib/api/*`), profile-completeness + opportunity-matching +
next-best-action pure logic, one minimal migration (`saved_opportunities`, `user_preferences`,
`increment_profile_views` RPC), returning-user redirect from `/`, post-publish redirect from
CreateProfile, tests.

**Out (owned elsewhere, consumed here through defined seams):** theme tokens + common primitives
(plan 01), `<RequireAuth>` guard + auth-aware `<AppHeader>` (plan 02), `/directory/:slug` public
page + `slug` column + OG tags (plan 04), Funding page overhaul + cached AI results (plan 05),
Paystack checkout/webhook + real billing mutations (plan 06), NestJS API endpoints (plan 07),
`<SEO>` meta helper (plan 08). Admin panel untouched.

---

## 1. Routes, layout, navigation

### 1.1 Route table (modify `src/App.tsx`)

Add below the existing public routes, above `/admin`. All dashboard chunks are lazy:

```tsx
const DashboardLayout  = lazy(() => import("./pages/dashboard/DashboardLayout"));
const DashboardHome    = lazy(() => import("./pages/dashboard/DashboardHome"));
const DashboardProfile = lazy(() => import("./pages/dashboard/DashboardProfile"));
const DashboardAccount = lazy(() => import("./pages/dashboard/DashboardAccount"));
const DashboardActivity = lazy(() => import("./pages/dashboard/DashboardActivity"));

<Route
  path="/dashboard"
  element={
    <RequireAuth>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardLayout />
      </Suspense>
    </RequireAuth>
  }
>
  <Route index element={<DashboardHome />} />
  <Route path="profile" element={<DashboardProfile />} />
  <Route path="account" element={<DashboardAccount />} />
  <Route path="activity" element={<DashboardActivity />} />
</Route>
```

- `<RequireAuth>` comes from plan 02 (`src/components/auth/RequireAuth.tsx`). Contract: while
  `useAuth().loading` → render `<DashboardSkeleton />`; if no user → `<Navigate
  to={"/auth?next=" + encodeURIComponent(location.pathname + location.search)} replace />`.
  **If plan 02 has not landed when this plan is implemented, create that exact file with that
  exact contract here** (it is 20 lines) and plan 02 adopts it — do not fork a second guard.
- Wrap the whole `<Routes>` in `React.lazy`-friendly `<Suspense>` per FOUNDATION §4 performance
  rule if plan 01/02 hasn't already; dashboard code must not ship to landing visitors.

### 1.2 Files — shell

| File | Action | Contents |
|---|---|---|
| `src/pages/dashboard/DashboardLayout.tsx` | create | Shell: `<SidebarProvider>` from `src/components/ui/sidebar.tsx` (already present, unused). Renders `<DashboardSidebar />` (md+), a slim top bar, `<main id="main" className="flex-1 pb-20 md:pb-0"><div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-10"><Outlet /></div></main>`, and `<DashboardMobileNav />` (below `md`). Sets `document.title` fallback per child via `<SEO>` when plan 08 lands; until then each page sets `document.title` in an effect. |
| `src/components/dashboard/DashboardSidebar.tsx` | create | shadcn `Sidebar` (`collapsible="icon"`). Header: wordmark link to `/`. Menu items (Lucide icons): Home `/dashboard` (`LayoutDashboard`, `end`), My profile `/dashboard/profile` (`Store`), Activity `/dashboard/activity` (`TrendingUp`), Account `/dashboard/account` (`Settings`). Footer: user email + Sign out button (`useAuth().signOut()` then `navigate("/")`). Active item: `bg-primary/10 text-primary` left-accent; rest navy `text-foreground`. Mirror the grouped-nav pattern of `src/components/admin/AdminLayout.tsx` but flat (4 items, no groups). |
| `src/components/dashboard/DashboardMobileNav.tsx` | create | Fixed bottom tab bar, `md:hidden`, `<nav aria-label="Dashboard">` with 4 `NavLink`s: icon + 11px label, min touch target 44×44, `bg-card border-t border-border`, active = `text-primary`, inactive = `text-muted-foreground`. Safe-area padding (`pb-[env(safe-area-inset-bottom)]`). The layout's `<main>` gets `pb-20 md:pb-0` so content never hides behind it. |
| `src/components/dashboard/DashboardTopbar.tsx` | create | `h-14 border-b border-border bg-card flex items-center gap-3 px-4`: shadcn `SidebarTrigger` (md+ only), current page title (from route), spacer, link "View directory" → `/directory`, avatar dropdown (email, "Account settings" → `/dashboard/account`, "Sign out"). If plan 02's global `<AppHeader>` is designed to cover app routes, the dashboard still keeps this topbar and plan 02's header is **not** rendered inside `/dashboard/*` (one header only — coordinate in plan 02). |
| `src/components/common/DashboardSkeleton.tsx` | create (if plan 01 hasn't) | Full-page skeleton: sidebar rail block + 4 stat-card skeletons + 3 list-row skeletons, using shadcn `Skeleton`. No shimmer under `prefers-reduced-motion` (plan 01 owns the primitive; identical contract). |

Mobile-first: below `md` there is **no sidebar at all** — bottom nav + topbar only. Sidebar
`collapsible="icon"` on `md`, full on `lg+`.

---

## 2. Data layer (TanStack Query + the plan-07 seam)

### 2.1 The seam: `src/lib/api/*`

Hooks never import the Supabase client directly. Each domain gets an api module that exports plain
async functions; **today** they call `supabase` (from `@/integrations/supabase/client`), **later**
plan 07 rewrites only these modules to `fetch` the NestJS API with the Supabase JWT
(`Authorization: Bearer <session.access_token>`). Function signatures and return types are the
contract and must not change in that swap.

| File | Exports (signatures are the plan-07 contract) |
|---|---|
| `src/lib/api/profile.ts` | `fetchMyProfile(userId: string): Promise<Profile \| null>` → `supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle()`, **throw on `error`**. `updateProfileStatus(profileId: string, status: "active" \| "hidden"): Promise<void>`. |
| `src/lib/api/subscription.ts` | `fetchMySubscription(userId: string): Promise<Subscription \| null>` → `select("has_access, expires_at, created_at").eq("user_id", userId).maybeSingle()`, throw on error. |
| `src/lib/api/funding.ts` | `fetchFundingFeed(): Promise<FundingOpportunity[]>` → `from("funding_opportunities").select("*").eq("status", "published").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(100)`. `fetchSavedOpportunities(userId): Promise<SavedOpportunity[]>` (join: `saved_opportunities.select("id, opportunity_id, created_at, funding_opportunities(*)")`). `saveOpportunity(userId, opportunityId)`, `unsaveOpportunity(savedId)`. |
| `src/lib/api/preferences.ts` | `fetchMyPreferences(userId): Promise<UserPreferences \| null>`, `upsertMyPreferences(userId, patch: Partial<UserPreferences>): Promise<void>` (`upsert` on `user_id`). |

Types come from `src/integrations/supabase/types.ts` (`Tables<"profiles">` etc.) re-exported as
domain aliases in `src/lib/api/types.ts` so plan 07 can re-point them at API DTOs in one place.

### 2.2 Query hooks — `src/hooks/queries/`

Query keys are centralized so plan 05/06/07 invalidate consistently:

```ts
// src/hooks/queries/keys.ts
export const qk = {
  myProfile:      (uid: string) => ["profile", "me", uid] as const,
  mySubscription: (uid: string) => ["subscription", "me", uid] as const,
  fundingFeed:    ()            => ["funding", "feed"] as const,
  savedOpps:      (uid: string) => ["funding", "saved", uid] as const,
  myPreferences:  (uid: string) => ["preferences", "me", uid] as const,
};
```

| File | Hook | Notes |
|---|---|---|
| `src/hooks/queries/useMyProfile.ts` | `useMyProfile()` | `enabled: !!user`, `staleTime: 60_000`. Returns the full query object (`data`, `isPending`, `isError`, `refetch`). |
| `src/hooks/queries/useMySubscription.ts` | `useMySubscription()` | `staleTime: 60_000`. Also exports derived `const active = isSubscriptionActive(data)` (see 2.3). Plan 06 invalidates `qk.mySubscription` after checkout confirmation. |
| `src/hooks/queries/useFundingFeed.ts` | `useFundingFeed()` | Public data; `staleTime: 5 * 60_000`. Shared with plan 05's `/funding` page — same key, no double fetch. |
| `src/hooks/queries/useSavedOpportunities.ts` | `useSavedOpportunities()`, `useSaveOpportunity()`, `useUnsaveOpportunity()` | Mutations optimistically update `qk.savedOpps(uid)` and roll back on error (toast via sonner). |
| `src/hooks/queries/useMyPreferences.ts` | `useMyPreferences()`, `useUpdatePreferences()` | Optimistic toggle updates. |
| `src/hooks/queries/useProfileVisibility.ts` | `useSetProfileVisibility()` | Mutation wrapping `updateProfileStatus`; invalidates `qk.myProfile(uid)`. Refuses to run if current `status === "flagged"`. |

Rules (FOUNDATION §4): every consumer must branch on `isPending` → skeleton, `isError` →
`<ErrorState onRetry={refetch}>`, then empty vs data. **Never** render an empty or locked state
from an error (IMPROVEMENTS §2.1).

### 2.3 Centralized subscription rule — `src/lib/subscription.ts` (create)

```ts
export function isSubscriptionActive(s?: { has_access: boolean; expires_at: string | null } | null): boolean {
  return !!s?.has_access && (!s.expires_at || new Date(s.expires_at) > new Date());
}
```

This is the single client-side source of the rule currently triplicated (IMPROVEMENTS §9 / CLAUDE.md).
Plan 05 refactors `Funding.tsx` to use it; plan 06's billing UI uses it. Unit-tested (§8).

### 2.4 Pure logic modules (all in `src/lib/`, all unit-tested)

**`src/lib/profileCompleteness.ts`** — `computeCompleteness(p: Profile | null): { percent: number; missing: MissingItem[] }`.
Weights sum to 100; a field counts when non-empty (trimmed):

| Field(s) (real `profiles` columns) | Weight |
|---|---|
| `business_name`, `country`, `sector` (required at creation) | 15 |
| `short_description` | 10 |
| `long_description` | 15 |
| `logo_url` | 15 |
| `founder_name` | 5 |
| `founder_photo_url` | 10 |
| `website` | 10 |
| at least one contact of `email` / `phone` / `whatsapp` | 10 |
| at least one social of `instagram` / `linkedin` / `twitter` | 5 |
| `keywords` (length ≥ 3) | 5 |

`null` profile → `{ percent: 0, missing: [ALL] }`. Each `MissingItem` = `{ key, label, weight,
href: "/directory/create#<anchor>" }` so the UI can deep-link to the form section.

**`src/lib/matchOpportunities.ts`** — `scoreOpportunity(p: Profile, o: FundingOpportunity): number`
and `matchOpportunities(p, opps): FundingOpportunity[]` (score > 0, sorted desc, stable tiebreak by
`created_at` desc). Deterministic scoring against real columns:
- +3 if `o.country_focus` (TEXT[]) contains `p.country` or is empty/`["Africa"]`/`["Pan-African"]` (case-insensitive);
- +2 per overlap between `o.tags` (TEXT[]) and `p.keywords` (TEXT[]), max +6;
- +2 if `p.sector` word-overlaps `o.tags`, `o.title`, or `o.summary` (split sector on `&`/`,`, lowercase contains);
- +1 if `o.featured`.
No AI call — this is a cheap client-side rank over the curated `funding_opportunities` feed.

**`src/lib/nextBestAction.ts`** — `nextBestActions(input): Action[]` where `input = { profile,
completeness, subscription, savedCount, feedNewCount }`. Returns ordered list; first match wins for
the hero slot, up to 3 rendered:

1. no profile → "Create your business profile" → `/directory/create`
2. `completeness.percent < 70` → top-weighted `missing` item ("Add a logo — profiles with logos get noticed") → its `href`
3. `profile.status === "hidden"` → "Your profile is hidden from the directory — make it visible" → `/dashboard/profile`
4. `!isSubscriptionActive(subscription)` → "Unlock the full funding radar" → `/dashboard/account#billing`
5. `feedNewCount > 0` → "N new opportunities this week — review and save the ones that fit" → `/dashboard`
6. `savedCount === 0` → "Save your first opportunity so you never lose the link" → `/dashboard`
7. fallback → "Share your profile link on WhatsApp" → `/dashboard/profile`

**`src/lib/profileUrl.ts`** — `publicProfilePath(p: { slug?: string | null; id: string }): string`
→ `/directory/${p.slug ?? p.id}`. **Seam with plan 04:** plan 04 adds the `slug` column +
`/directory/:slug` route (resolving slug *or* id). Until plan 04 lands, this returns the id-based
path and the link card labels it "your public profile link". Only this helper builds the URL.

---

## 3. Database changes (one migration — coordinate with plan 07)

Create `supabase/migrations/20260721090000_dashboard_foundation.sql`. Plan 07 must mirror these
tables in its Drizzle schema; plan 04 must **not** re-create `increment_profile_views`.

```sql
-- 1. Saved funding opportunities (pillar A)
CREATE TABLE public.saved_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.saved_opportunities TO authenticated;
GRANT ALL ON public.saved_opportunities TO service_role;
CREATE POLICY "Users manage own saved opportunities"
  ON public.saved_opportunities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX saved_opportunities_user_idx ON public.saved_opportunities (user_id, created_at DESC);

-- 2. User preferences (pillar C notification prefs; extensible JSON-free columns)
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_new_funding BOOLEAN NOT NULL DEFAULT true,
  email_product_updates BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
CREATE POLICY "Users manage own preferences"
  ON public.user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Atomic profile view counter (read by pillar D; CALLED by plan 04's /directory/:slug page)
CREATE OR REPLACE FUNCTION public.increment_profile_views(_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET view_count = view_count + 1 WHERE id = _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.increment_profile_views(UUID) TO anon, authenticated;
```

After applying: **regenerate `src/integrations/supabase/types.ts`** (never hand-edit).

Existing columns this plan reads/writes (no changes needed): `profiles.status`
(`active|hidden|flagged`, users can UPDATE their own row per RLS), `profiles.view_count`,
`profiles.keywords`, `subscriptions.has_access` / `expires_at`, `funding_opportunities.*`
(public SELECT of `status='published'`). `analytics_events` is admin-read-only — the dashboard
does **not** query it (v2 could add a SECURITY DEFINER RPC for per-profile view time series).

---

## 4. Pillar A — Funding feed home (`/dashboard`, `src/pages/dashboard/DashboardHome.tsx`)

Data: `useMyProfile`, `useMySubscription`, `useFundingFeed`, `useSavedOpportunities`.

Layout top-to-bottom:

1. **Greeting + hero action** — "Welcome back, {founder_name or business_name or email-local-part}."
   Subline = first result of `nextBestActions` rendered as an orange primary button. Sora heading
   (`font-display text-2xl md:text-3xl text-ink-strong`).
2. **Stat row** — 4 × `<StatCard>` (`grid gap-4 grid-cols-2 lg:grid-cols-4`):
   - "New this week" = feed items with `created_at > now − 7d` (orange icon `Sparkles`→ no; use `CalendarPlus`, anti-slop: no sparkles);
   - "Matched to you" = `matchOpportunities(profile, feed).length`;
   - "Saved" = saved count;
   - "Membership" = value `Active` (success) / `Expired` / `Free` with `expires_at` date as sub-label, links `/dashboard/account`.
3. **"Matched to your business"** section (`components/dashboard/MatchedOpportunities.tsx`) — top 5
   `matchOpportunities` results as `<OpportunityRow>` (`components/dashboard/OpportunityRow.tsx`:
   compact row — type badge, title, funder, deadline, save/unsave bookmark toggle button
   (`aria-pressed`), external link). "New" chip (`bg-primary/10 text-primary`) when < 7 days old.
   Footer link: "Open the full Funding Radar →" `/funding`.
   - No profile → inline `<EmptyState variant="firstRun">` "Create your profile and we'll match
     opportunities to your sector, country and keywords" → `/directory/create`.
   - Profile but zero matches → show 5 newest feed items instead, titled "Newest opportunities".
4. **"Saved by you"** (`components/dashboard/SavedOpportunities.tsx`) — saved rows, unsave inline.
   Empty → one-line hint (not a full EmptyState — keep the page calm): "Nothing saved yet. Tap the
   bookmark on any opportunity."
5. **Non-subscriber banner** (only when `!isSubscriptionActive`) —
   `components/dashboard/UpgradeBanner.tsx`: navy panel (`bg-navy text-white rounded-xl`), honest
   copy ("Members get the full AI-curated radar. The list above is our free curated feed."), orange
   CTA → `/dashboard/account#billing`. Never shown on fetch error.

States: **Loading** — stat-row skeleton (4 `<CardSkeleton>`) + 5 row skeletons. **Error** — if
`useFundingFeed` errors: `<ErrorState title="Couldn't load opportunities" onRetry>`; stat cards
that depend on failed queries render an em-dash value, never 0. **Empty** — feed genuinely empty
(admin hasn't published): `<EmptyState variant="default">` with `funding-empty` illustration,
"The curated feed is being prepared — check back soon", secondary action "Browse the directory".

## 5. Pillar B — Profile hub (`/dashboard/profile`, `src/pages/dashboard/DashboardProfile.tsx`)

Data: `useMyProfile`. Widgets:

1. **`components/dashboard/ProfileCompletenessCard.tsx`** — circular or bar `Progress` (shadcn) with
   `percent`, color: `< 40` warning, `40–79` primary orange, `≥ 80` success teal. Below: up to 3
   top-weighted `missing` items as checklist links into `/directory/create#<anchor>`
   (CreateProfile gets matching `id=` anchors on its section headings — small modify to
   `src/pages/CreateProfile.tsx`). At 100%: "Your storefront is complete." + share nudge.
2. **`components/dashboard/ProfilePreviewCard.tsx`** — renders the founder's own directory card
   *exactly* as the public sees it (extract the card markup from `src/pages/Directory.tsx` into a
   shared `src/components/directory/ProfileCard.tsx`; Directory page and this widget both consume
   it — coordinate with plan 04 which also needs it). Buttons: "Edit profile" (orange, →
   `/directory/create`), "View public page" (secondary, → `publicProfilePath(profile)`).
3. **`components/dashboard/ShareLinkCard.tsx`** — the growth loop (IMPROVEMENTS §4): read-only input
   with the absolute URL (`window.location.origin + publicProfilePath(profile)`), "Copy link"
   (clipboard + toast), "Share on WhatsApp" (`https://wa.me/?text=<encoded>` — audience-correct),
   native `navigator.share` when available. Note under field: "Anyone with this link can view your
   public profile." (Plan 04 makes this URL slug-pretty + OG-rich; card copy unchanged.)
4. **`components/dashboard/VisibilityCard.tsx`** — shadcn `Switch` "Visible in the directory".
   On = `status: "active"`, Off = `status: "hidden"` via `useSetProfileVisibility` (optimistic,
   rollback + toast on error). If `status === "flagged"`: switch disabled, amber notice "Your
   profile is under review — contact support." Copy: "Hiding removes you from the public directory;
   your direct link stops working too."

States: **Loading** — 3 card skeletons. **Error** — `<ErrorState onRetry>` full-pane. **Empty**
(no profile row) — full-pane `<EmptyState variant="firstRun">` with `profile-empty` illustration:
"Your storefront isn't live yet" / body "A complete profile is how partners, customers and funders
find you." / primary "Create your profile" → `/directory/create`. No completeness/share/visibility
cards render in this state.

**Post-publish payoff (IMPROVEMENTS §4 first bullet):** modify `src/pages/CreateProfile.tsx`
`onSubmit` success: `navigate(existingId ? "/dashboard/profile" : "/dashboard/profile?published=1")`
(replaces `navigate("/directory")`). `DashboardProfile` reads `?published=1` → renders a one-time
celebratory banner above the preview card: "You're live. This is what the world sees." with the
preview + ShareLinkCard focused (move them to top), then strips the param via `setSearchParams`.
CreateProfile must also invalidate `qk.myProfile(uid)` after save (import `queryClient` or use a
`useMutation` — plan 05/02 refactor territory; minimal change: `queryClient.invalidateQueries`).

## 6. Pillar C — Account & billing (`/dashboard/account`, `src/pages/dashboard/DashboardAccount.tsx`)

Data: `useMySubscription`, `useMyPreferences`, `useAuth`. Sections (anchors for deep links):

1. **`components/dashboard/BillingCard.tsx`** (`id="billing"`) — states from
   `isSubscriptionActive` + row presence:
   - **Active:** success badge, "Member since {created_at:date}", "Renews/expires {expires_at:date}"
     (or "No expiry set"), secondary "Manage billing" → plan 06 surface.
   - **Expired** (`has_access` true-then-lapsed or false with past `expires_at`): warning badge +
     renew CTA.
   - **Free:** what membership unlocks (3 bullet truths, no hype) + primary orange CTA.
   - The CTA is **`<UpgradeButton />` imported from `src/components/billing/UpgradeButton.tsx` —
     owned by plan 06** (Paystack inline checkout → webhook flips `subscriptions.has_access` →
     invalidate `qk.mySubscription`). **Interim stub (this plan creates the file):** renders the
     honest concierge flow per IMPROVEMENTS §1.1 — "Pay by mobile money or bank transfer — message
     us on WhatsApp and we activate access within 24 hours" + WhatsApp deep link. Plan 06 replaces
     the internals; the import site never changes.
2. **`components/dashboard/SecurityCard.tsx`** — shows signed-in email (`user.email`). Change
   password form: new password + confirm (Zod: min 8, named errors), calls
   `supabase.auth.updateUser({ password })` — auth stays on the Supabase client even after plan 07
   (FOUNDATION §5). Success/error toasts in plain language (plan 02's error-mapping util
   `mapAuthError` if present).
3. **`components/dashboard/NotificationPrefsCard.tsx`** — two `Switch` rows bound to
   `user_preferences.email_new_funding` / `email_product_updates` via `useUpdatePreferences`
   (optimistic). Honest sub-label: "We'll use these when email alerts launch." No row yet →
   defaults shown; first toggle upserts.
4. **`components/dashboard/SignOutCard.tsx`** — "Signed in as {email} on this device." Destructive-
   outline "Sign out" → `signOut()` → `queryClient.clear()` → `navigate("/")`. (Critical for
   shared Android devices — IMPROVEMENTS §1.2.)

States: Billing card **error** → `<ErrorState>` inside the card ("Couldn't confirm your membership
— retry") and **never** the Free/upsell state (the P1 trust bug). Prefs error → card-level retry.
Loading → per-card skeletons.

## 7. Pillar D — Activity & guidance (`/dashboard/activity`, `src/pages/dashboard/DashboardActivity.tsx`)

Data: `useMyProfile`, `useMySubscription`, `useSavedOpportunities`, `useFundingFeed`.

1. **`components/dashboard/OnboardingChecklist.tsx`** — all items derived from server data (no
   fragile localStorage): ① Create account (always ✓) ② Publish your profile (profile row exists)
   ③ Add your logo (`logo_url`) ④ Tell your story (`long_description`) ⑤ Add keywords for matching
   (`keywords.length ≥ 3`) ⑥ Save a funding opportunity (`savedCount > 0`) ⑦ Become a member
   (`isSubscriptionActive`). Each incomplete item is a link. Progress "N of 7". When 7/7 the card
   collapses to a single "You're all set" row (collapsed state persisted in `user_preferences`? No
   — keep stateless: auto-collapse at 7/7).
2. **Stat row** — `<StatCard>` × 3: "Profile views" = `profiles.view_count` (sub-label "since you
   published"; becomes live once plan 04's public page calls `increment_profile_views`); "Saved
   opportunities" = count; "Profile completeness" = percent (links `/dashboard/profile`).
   View-count delta/time-series is explicitly **v2** (needs an analytics RPC; `analytics_events`
   is admin-read-only).
3. **`components/dashboard/NextBestActions.tsx`** — top 3 from `nextBestActions` as numbered rows
   (number in orange circle, title, one-line why, chevron link). This is guidance, not a card-grid
   — vary structure per anti-slop §1.4.

States: loading — checklist + stat skeletons; error — pane-level `<ErrorState onRetry>`; "empty"
is impossible (checklist always renders) — zero-profile users see the checklist pointing at step ②
plus the `activity-empty` illustration beside the stat row (views "—").

---

## 8. Returning-user experience

1. **`/` becomes the dashboard for logged-in users.** Modify `src/pages/Index.tsx`: at top,
   `const { user, loading } = useAuth();` — if `loading` render nothing extra (avoid flash); if
   `user && searchParams.get("home") !== "1"` → `<Navigate to="/dashboard" replace />`. The
   marketing page stays reachable at `/?home=1` (dashboard sidebar wordmark links there;
   plan 02's `<AppHeader>` "Home" for logged-in users uses it too — coordinate).
2. **Auth lands on the dashboard.** Coordinate with plan 02: `/auth` success with no `?next` →
   `navigate("/dashboard")` (today it goes to `/`; the redirect in (1) makes this correct even
   before plan 02 changes it).
3. **Post-publish payoff** — §5 (`?published=1` flow).
4. **100th-visit ergonomics:** `/dashboard` index is the funding feed (the recurring value), not a
   settings page; "new this week" chip count also badges the Home item in sidebar/bottom-nav
   (small `bg-primary` dot when `feedNewCount > 0`).

---

## 9. Visual design (FOUNDATION theme)

- **Page anatomy:** `max-w-6xl`, `py-8 md:py-10`, sections stacked `space-y-8`. Every page opens
  with `<PageHeader>` (plan 01 primitive): Sora `text-2xl md:text-3xl font-semibold text-ink-strong`
  title + `text-muted-foreground` subtitle + optional right-aligned action.
- **`<StatCard>` spec** (plan 01 owns `src/components/common/StatCard.tsx`; build here if absent,
  identical API): props `{ label, value, subLabel?, delta?, icon?, href?, tone? = "default" |
  "success" | "warning" }`. Markup: `rounded-xl border border-border bg-card shadow-soft p-5`;
  optional icon in a `h-10 w-10 rounded-lg bg-primary/10 text-primary` square (tone variants use
  `--success`/`--warning` at /10); value `font-display text-3xl font-semibold text-ink-strong`
  (tabular-nums); label `text-sm text-muted-foreground` **below** the value (HubSpot style);
  `delta` renders `+N` chip in success teal / warning. `href` wraps in `<Link>` with
  `hover:border-primary/40 transition-colors` (no scale transforms — anti-slop).
- **Color discipline:** orange only on: primary CTA per view, active nav, progress bars, "New"
  chips, focus ring. Structure is navy/white: topbar + cards white, `UpgradeBanner` and any hero
  panel navy (`bg-navy`, allowed navy gradient only). Success = teal `--success`, never for CTAs.
- **Zero-state illustrations** (FOUNDATION §3): create three inline-SVG React components in
  `src/components/illustrations/`: `FundingEmpty.tsx` (radar/compass motif), `ProfileEmpty.tsx`
  (storefront motif), `ActivityEmpty.tsx` (seedling/steps motif). Line style, `currentColor`
  strokes (navy) + one orange accent shape, `aria-hidden="true"`, ≤ 3KB each, no external assets.
- **Motion:** none beyond default transitions; skeleton shimmer disabled under
  `prefers-reduced-motion`. No scroll-fades in the dashboard.
- **A11y:** bottom nav is `<nav aria-label>`; bookmark toggles `aria-pressed` + `aria-label="Save
  {title}"`; switches labeled via `htmlFor`; stat deltas get `sr-only` context ("up 3 from last
  week"); pane state changes announced via an `aria-live="polite"` region in `DashboardLayout`;
  all targets ≥ 44px; focus ring orange (`--ring`).

---

## 10. Dependencies on other plans (explicit)

| Plan | This plan consumes | Direction / fallback |
|---|---|---|
| **01 design system** | Theme tokens (`--primary` orange, `--navy`, `--ink-strong`, shadows, Sora `font-display`), primitives `<EmptyState>` `<ErrorState>` `<PageHeader>` `<StatCard>` `<CardSkeleton>` `<DashboardSkeleton>`, `<Illustration>` conventions. | Hard dependency for final look. If a primitive is missing at build time, create it at the **canonical path** `src/components/common/*` with the API in FOUNDATION §2 — plan 01 then owns it. |
| **02 auth flow** | `<RequireAuth>`, auth-aware `<AppHeader>` (must NOT double-render inside `/dashboard/*`), `/auth` default redirect → `/dashboard`, `mapAuthError`. | Guard fallback defined in §1.1. |
| **04 directory/profiles** | `profiles.slug` column + `/directory/:slug` route + OG tags; the public page calls `increment_profile_views` (RPC created **here**, §3); shared `src/components/directory/ProfileCard.tsx` (extracted here, consumed by 04). | Until 04: `publicProfilePath` falls back to id-based URL; view counts stay 0 (stat renders honestly: "0 — goes live with your public page" sub-label until 04 ships is NOT needed; plain 0 is fine). |
| **05 funding feature** | Shares `qk.fundingFeed` + `src/lib/api/funding.ts` + `isSubscriptionActive`; `/funding` remains the deep "radar" surface linked from pillar A. | No blocking either way. |
| **06 payments (Paystack)** | `<UpgradeButton>` internals + `qk.mySubscription` invalidation after webhook-confirmed payment; billing management surface. | Interim concierge stub defined in §6.1 keeps the funnel honest and open. |
| **07 backend NestJS+Drizzle** | Rewrites `src/lib/api/*` internals to call the API; mirrors §3 tables (`saved_opportunities`, `user_preferences`) in Drizzle schema; keeps RPC or replaces with an endpoint. | Seam contract in §2.1 — hook layer and pages unchanged. |
| **08 branding/meta** | `<SEO>` per dashboard route (`Dashboard — Cresciva`, noindex for `/dashboard/*`). | Until then: `document.title` effect per page. |

---

## 11. Test plan (Vitest + Testing Library, `src/**/*.test.ts(x)`)

Unit (pure, no mocks):
- `src/lib/profileCompleteness.test.ts` — null profile → 0/all-missing; required-only → 15;
  weights sum to 100; contact/social "any-of" logic; keywords threshold.
- `src/lib/matchOpportunities.test.ts` — country match incl. empty/pan-African `country_focus`;
  tag-overlap cap; sector word match; deterministic ordering; zero-score exclusion.
- `src/lib/nextBestAction.test.ts` — priority order for: no profile / low completeness / hidden /
  free / new items / no saves / fallback.
- `src/lib/subscription.test.ts` — false row, expired, null expiry, future expiry, null/undefined.
- `src/lib/profileUrl.test.ts` — slug preferred, id fallback.

Component (mock the `src/lib/api/*` modules with `vi.mock` — the seam makes this trivial):
- `DashboardHome.test.tsx` — renders skeletons while pending; `<ErrorState>` + working Retry on
  feed rejection (and **no** UpgradeBanner in that render); EmptyState when feed `[]`; matched
  section falls back to "Newest" when profile null.
- `DashboardProfile.test.tsx` — no-profile EmptyState hides completeness/share cards;
  `?published=1` shows payoff banner once; visibility switch calls `updateProfileStatus` with
  `"hidden"`, disabled when `status === "flagged"`.
- `DashboardAccount.test.tsx` — billing card shows Active for future `expires_at`; shows ErrorState
  (never Free upsell) on subscription fetch error; sign-out calls `signOut` and clears cache.
- `RequireAuth.test.tsx` (if created here) — redirects with encoded `next`, skeleton while loading.
- `Index.test.tsx` — logged-in `/` navigates to `/dashboard`; `/?home=1` renders marketing page.

Manual QA matrix: 360×640 Android viewport (bottom nav, no horizontal scroll, 44px targets),
keyboard-only walk of all 4 pillars, `prefers-reduced-motion` (no shimmer), dark mode, throttled
3G (skeletons appear, no layout shift), flagged-profile state.

## 12. Acceptance criteria

1. `/dashboard`, `/dashboard/profile`, `/dashboard/account`, `/dashboard/activity` render behind
   auth; unauthenticated hit redirects to `/auth?next=<encoded-path>` and returns after sign-in.
2. Logged-in visit to `/` lands on `/dashboard`; `/?home=1` still shows the marketing page.
3. Every pillar has distinct loading (skeleton), empty (illustrated EmptyState with action), and
   error (`<ErrorState>` with functioning Retry) renders — verified by tests; an error never
   renders an empty, zero, or upsell state.
4. Completeness % matches the §2.4 weight table exactly (unit-tested); missing-item links deep-link
   into the profile form anchors.
5. Save/unsave persists to `saved_opportunities` (RLS-scoped to the user), survives reload, and is
   optimistic with rollback.
6. Visibility toggle flips `profiles.status` between `active`/`hidden` only, is blocked for
   `flagged`, and the hidden profile disappears from `/directory` (plan 04 adds the status filter;
   until then document the gap in the PR).
7. Publishing a profile from `/directory/create` lands on `/dashboard/profile?published=1` with the
   payoff banner + own-card preview + share actions; profile query is invalidated (fresh data).
8. Copy-link and WhatsApp share produce the `publicProfilePath` URL.
9. Password change works via Supabase auth with plain-language feedback; sign-out clears the query
   cache and returns to `/`.
10. Notification toggles upsert `user_preferences` and survive reload.
11. No Supabase import outside `src/lib/api/*`, `src/hooks/useAuth.tsx`, `src/hooks/useRole.tsx`,
    auth/security card, and pre-existing files — enforced by review (the plan-07 seam).
12. Mobile: bottom nav on < md, sidebar md+, no horizontal scroll at 360px, WCAG AA contrast, no
    anti-slop tells (no gradient text, sparkles badges, scale hovers, uniform icon-card grids).
13. `npm run build`, `npm run lint`, `npm test` green; dashboard chunks are lazy (not in the
    landing bundle — verify with `vite build` output).

## 13. Ordered implementation checklist

1. [ ] Apply migration `20260721090000_dashboard_foundation.sql`; regenerate
       `src/integrations/supabase/types.ts`.
2. [ ] Create pure logic + tests: `src/lib/subscription.ts`, `profileCompleteness.ts`,
       `matchOpportunities.ts`, `nextBestAction.ts`, `profileUrl.ts`.
3. [ ] Create `src/lib/api/types.ts`, `profile.ts`, `subscription.ts`, `funding.ts`,
       `preferences.ts` (Supabase-backed, throw on error).
4. [ ] Create `src/hooks/queries/keys.ts` + the six hook files (§2.2).
5. [ ] Ensure primitives exist (`EmptyState`, `ErrorState`, `PageHeader`, `StatCard`,
       `CardSkeleton`, `DashboardSkeleton`) at `src/components/common/*` — build any missing ones
       to FOUNDATION §2 spec.
6. [ ] Create illustrations `FundingEmpty.tsx`, `ProfileEmpty.tsx`, `ActivityEmpty.tsx`.
7. [ ] Ensure `<RequireAuth>` exists (plan 02 or §1.1 fallback).
8. [ ] Build shell: `DashboardLayout.tsx`, `DashboardSidebar.tsx`, `DashboardTopbar.tsx`,
       `DashboardMobileNav.tsx`; wire lazy routes into `src/App.tsx`.
9. [ ] Extract `src/components/directory/ProfileCard.tsx` from `Directory.tsx`; refactor
       `Directory.tsx` to consume it (no visual change).
10. [ ] Build Pillar A: `DashboardHome.tsx` + `MatchedOpportunities.tsx`, `OpportunityRow.tsx`,
        `SavedOpportunities.tsx`, `UpgradeBanner.tsx`.
11. [ ] Build Pillar B: `DashboardProfile.tsx` + `ProfileCompletenessCard.tsx`,
        `ProfilePreviewCard.tsx`, `ShareLinkCard.tsx`, `VisibilityCard.tsx`; add section anchors to
        `CreateProfile.tsx`; change its success redirect + query invalidation (§5).
12. [ ] Build Pillar C: `DashboardAccount.tsx` + `BillingCard.tsx`, `UpgradeButton.tsx` (concierge
        stub), `SecurityCard.tsx`, `NotificationPrefsCard.tsx`, `SignOutCard.tsx`.
13. [ ] Build Pillar D: `DashboardActivity.tsx` + `OnboardingChecklist.tsx`, `NextBestActions.tsx`.
14. [ ] Returning-user redirect in `src/pages/Index.tsx` (+ `/?home=1` escape); new-this-week nav
        badge.
15. [ ] Component tests (§11); run full QA matrix.
16. [ ] `npm run build && npm run lint && npm test`; check bundle split; update `CLAUDE.md` route
        list with `/dashboard/*`.
