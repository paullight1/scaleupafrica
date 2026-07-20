# 05 — Funding Feature: caching/persistence, trust-critical error handling, AI validation, UX

> Part of the ScaleUp Africa overhaul. **Read `docs/plans/00-FOUNDATION.md` first** — all tokens,
> primitives (`<ErrorState>`, `<EmptyState>`, `<CardSkeleton>`, `<PageHeader>`), and conventions
> come from there and from plan `01-design-system-theme.md`.
> Source audit: `IMPROVEMENTS.md` §2.1, §2.2, §3 items 5/6/15/17, §4 (pre-seed, expectations,
> comparison), §10 Q2.

---

## 1. Goal

Turn `/funding` from an expensive, ephemeral, trust-hazardous demo into the product's credibility
anchor:

1. **Never re-bill or destroy results.** Results survive navigation and reload via TanStack Query +
   localStorage + a server-side `funding_results` cache table with TTL.
2. **Never lie to a paying member.** A subscription-fetch failure renders an error/retry state —
   never the paywall (IMPROVEMENTS §2.1, the "they took my money and locked me out" scam narrative).
3. **Never render raw model output.** Zod validation + URL sanitization in the edge function *and*
   the client; server-side rate limiting; honest ~60s expectation-setting UX.
4. **Move to a shared, weekly-verified feed** as the primary experience (strategic decision, §3
   below), with per-user AI search demoted to a secondary, cached, rate-limited action.
5. Restyle to the FOUNDATION HubSpot orange/navy theme with proper loading/empty/error states.

### Scope

**In:** `/funding` page + components, `aggregate-funding` edge function, new
`refresh-funding-feed` edge function, two migrations, `src/pages/admin/AdminFunding.tsx`
(currently a 5-line stub), shared subscription/validation libs, tests.

**Out:** checkout / flipping `has_access` (plan **06**), the NestJS API itself (plan **07** — but
every contract here is designed to port), header/auth shell (plan **02**), design-system primitives
themselves (plan **01**).

---

## 2. Current state (verified in code)

| Problem | Where |
|---|---|
| Subscription fetch destructures only `{ data }`; error ⇒ `access=false` ⇒ **paywall shown to subscriber** | `src/pages/Funding.tsx:90-93` |
| "Active subscription" rule triplicated | `has_active_subscription()` in `supabase/migrations/20260713035330_….sql` (never called); `supabase/functions/aggregate-funding/index.ts:23-25`; `Funding.tsx:91` |
| Results in `useState` only; navigation destroys them; re-run = full Gemini 2.5 Pro 16k-token generation + ~1 min on the user's data plan | `Funding.tsx:75`, edge fn `:72-79` |
| Model JSON rendered unvalidated; `o.url` and `past_recipients[].website` go straight into `href` (`javascript:` possible) | edge fn `:92-94`, `Funding.tsx:315,287` |
| No rate limit beyond upstream 429; no timeout; double-submit only via `disabled` | edge fn, `Funding.tsx:104-115,206` |
| `?preview=1` bypasses the paywall shell — confusing if shared | `Funding.tsx:72-86` |
| One-at-a-time accordion (`expanded === i`) blocks comparison | `Funding.tsx:78,251` |
| User must invent keywords; profile `sector`/`country`/`keywords TEXT[]` unused | `Funding.tsx:199-205` |
| Gradient-gold h1, Sparkles "AI-powered" pill, forest/gold classes — all banned by FOUNDATION §1.4 | `Funding.tsx:180-184` |
| Assets that already exist and must be reused: `funding_opportunities` table (admin-curated, `status`/`featured`, staff RLS) in `supabase/migrations/20260720120000_admin_panel_foundation.sql:193-226`; `is_admin()`/`is_staff()` helpers; `QueryClientProvider` mounted in `src/App.tsx:43`; TanStack Query + zod already in `package.json` | — |

---

## 3. Strategic decision: shared weekly feed vs per-user on-demand

**Decision: the shared, weekly-refreshed, admin-spot-checked feed is the primary experience.**
Per-user on-demand generation is kept as a secondary "AI deep search" behind the same paywall,
served through the `funding_results` cache so it is never re-billed within its TTL.

Justification:

- **Cost:** one 16k-token Gemini 2.5 Pro generation per week vs one per member per search. At even
  50 members the feed is ~2 orders of magnitude cheaper.
- **Speed on 3G:** the feed is a Postgres read (<1s) vs a ~60s LLM round-trip. FOUNDATION §0 says
  performance is a design feature for this audience.
- **Trust:** "Verified weekly — last checked 18 Jul 2026" is a stronger claim than "AI-powered"
  for a scam-wary audience, and FOUNDATION bans hype badges anyway. Admin spot-checking before
  publish makes the anti-fraud promise real, not aspirational.
- **Auditability:** hallucinated funders get caught by a human before members see them; on-demand
  output goes straight to users.
- **Rate limiting becomes a non-issue** for the main path.

Why keep on-demand at all: niche keyword combinations ("halal fintech Senegal") won't be in a
20-item weekly feed. The deep search covers the long tail, and its results are cached per
(user, keywords) for 7 days so repeats are free.

Implementation is phased so each phase ships independently:

- **Phase A (mandatory):** error-handling fix, subscription centralization, `funding_results`
  cache, TanStack Query + localStorage, Zod validation both sides, rate limit, timeout UX, chips,
  multi-open accordions, restyle, remove `?preview=1`.
- **Phase B (strategic feed):** extend `funding_opportunities` with verification metadata, new
  `refresh-funding-feed` edge function, `AdminFunding` review UI, feed-first member page.

---

## 4. Data / contract changes

### 4.1 Migration 1 — `supabase/migrations/20260721090000_funding_results_cache.sql` (Phase A)

```sql
-- Per-user cache of AI deep-search results. Written only by the aggregate-funding
-- edge function (service role); users read their own rows.
CREATE TABLE public.funding_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords_normalized TEXT NOT NULL,          -- see normalizeKeywords(), §5.2
  keywords_raw TEXT NOT NULL,
  opportunities JSONB NOT NULL,               -- validated Opportunity[] (post-Zod, post-sanitize)
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  UNIQUE (user_id, keywords_normalized)
);

CREATE INDEX funding_results_user_created_idx
  ON public.funding_results (user_id, created_at DESC);  -- rate-limit lookups

ALTER TABLE public.funding_results ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.funding_results TO authenticated;
GRANT ALL ON public.funding_results TO service_role;

CREATE POLICY "Users read their own funding results"
  ON public.funding_results FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies for authenticated: writes are service-role only.

-- Centralization: the SQL function becomes the single server-side subscription rule.
-- The edge function will call it via RPC (service role); RLS policies may also use it.
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated;
-- (Was revoked in 20260713035351; safe to re-grant — SECURITY DEFINER, read-only,
--  and needed by the Phase B feed RLS policy which runs as the querying user.)
```

Design notes: plain table, UUID PK, JSONB payload — trivially portable to Drizzle in plan 07.
No cron cleanup needed initially; the edge function deletes a user's expired rows opportunistically
on each write (`DELETE … WHERE user_id = $1 AND expires_at < now()`).

### 4.2 Migration 2 — `supabase/migrations/20260721090001_funding_feed_verification.sql` (Phase B)

Extend the **existing** `funding_opportunities` table instead of inventing a parallel feed table:

```sql
ALTER TABLE public.funding_opportunities
  ADD COLUMN details JSONB NOT NULL DEFAULT '{}',      -- funder_about, sdg_focus, past_recipients,
                                                       -- application_tips, travel_component,
                                                       -- important_notes (same shape as Opportunity)
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai')),
  ADD COLUMN batch_id UUID,                            -- groups one weekly generation
  ADD COLUMN last_verified_at TIMESTAMPTZ,             -- set by staff on spot-check
  ADD COLUMN verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- The feed is a member benefit: gate published rows behind an active subscription.
-- (Replaces the anon-readable policy from 20260720120000_admin_panel_foundation.sql:218-220.)
DROP POLICY "Public read published funding" ON public.funding_opportunities;
REVOKE SELECT ON public.funding_opportunities FROM anon;
CREATE POLICY "Members read published funding"
  ON public.funding_opportunities FOR SELECT TO authenticated
  USING (
    (status = 'published' AND public.has_active_subscription(auth.uid()))
    OR public.is_staff(auth.uid())
  );
-- "Staff manage funding" (ALL, is_staff) policy from the admin migration stays as is.
```

Weekly AI batches land as `status='draft', source='ai'`; staff publish after spot-check
(`status='published', last_verified_at=now(), verified_by=auth.uid()`). Members see
`last_verified_at` as "Last verified {date}".

After each migration: regenerate `src/integrations/supabase/types.ts` (never hand-edit).

### 4.3 Edge function contracts

`POST functions/v1/aggregate-funding` (modified, Phase A) — request `{ keywords: string }`:

- `200 { opportunities: Opportunity[], cached: boolean, generated_at: string }`
- `401 { error: "unauthorized" }` · `403 { error: "subscription_required" }`
- `429 { error: "rate_limited", message: "You've run several searches recently. Please try again in about an hour — your previous results are saved." }`
- `502 { error: "invalid_ai_output" }` · `504 { error: "timeout" }`

`POST functions/v1/refresh-funding-feed` (new, Phase B) — caller must be staff (checked via
`is_staff` RPC) **or** an internal scheduled invocation carrying the service-role key. Body
`{ keywords?: string }` (defaults to `"African SMEs"`). Generates one batch, validates, inserts
`draft` rows with a shared `batch_id`, returns `{ batch_id, inserted: number }`. Scheduled weekly
(Supabase Dashboard cron / `pg_cron` + `pg_net` — document the chosen mechanism in the function's
README comment; do not silently depend on the dashboard).

---

## 5. File-by-file plan

### Phase A — shared libraries

#### CREATE `src/lib/subscription.ts`
The **single client-side implementation** of the active-subscription rule (mirrors
`has_active_subscription()` SQL; a unit test pins the semantics; cross-reference comment in both):

```ts
export type SubscriptionRow = { has_access: boolean; expires_at: string | null } | null;
export function isSubscriptionActive(sub: SubscriptionRow, now: Date = new Date()): boolean {
  return !!sub?.has_access && (!sub.expires_at || new Date(sub.expires_at) > now);
}
```

Delete the inline checks at `Funding.tsx:91` and (server-side) switch the edge fn to the SQL fn —
after this plan the rule lives in exactly **two** canonical places (SQL for all server checks,
`subscription.ts` for all client display logic), not three ad-hoc copies. Plan 07 collapses to one
(NestJS returns a computed `active` field).

#### CREATE `src/lib/fundingSchema.ts`
Zod schemas + sanitizer, the only source of the `Opportunity` type (delete the hand-written types
at `Funding.tsx:14-32`):

- `sanitizeExternalUrl(raw: unknown): string | null` — `new URL(String(raw))` in try/catch; return
  the href only if `protocol === "http:" || protocol === "https:"`; else `null`. Blocks
  `javascript:`, `data:`, `vbscript:`, relative strings, garbage.
- `RecipientSchema`: `business_name` (trim, 1–200), `founder_name`/`note` (trim, max 300, default
  `""`), `website` = `z.unknown().transform(sanitizeExternalUrl)`.
- `OpportunitySchema`: `title` (1–200), `funder` (1–200), `type` optional enum-ish string max 40,
  `summary` max 1000, `amount` max 100 default `""`, `opens`/`deadline`/`eligibility` max 300,
  `url` = sanitized (nullable — card hides the button if null), `tags` `z.array(z.string().max(40)).max(6).default([])`,
  `funder_about`/`travel_component`/`important_notes` max 1000 optional,
  `sdg_focus` array max 8, `past_recipients` array of `RecipientSchema` max 6 default `[]`,
  `application_tips` array max 8 default `[]`. All strings `.trim()`.
- `parseOpportunities(input: unknown): Opportunity[]` — expects `{ opportunities: unknown[] }`,
  `safeParse`s **each item**, drops invalid items (log count), caps at 30. Empty array is a valid
  result (renders `<EmptyState variant="search">`), but callers treat "input not an object /
  missing array" as an error.
- `normalizeKeywords(raw: string): string` — lowercase, trim, strip to `[a-z0-9\s-]`, collapse
  whitespace, split, sort tokens, join with single space, cap 200 chars. Used identically for
  cache keys on client and server.

#### CREATE `supabase/functions/_shared/fundingSchema.ts`
Deno copy of the above (import `npm:zod@3`). Edge functions cannot import from `src/`; keep the
two files byte-similar with a header comment `// MIRROR of src/lib/fundingSchema.ts — change both`.
Plan 07 removes this duplication when NestJS owns aggregation.

#### CREATE `src/lib/fundingCache.ts`
localStorage layer (survives full reloads and lets a returning user see last results instantly on
3G before any network):

- Key: `` `sua:funding:v1:${userId}` `` → `{ keywordsRaw, keywordsNormalized, opportunities, generatedAt }`.
- `readFundingCache(userId)` / `writeFundingCache(userId, entry)` / `clearFundingCache(userId)` —
  all wrapped in try/catch (quota, private mode, JSON errors ⇒ no-op/null). On read, re-run
  `parseOpportunities` over the stored payload (never trust storage either).
- `clearFundingCache` is called from `signOut` in `src/hooks/useAuth.tsx` (one-line addition —
  coordinate with plan 02, which owns that file).

### Phase A — hooks (TanStack Query wiring; provider already mounted in `src/App.tsx:43`)

#### CREATE `src/hooks/useSubscription.ts`
```ts
useQuery({
  queryKey: ["subscription", user.id],
  enabled: !!user,
  retry: 2,
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("subscriptions")
      .select("has_access, expires_at").eq("user_id", user.id).maybeSingle();
    if (error) throw error;          // <-- the §2.1 fix: errors become isError, never "no access"
    return data;                      // null row (shouldn't happen; trigger creates it) = inactive
  },
})
```
Exposes `{ status: "loading" | "error" | "active" | "inactive", refetch }` where
`active = isSubscriptionActive(data)`. **This hook is the only place the client reads
`subscriptions`** — plan 06 (billing UI) and plan 03 (dashboard) must consume it too.

#### CREATE `src/hooks/useFunding.ts`
- `useFundingResult(userId)` — `useQuery({ queryKey: ["funding","result",userId], staleTime: Infinity, gcTime: 24h })`
  reading the user's **most recent unexpired** `funding_results` row directly via supabase
  (`.select().eq("user_id", userId).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1)`),
  validating with `parseOpportunities`. `initialData` from `readFundingCache(userId)` when fresh.
  This is what makes results survive navigation: the query cache holds them in-session, the table +
  localStorage across sessions.
- `useGenerateFunding()` — `useMutation` calling
  `supabase.functions.invoke("aggregate-funding", { body: { keywords } })` with an
  `AbortController` hard-stopped at 90s client-side. On success: validate, then
  `queryClient.setQueryData(["funding","result",userId], …)` + `writeFundingCache(...)`. Maps
  server error codes to plain-language messages (`rate_limited` shows the friendly 429 message,
  `timeout` offers retry). Double-submit: the UI disables on `isPending` **and** the mutation fn
  early-returns if already pending.
- Phase B adds `useFundingFeed()` — `useQuery({ queryKey: ["funding","feed"], staleTime: 5 * 60_000 })`
  selecting published `funding_opportunities` ordered by `featured DESC, last_verified_at DESC NULLS LAST`,
  mapping `details` JSONB + columns into `Opportunity` via the same schema.

#### CREATE `src/hooks/useMyProfile.ts`
`useQuery({ queryKey: ["profile","me",userId] })` → own `profiles` row
(`sector, country, keywords, business_name`). Shared with plan 03 (dashboard) — whichever plan
lands first creates it; the other consumes it. Errors here are non-fatal for /funding (chips fall
back to generic suggestions).

### Phase A — edge function

#### MODIFY `supabase/functions/aggregate-funding/index.ts`
In order:

1. Keep JWT-scoped anon client for `auth.getUser()`. Add a service-role client
   (`Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` — provided automatically to hosted functions) for
   cache + rate-limit + RPC.
2. Replace the inline check at `:23-25` with
   `serviceClient.rpc("has_active_subscription", { _user_id: user.id })` → `403 subscription_required`
   when false. (Centralization: the SQL fn is now the server-side rule.)
3. `keywords_normalized = normalizeKeywords(body.keywords)` (from `_shared/fundingSchema.ts`).
4. **Cache check:** select `funding_results` where `user_id` + `keywords_normalized` +
   `expires_at > now()`. Hit ⇒ return `{ opportunities, cached: true, generated_at: created_at }`
   immediately — no model call, no bill.
5. **Rate limit:** `count(*) FROM funding_results WHERE user_id = $1 AND created_at > now() - interval '1 hour'`;
   `>= 3` ⇒ `429 rate_limited` (cache hits in step 4 never reach this, so repeats are always free).
6. Gateway fetch unchanged except `signal: AbortSignal.timeout(60_000)`; catch `TimeoutError` ⇒
   `504 timeout`.
7. Replace the trusting parse at `:90-94` with `parseOpportunities` from `_shared/fundingSchema.ts`.
   Zero valid items from a non-empty model response ⇒ `502 invalid_ai_output`.
8. Opportunistic cleanup (`DELETE … expires_at < now()` for this user), then
   `upsert({ user_id, keywords_normalized, keywords_raw, opportunities, expires_at: +7d }, { onConflict: "user_id,keywords_normalized" })`.
9. Return `{ opportunities, cached: false, generated_at: new Date().toISOString() }`.

### Phase A — UI

#### REWRITE `src/pages/Funding.tsx` (thin orchestrator, ~120 lines)
State machine, in priority order:

1. `authLoading` ⇒ `<FundingSkeleton />` (page-level, from plan 01 primitives).
2. No user ⇒ redirect `/auth?next=/funding` (unchanged).
3. `useSubscription().status === "loading"` ⇒ `<FundingSkeleton />`.
4. `status === "error"` ⇒ **`<ErrorState title="We couldn't confirm your membership" message="This is a connection problem on our side or yours — your subscription is unaffected. Please retry." onRetry={refetch} />`** — the paywall is unreachable from this branch. This is the trust-critical acceptance test.
5. `status === "inactive"` ⇒ `<FundingPaywall />`.
6. `status === "active"` ⇒ feed/search view.

Delete entirely: `isPreview` / `params.get("preview")` (`:71-72`), the `useSearchParams` import,
the preview branches at `:82,87,97-101`, and `SAMPLE_OPPS` from this file (it moves into
`FundingPaywall`). `?preview=1` becomes a no-op (§3 item 15 resolved).

#### CREATE `src/components/funding/FundingPaywall.tsx`
Extracted from `Funding.tsx:121-171`, restyled (navy card, orange CTA, no gold/forest):
- Keeps the fraud-warning + acknowledgement checkbox flow verbatim (the copy is good).
- Adds a clearly labeled preview: 2 `SAMPLE_OPPS` cards (moved here, rendered with
  `<OpportunityCard sample />` showing a neutral "Example" badge and `important_notes` explaining
  it's sample data) — this replaces the `?preview=1` job honestly.
- CTA: `<Button size="lg" asChild><Link to="/#pricing">…` — depends on the hash-scroll handler
  (plan 02 `<ScrollToTop/>` + hash handling); plan 06 will repoint this at real checkout with
  `?next=/funding` return. Note both dependencies in a comment.

#### CREATE `src/components/funding/FundingSearch.tsx`
- Labeled `<Input>` (`<label htmlFor>` — fixes placeholder-only labeling, IMPROVEMENTS §6) +
  primary "Find opportunities" button.
- **Suggestion chips** (tappable, `rounded-full`, `--secondary` bg, ≥44px touch target): built
  from `useMyProfile()` — `[`${sector} ${country}`, `${sector} grant`, `SME accelerator ${country}`,
  ...profile.keywords.slice(0, 3)]`, deduped, max 6; fallback when no profile:
  `["agriculture Nigeria", "women-led fintech", "climate grant Africa", "tech fellowship"]`.
  Tapping a chip fills the input (never auto-fires the paid generation); user confirms with the
  button.
- Progress: while `isPending`, button disabled with static label "Curating…", copy under the bar:
  "**This takes about a minute** — we're checking dozens of funders." switching at 45s to
  "Still working — thanks for your patience."; wrap status text in `aria-live="polite"`. The
  results area shows **3 × `<OpportunityCardSkeleton>`** (not a button spinner — IMPROVEMENTS §4).
- Shows "Results saved {relative time} · cached for 7 days" line when rendering a cached result,
  with a "Search again" affordance.

#### CREATE `src/components/funding/OpportunityCard.tsx` + `OpportunityCardSkeleton.tsx`
- Card extracted from `Funding.tsx:220-325`, restyled: `rounded-xl`, `--border` + `--shadow-soft`,
  Sora (`font-display`) title, type badge `--secondary`, amount badge orange-tinted
  (`bg-primary/10 text-primary-dark`), no gold/forest classes, no serif class.
- Props: `{ opportunity, open, onToggle, sample?: boolean }`. Expansion is **controlled by the
  parent with a `Set<string>`** (key = feed row `id`, or `` `${title}|${funder}` `` for AI results)
  so **multiple cards stay open simultaneously** (IMPROVEMENTS §4 comparison; replaces
  `expanded === i`). "Learn more" button gets `aria-expanded` + `aria-controls` on the details
  region. No separate compare view in this plan — multi-open is the accepted resolution; note a
  possible future compare table.
- Links: `Visit funder site` and recipient `website` render **only when the sanitized URL is
  non-null** (schema guarantees http/https by then — the card never receives raw model URLs).
  Keep `target="_blank" rel="noopener noreferrer"`; use `<Button asChild><a …>` (no
  `<a><Button/></a>` nesting).
- Skeleton: shadcn `Skeleton` lines matching the card layout; no shimmer under
  `prefers-reduced-motion` (plan 01 primitive rules).

#### Page shell / restyle (within `Funding.tsx`)
- Header: navy panel (`bg-navy` / FOUNDATION navy gradient allowed for dark hero), `<PageHeader>`
  pattern, **delete** the Sparkles "AI-powered" pill (`:180-182`) and `.text-gradient-gold`
  (`:183-185`). Reframe copy for Phase A: "Funding opportunities for African SMEs — every result
  links to the funder's own site. Never pay to apply."; Phase B adds "Verified weekly · last
  checked {max(last_verified_at)}".
- Keep the fraud-reminder banner (`:191-196`) restyled with `--warning` tokens.
- Empty result (0 opportunities after a successful call): `<EmptyState variant="search">` with
  "No matches for those keywords — try broader terms" + the suggestion chips again.
- Generation/network error: `<ErrorState>` with Retry re-invoking the mutation (distinct from the
  subscription ErrorState in step 4).
- `aria-live="polite"` region announcing "N opportunities found".

### Phase B — feed

#### CREATE `supabase/functions/refresh-funding-feed/index.ts`
Service-role function: verify caller is staff (`is_staff` RPC on the JWT user) or the scheduled
invocation; run the same system/user prompt as `aggregate-funding` (extract the prompt strings
into `supabase/functions/_shared/fundingPrompt.ts` so both functions share them); validate via
`_shared/fundingSchema.ts`; insert rows into `funding_opportunities` with
`status='draft', source='ai', batch_id=crypto.randomUUID()`, mapping scalar fields to columns and
the rich fields into `details`. Returns `{ batch_id, inserted }`.

#### MODIFY `src/pages/admin/AdminFunding.tsx` (replace the stub)
- "Generate weekly batch" button → invokes `refresh-funding-feed` (with the ~60s expectation UX).
- Table of latest-batch drafts: title, funder, url (rendered as a plain outbound link for manual
  checking), deadline; row actions **Publish** (`status='published', last_verified_at=now(), verified_by=user.id`),
  **Hide** (`status='archived'`), inline edit of `deadline`/`amount`/`url`. Also lists currently
  published items with "Re-verify" (bumps `last_verified_at`) and "Unpublish".
- Uses TanStack Query + existing admin styling; staff-only via existing `AdminGuard`.

#### MODIFY member page for feed-first
`Funding.tsx` (active state): render `useFundingFeed()` results by default with the
"Last verified" line per card (from `last_verified_at`). The keyword box becomes: (1) instant
client-side filter over the feed (match against title/funder/tags/summary), and (2) an
"AI deep search" button (secondary variant) for the long tail, which invokes the Phase A
mutation path unchanged. Feed loading ⇒ card skeletons; feed error ⇒ `<ErrorState>`; empty feed
(pre-first-batch) ⇒ fall back to the deep-search-first layout so Phase A behavior is preserved.

---

## 6. Dependencies & seams

| Plan | Relationship |
|---|---|
| **01 design system** | Provides `<ErrorState>`, `<EmptyState>`, `<CardSkeleton>`, `<PageHeader>`, tokens. If 01 hasn't landed, create these primitives here under `src/components/common/` exactly per FOUNDATION §2 (do not fork alternatives). |
| **02 auth** | Hash-scroll for the `/#pricing` CTA; auth-aware `<AppHeader>` replaces the "Back home" link; `signOut` calls `clearFundingCache`. |
| **03 dashboard** | Consumes `useSubscription`, `useMyProfile`, and may surface the funding feed teaser — import from the files created here. |
| **06 payments** | Owns flipping `has_access` and repoints `FundingPaywall`'s CTA to checkout with a `?next=/funding` return path. **The gate itself (`useSubscription` + `isSubscriptionActive` + SQL fn) is defined here and must not be reimplemented in 06.** |
| **07 NestJS + Drizzle** | Target owner of funding aggregation: `GET /funding/feed`, `POST /funding/search` (moves prompt, Zod schema, cache read/write, rate limit out of the Deno functions — eliminating the `_shared` schema duplication). `funding_results` and the `funding_opportunities` extensions are deliberately plain tables for Drizzle. The weekly cron moves to a Nest `@Cron` job. Keep all validation/sanitization logic in schema files (not inlined) to make the port mechanical. |

New packages: **none** (TanStack Query and zod are already installed; localStorage layer is
hand-rolled, no `query-sync-storage-persister` dependency).

---

## 7. Test plan (Vitest + Testing Library, per FOUNDATION §4)

1. `src/lib/subscription.test.ts` — `isSubscriptionActive`: null row → false; `has_access=false` →
   false; `has_access=true, expires_at=null` → true; future `expires_at` → true; past → false;
   boundary (`expires_at === now`) → false.
2. `src/lib/fundingSchema.test.ts` —
   - `sanitizeExternalUrl`: `https://x.com` ok; `http://x.com` ok; `javascript:alert(1)` → null;
     `JaVaScRiPt:alert(1)` → null; `data:text/html,…` → null; `//evil.com` → null; `foo` → null;
     non-string → null.
   - `parseOpportunities`: item with `javascript:` url survives with `url: null`; item missing
     `title` dropped while siblings survive; >30 items capped; non-object input rejected.
   - `normalizeKeywords`: `"  FinTech,  Nigeria "` === `"nigeria fintech"` (order-insensitive,
     case-insensitive, punctuation-stripped).
3. `src/pages/Funding.test.tsx` (mock supabase client + hooks) — the three gate branches:
   - **error-not-paywall (trust-critical):** subscription query rejects ⇒ ErrorState with Retry
     rendered; asserts `queryByText(/members only/i)` is null; Retry triggers refetch.
   - subscription `{ has_access: false }` ⇒ paywall rendered, no search UI.
   - active subscription ⇒ search UI rendered, no paywall.
4. `src/components/funding/OpportunityCard.test.tsx` — two cards can be open at once; card with
   `url: null` renders no "Visit funder site" link; `aria-expanded` toggles.
5. `src/hooks/useGenerateFunding` (unit, mocked invoke) — second call while pending is a no-op;
   `rate_limited` error surfaces the friendly message.
6. Manual/staging checklist: cached repeat search returns without model call (`cached: true`);
   4th generation in an hour returns 429 message; kill network mid-subscription-fetch on a
   subscribed account ⇒ ErrorState (never paywall); reload after search ⇒ results still present.

---

## 8. Acceptance criteria

- [ ] A subscriber whose `subscriptions` fetch fails sees an error + Retry — **the paywall is
      impossible to reach from a fetch error** (automated test #3).
- [ ] The active-subscription rule exists in exactly two canonical places —
      `has_active_subscription()` (all server checks, incl. the edge fn via RPC) and
      `src/lib/subscription.ts` (all client checks) — with cross-referencing comments; no other
      inline copies remain.
- [ ] Navigating away from `/funding` and back (and a full reload) shows the last results with a
      "saved {time} ago" note; no new Gemini call is made (verify via `cached: true` / network tab).
- [ ] Re-submitting identical keywords within 7 days returns the cached result server-side (no
      model bill); `funding_results` rows expire per TTL.
- [ ] No model-supplied string reaches an `href` without passing `sanitizeExternalUrl`;
      `javascript:` URLs render no link at all (tests #2, #4).
- [ ] 4th distinct generation within an hour → friendly 429; gateway call aborts at 60s server-side
      (504) and 90s client-side, both with a Retry UX.
- [ ] During generation: skeleton cards + "This takes about a minute" copy + `aria-live` updates;
      the trigger button cannot double-fire.
- [ ] Keyword chips derived from the member's profile (sector/country/keywords) appear and fill the
      input; sensible defaults when no profile exists.
- [ ] Multiple opportunity cards can be expanded simultaneously.
- [ ] `?preview=1` no longer exists; the paywall shows clearly-labeled sample cards instead.
- [ ] Zero `gold`/`forest`/`text-gradient`/Sparkles-pill/serif classes on the funding surfaces;
      page passes FOUNDATION §1.4 anti-slop and AA contrast; reduced-motion respected in skeletons.
- [ ] Phase B: members see the shared feed with "Last verified {date}" per item; `AdminFunding`
      can generate, spot-check, publish, hide, and re-verify; published feed rows are unreadable
      by `anon` and by members without an active subscription (RLS test via SQL).
- [ ] `npm run build`, `npm run lint`, `npm test` green.

---

## 9. Ordered implementation checklist

**Phase A**
1. [ ] Migration `20260721090000_funding_results_cache.sql`; apply; regenerate
       `src/integrations/supabase/types.ts`.
2. [ ] `src/lib/subscription.ts` + `subscription.test.ts`.
3. [ ] `src/lib/fundingSchema.ts` + `fundingSchema.test.ts`; mirror to
       `supabase/functions/_shared/fundingSchema.ts`.
4. [ ] `src/lib/fundingCache.ts`.
5. [ ] `src/hooks/useSubscription.ts`, `src/hooks/useMyProfile.ts`, `src/hooks/useFunding.ts`.
6. [ ] Edge fn rewrite per §5 (RPC subscription check, cache read, rate limit, 60s timeout, Zod
       parse, cache upsert); deploy; verify `cached: true` on repeat.
7. [ ] Components: `OpportunityCard` + skeleton, `FundingSearch`, `FundingPaywall` (absorbing
       `SAMPLE_OPPS`, deleting preview mode).
8. [ ] Rewrite `src/pages/Funding.tsx` state machine (error ≠ paywall) + restyle to FOUNDATION.
9. [ ] `Funding.test.tsx` gate tests + `OpportunityCard.test.tsx`; full manual checklist §7.6.

**Phase B**
10. [ ] Migration `20260721090001_funding_feed_verification.sql` (columns + member-gated RLS);
        regenerate types.
11. [ ] Extract prompts to `_shared/fundingPrompt.ts`; create `refresh-funding-feed` fn; wire the
        weekly schedule and document it.
12. [ ] Implement `src/pages/admin/AdminFunding.tsx` review/publish UI.
13. [ ] `useFundingFeed()` + feed-first member layout with client-side filter and
        "Last verified" dates; demote AI search to secondary action.
14. [ ] Generate first real batch, staff spot-check, publish; confirm anon/non-member RLS denial.
