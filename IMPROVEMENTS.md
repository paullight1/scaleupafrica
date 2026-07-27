# Cresciva — UI / UX / Functionality Improvement Plan

Review date: 2026-07-17 · Method: dual-assessment (design-director review + deterministic anti-pattern scan) · Design health score: **21/40** (Acceptable — significant improvements needed)

Severity: **P0** = blocks the core task, fix immediately · **P1** = major, fix before launch · **P2** = minor, next pass · **P3** = polish.

---

## 1. Critical (P0)

### 1.1 The paid funnel is a closed loop — nobody can ever pay
- `src/pages/Funding.tsx:162` paywall CTA → `Link to="/#pricing"`, but no hash-scroll handler exists, so it lands at the top of the landing page.
- `src/components/landing/Pricing.tsx:195` CTA → `/auth?next=/directory/create` → the profile form. No checkout anywhere.
- `subscriptions.has_access` is service-role-write-only (by design), but there is no path — payment, instructions, or contact — for a user to get it flipped.
- Copy actively over-promises: "Immediate access to all features on join" (`Pricing.tsx:220`), "our payment processor supports major cards and mobile money" (`FAQ.tsx:33`). To a scam-wary audience, promised instant paid access with no working rail is the scam fingerprint.
- **Fix:** until a processor (Paystack/Flutterwave are the obvious fits for cards + mobile money in Africa) is integrated, ship an honest concierge flow: "Pay via mobile money or bank transfer — message us on WhatsApp, access activated within X hours." Fix the paywall CTA to actually reach pricing (scroll-to-hash handler or inline pricing on /funding). Remove every claim the product can't honor.

### 1.2 No sign-out and no authenticated navigation
- `signOut` in `src/hooks/useAuth.tsx:40-42` has **zero call sites**.
- The only header (`src/components/landing/Header.tsx`) exists on the landing page and always shows "Sign in / Get started" even when logged in. Directory/Funding/CreateProfile have only a "Back" link.
- On shared/family Android devices (common for this audience) the inability to log out is a safety issue.
- **Fix:** a persistent app header across all routes with auth-aware state (avatar/menu: My profile, Funding, Sign out).

---

## 2. Major (P1)

### 2.1 Swallowed errors produce lying UI
- `src/pages/Directory.tsx:33-38` destructures only `{ data }` — a network failure renders "No profiles yet. Be the first to list your business."
- `src/pages/Funding.tsx:90-93` ignores the subscription-fetch error — a **paying member on a flaky connection is shown the paywall** ("they took my money and locked me out" is the exact scam narrative to never perform).
- `src/pages/CreateProfile.tsx:64` ignores the existing-profile load error → form silently behaves as "create" → submit hits the unique `user_id` constraint → raw Postgres error toast.
- **Fix:** handle `error` on every fetch; render a distinct retry state, never an empty/paywall state, on failure.

### 2.2 AI funding results are ephemeral and expensive
- Results live in component state only (`Funding.tsx:75`); any navigation destroys them; a re-run costs another full Gemini 2.5 Pro 16k-token generation (`supabase/functions/aggregate-funding/index.ts:72-79`) and another ~minute on the user's data plan.
- No caching client- or server-side; no rate limiting beyond upstream 429s — one enthusiastic user can hammer a frontier model.
- **Fix:** persist results (localStorage + a `funding_results` table keyed by user/keywords with TTL); wire TanStack Query (installed, unused for this). Strategic option: replace per-user on-demand generation with a weekly cached, spot-checked feed shared by all members ("verified weekly" is a stronger trust claim than "AI-powered", and far cheaper/faster on 3G).

### 2.3 WCAG AA contrast failures + no reduced-motion support
- `text-gold` on light backgrounds ≈ **2.0:1** (`Solution.tsx:44`, `FAQ.tsx:63`); `text-gold-dark` on `bg-secondary` ≈ **3.1:1** (`Problem.tsx:36`, `Pricing.tsx:135`); `text-primary-foreground/60` ≈ 4.1:1 (`Hero.tsx:79`); footer `/40` copyright ≈ **2.4:1** (`Footer.tsx:56`). AA requires 4.5:1 for body text.
- framer-motion animates every section with no `prefers-reduced-motion` handling (the only reduced-motion CSS is in dead, never-imported `App.css`).
- **Fix:** darken gold for on-light text (or reserve gold for dark backgrounds), raise opacity floors to /70+, wrap the app in `<MotionConfig reducedMotion="user">`.

### 2.4 Mobile menu "Sign in" button is invisible
- `Header.tsx:81` uses `variant="outline"` (forest-green text/border) inside the `bg-primary` forest-green mobile drawer (`Header.tsx:67`). Primary audience, primary auth entry, unreadable.
- **Fix:** use a light/inverted variant inside the dark drawer.

### 2.5 Auth flow gaps
- `Auth.tsx:41-47` toasts "Account created. You're signed in." unconditionally after `signUp` — false if email confirmation is enabled (no session, no redirect, no "check your inbox").
- **No forgot-password flow anywhere** — a founder who forgets their password is permanently locked out.
- Raw Supabase error strings surfaced to users (`Auth.tsx:57`).
- **Fix:** handle the confirmation-required branch, add password reset (`supabase.auth.resetPasswordForEmail`), map errors to plain language.

---

## 3. Functionality gaps & bugs (full list)

| # | Issue | Where | Severity |
|---|---|---|---|
| 1 | No payment flow (see 1.1) | Pricing.tsx, Funding.tsx | P0 |
| 2 | No sign-out UI (see 1.2) | useAuth.tsx:40 | P0 |
| 3 | Hash-anchor links never scroll cross-page (`/#pricing`, `/#solution`); no ScrollToTop on route change | Funding.tsx:162, Header.tsx:8-12, App.tsx | P1 |
| 4 | Silent fetch failures → wrong states (see 2.1) | Directory.tsx:33, Funding.tsx:90, CreateProfile.tsx:64 | P1 |
| 5 | AI results not cached/persisted; no server-side rate limit (see 2.2) | Funding.tsx:75, edge fn | P1 |
| 6 | AI output unvalidated: items rendered straight from model JSON; `o.url` → `href` unfiltered (`javascript:` URLs possible) | index.ts:92-94, Funding.tsx:315 | P1 |
| 7 | No profile detail page — `long_description`, `whatsapp`, `twitter`, `founder_photo_url` are collected but **rendered nowhere** in the app | Directory.tsx:34-35, App.tsx routes | P1 |
| 8 | Directory ceiling: hard `limit(200)` newest-first + client-side substring filter — business #201 is unsearchable forever; no pagination, no server-side search; `keywords TEXT[]` column never written or queried | Directory.tsx:37,43-52 | P1 |
| 9 | No forgot-password; signup toast lies under email confirmation (see 2.5) | Auth.tsx | P1 |
| 10 | Public phone/email/WhatsApp scrapeable at `anon` level (RLS `SELECT USING (true)` on full row) and rendered as plain `mailto:`/`tel:` | migration 1, Directory.tsx:146-155 | P1 |
| 11 | Zod messages are bare "Required" — toast gives no field name among 15 fields; `website` not URL-validated | CreateProfile.tsx:23,96,29 | P2 |
| 12 | Orphaned storage files: replaced/removed images never deleted; "Remove" doesn't persist until Save with no indication | ImageUploadCrop.tsx:58-88 | P2 |
| 13 | Image crop ignores EXIF orientation — many Android photos upload rotated | ImageUploadCrop.tsx:20-32 | P2 |
| 14 | Dead legal links: Terms / Privacy / Contact are `href="#"` on a site asking for money and personal data | Footer.tsx:51-53 | P1 (trust) |
| 15 | `?preview=1` query param bypasses paywall shell (sample data only, but confusing if shared) | Funding.tsx:72-86 | P3 |
| 16 | No unsaved-changes guard on the 15-field profile form | CreateProfile.tsx | P2 |
| 17 | No double-submit protection story for the ~60s AI call beyond `disabled`; no timeout/retry UX | Funding.tsx:104-115 | P2 |
| 18 | Hardcoded FX pricing table will drift (volatile NGN/EGP); "Eurozone" as fake country code | Pricing.tsx:23-113 | P2 |
| 19 | Dead code: `App.css` never imported, `NavLink.tsx` unused, duplicate `Toaster`+`Sonner` mounted, `has_active_subscription()` SQL fn never called | App.tsx:19-20 etc. | P3 |

---

## 4. UX improvements

- **Post-publish payoff:** after "Publish to directory", show the founder **their own profile** ("here's what the world sees"), not the top of the full directory list (`CreateProfile.tsx:107`).
- **Profile as shareable asset:** add `/directory/:slug` with OG tags — every member becomes a distribution channel (WhatsApp status, Instagram bio). This is the growth loop.
- **Pre-seed funding search** from the user's profile (sector, country, keywords) instead of asking non-technical founders to invent "keywords" (`Funding.tsx:202`). Offer tappable suggestion chips ("agriculture Nigeria", "women-led fintech").
- **Paywall → payment journey:** currently 4 context switches with no return path to /funding. Keep the user in one place; after subscribing, return them to what they wanted.
- **Directory filters:** country + sector filter chips (structured data already exists) instead of one free-text box; server-side search.
- **Set expectations on the AI call:** "This takes about a minute" + skeleton cards, not a button spinner (`Funding.tsx:207`).
- **Trust at the data-sharing moment:** CreateProfile publishes personal phone/WhatsApp publicly with one passive sentence (`CreateProfile.tsx:122-124`). Add per-field "public" indicators, a preview step, and "you can remove this anytime". Consider making contact fields opt-in/obscured (e.g., "Show contact" interaction) to reduce scraping.
- **Returning-user experience:** logged-in users still land on the marketing page with "Sign in / Get started". Design for the 100th visit: route or adapt the header to "My profile / Funding feed".
- **Wall of options:** Pricing country selector is a 90-option non-searchable Select (`Pricing.tsx:148-159`) — auto-detect via locale or make it searchable/grouped. CreateProfile country (55) / sector (25) native selects: acceptable on mobile but consider search.
- **Funding comparison:** one-at-a-time accordion (`expanded === i`) forces memory when comparing two opportunities — allow multiple open or a compare view.
- **NotFound page** is unbranded default grays with a `console.error` left in — brand it and offer routes back.

## 5. UI / visual design (anti-slop pass)

The detector + review agree the visual layer reads AI-generated. Tells to remove:

- **Gradient text everywhere:** `.text-gradient-gold` (`index.css:140-144`) on the hero headline, Problem closer, Footer CTA, and even product-register h1s (`Directory.tsx:62`, `Funding.tsx:184`). Replace with solid gold-dark or ink; emphasis via weight/size.
- **Uppercase tracked eyebrow kicker** above every section (`Problem.tsx:36`, `Solution.tsx:44`, `Pricing.tsx:135`, `FAQ.tsx:63`) — the saturated AI scaffold. Keep at most one as a deliberate system; vary section openers otherwise.
- **Sparkles-pill badges** (`Hero.tsx:27-30`, `Funding.tsx:180-182`) — the most recognizable AI-landing motif; also "AI-powered" hype conflicts with the trustworthy/never-hypey brand. Cut or replace with a concrete proof point.
- **Identical icon-card grids** (`Problem.tsx:49-70`, repeated tile style in `Solution.tsx:67-69`) — vary structure: numbers, quotes, real founder photos, stats.
- **Uniform scroll-fade on ~14 blocks** (`opacity:0, y:30` whileInView everywhere) — motion should fit what it reveals; most sections need none.
- **Fonts:** Playfair Display + Inter is the stock "premium" pairing, flagged by the detector (`index.css:131`), loaded in 10 weights via render-blocking `@import`. Pick a more distinctive pairing (or one strong family), subset weights, self-host or `preconnect`.
- **Template copy:** "Scale Your Business With Intent. Access Capital With Clarity.", "Two Tools. One Growth Engine.", "move the needle" — rewrite in the Disclaimer's voice (see §7).
- `hover:scale-105` CTA, pricing corner ribbon + star (`Pricing.tsx:171-176`): template bingo; tone down.
- Keep and build on: the coherent forest/gold HSL token system, semantic shadows, and dark theme (`index.css:12-121`) — the foundation is good; it's the applied patterns that are generic.

## 6. Accessibility (WCAG 2.1 AA)

- Contrast fixes per 2.3 (gold-on-light ≈2.0:1, footer /40 ≈2.4:1, etc.).
- `<MotionConfig reducedMotion="user">` around the app.
- Mobile menu toggle: add `aria-label` + `aria-expanded` (`Header.tsx:53-58`).
- Search inputs (`Directory.tsx:70-75`, `Funding.tsx:199-205`): placeholder-only labeling → add labels/`aria-label`.
- "Learn more" expanders: `aria-expanded`/`aria-controls` (`Funding.tsx:248-254`).
- `aria-live` region for loading/results/empty state changes; toasts alone aren't announced reliably.
- Focus management on SPA route change (focus reset + skip link).
- Associate the zoom `label` with the Slider in the crop dialog (`ImageUploadCrop.tsx:104-105`).
- Decorative hero image should be `alt=""` (`Hero.tsx:13`).
- Replace `<Link><Button/></Link>` nesting with shadcn `asChild` throughout.
- Touch targets ≥44px: directory card `text-xs` contact links (`Directory.tsx:140-156`), footer links.

## 7. Content & trust

- **`index.html` is still fully Lovable-branded** — `<title>Lovable App</title>`, Lovable OG image, `@Lovable` twitter card, scaffold TODOs (`index.html:7-19`). Every WhatsApp share shows "Lovable App". Replace with real title, description, OG image; set `document.title` on Auth and landing too.
- Real Terms, Privacy, and Contact pages (currently `href="#"`).
- Company identity on the site (registration, contact, team) — for a scam-skeptical audience, anonymity is disqualifying, especially at ₦95,000/year.
- Remove claims the product can't honor (instant access, payment processor) until true.
- Lead with the honest voice: the Disclaimer/anti-fraud copy is the most distinctive, least-AI material in the product — consider making radical anti-hype honesty the identity instead of gold gradients.
- Surface the fraud warnings higher; they currently sit below the fold-stack.

## 8. Performance (mobile-first, 3G reality)

- Route-level code splitting with `React.lazy` — landing bundle currently ships `react-easy-crop`, funding UI, framer-motion to every visitor (`App.tsx` eager imports).
- Landing header uses raw `<a href>` for `/directory` and `/funding` (`Header.tsx:38-44`) → **full document reloads**; use `<Link>`.
- Hero image: 253KB decorative JPG at 30% opacity (`Hero.tsx:11-15`) → compress/resize to ≤60KB, responsive `srcset`, or replace with a gradient.
- Fonts: render-blocking `@import` of 10 weights (`index.css:5`) → subset to 3–4 weights, `preconnect`/self-host, `font-display: swap`.
- Content gated behind `opacity: 0` JS animation → ensure content is visible without JS/paused animation (headless/slow devices see a green void).

## 9. Code hygiene (P3)

- Delete unused `App.css`, `NavLink.tsx`; unmount the unused shadcn `Toaster` (keep sonner).
- Remove or call the dead `has_active_subscription()` SQL function; the subscription-validity rule is currently triplicated (SQL fn, edge fn, Funding.tsx) — centralize.
- Remove `console.error` from NotFound; clean stray blank lines (`Funding.tsx:189-190`).
- Add tests beyond the single example test — the paywall gate, profile upsert, and directory filter are the obvious first targets.

---

## 10. Strategic questions worth deciding before building

1. Should the manual/concierge subscription be the *brand* (human WhatsApp onboarding, mobile money) rather than a gap to hide until Stripe-style checkout exists?
2. Should funding data be a weekly cached, spot-checked feed (cheap, fast, auditable, "last verified" dates) instead of per-user on-demand LLM generation?
3. Is the founder profile page the actual growth engine (shareable `/directory/:slug` with OG tags), and should it be prioritized above everything except payments?
4. Who is the home page for — the 1st visit or the 100th? What do returning members land on?
