# Dark-first marketing redesign — Phase 0 + Phase 1

**Date:** 2026-07-27
**Status:** Approved design, ready for implementation planning
**Scope:** Design system (Phase 0) + homepage and disclaimer (Phase 1)
**Branch:** `overhaul/hubspot-theme-dashboard-backend`

---

## 1. Problem

The Cresciva homepage under-converts. Six sections on a white canvas, no imagery, no
social proof, no numbers, and no view of either product the site is selling. Three
concrete defects:

1. **The product is never shown.** The page sells a directory and a funding tool without
   a single screenshot of either. Visitors are asked to pay for something they have not
   seen.
2. **The disclaimer creates doubt before pricing.** `landing/Disclaimer.tsx` is a
   five-point warning block — alert-triangle icon, numbered list — positioned immediately
   *before* `Pricing`. It raises objections at the exact moment the visitor is deciding.
3. **The page is a wall.** A 72px two-line hero pushes the CTAs down, and a nine-item
   FAQ closes the page. There is no proof, no rhythm, and no reason to scroll.

The brand also reads as generic. The palette is correct but timid — orange appears
rarely and never on a surface dark enough to make it land.

## 2. Goals

- A dark-first homepage: deep navy canvas, bright orange as the only accent.
- Add the missing conversion sections — stats, logos, product previews, testimonials,
  blog teaser, closing CTA.
- Move the disclaimer off the conversion path without hiding it.
- Reduce the hero's visual weight so the CTAs sit above the fold.
- Trim the homepage FAQ without losing any answer.
- Leave the rest of the app visually untouched in this phase.

### Non-goals

- No redesign of `/about`, `/contact`, `/directory`, `/funding`, `/blog`, `/resources`,
  or the auth shells. Those are Phases 2–5 (§10).
- No dark mode for the authenticated app, dashboard, or admin panel.
- No new backend tables, migrations, or admin CMS screens.
- No change to subscription, payment, or auth logic.

## 3. Decisions taken

| Decision | Choice |
|---|---|
| Dark scope | Dark-first **homepage only**; rest of app stays light |
| Orange | Brighter `#FF6B2C`, replacing `#FF7A59` **globally** |
| Hero | Same copy, reduced type scale |
| Content source | One scaffolded file, `Frontend/src/content/homepage.ts` |
| Disclaimer UI | Two-column "what we do / what we don't" + own page |
| Delivery | Phase 0 + Phase 1 in this spec; Phases 2–5 follow |

---

## 4. Phase 0 — Design system

### 4.1 The orange change

`--primary` moves from `#FF7A59` (hsl 11 100% 68%) to `#FF6B2C` (hsl 18 100% 59%).

This is a **global brand change**. `--primary` is consumed by the Frontend, the
AdminPanel, and every shadcn component, so it is not scoped to the homepage. That is
intentional — one orange, everywhere — but it means every existing orange pairing must
be re-verified rather than assumed.

**Verified contrast** (computed, sRGB relative luminance, WCAG 2.1):

| Pair | Ratio | Verdict |
|---|---|---|
| navy `#1B2A4A` on new orange `#FF6B2C` | 5.01:1 | AA |
| navy `#1B2A4A` on old orange `#FF7A59` | 5.54:1 | AA (baseline) |
| new orange on canvas `#08111F` | 6.66:1 | AA |
| new orange on surface `#101E33` | 5.89:1 | AA |
| white on canvas `#08111F` | 18.91:1 | AA |
| muted ink `#A7B6C9` on canvas | 9.17:1 | AA |
| muted ink `#A7B6C9` on surface | 8.11:1 | AA |
| new orange as body text on white | 2.84:1 | **FAIL** |

Two consequences, both binding:

**(a) Hover must brighten, not darken.** The existing `--primary-hover` darkens the
orange. Applying that pattern to the brighter base gives navy-on-`#F25A18` = 4.23:1,
which fails AA for the button label. `--primary-hover` therefore becomes
**`#FF8347`** (navy label = 5.82:1). This inverts the old darken-on-hover behaviour and
must be applied consistently, including in the AdminPanel.

**(b) Orange is never body text on white.** Already true of the old orange (which also
failed), and already handled by `--primary-dark` `#E44E2E` (3.87:1 — large text, icons,
and borders only). That rule is unchanged and must be restated in the token comments so
the brighter, more tempting orange does not get misused.

### 4.2 Marketing surface tokens

Added to `Shared/src/styles/index.css` under `:root`, prefixed `--mk-` so they read as
marketing-layer surfaces and cannot be confused with the app's semantic tokens. They are
declared once and are **not** overridden in `.dark` — these sections are dark in both
themes by design.

| Token | Hex | Use |
|---|---|---|
| `--mk-canvas` | `#08111F` | page base, deepest |
| `--mk-surface` | `#101E33` | cards, panels |
| `--mk-raised` | `#182A45` | hover, elevated cards |
| `--mk-border` | `#25374F` | hairlines on dark |
| `--mk-ink` | `#FFFFFF` | headings on dark |
| `--mk-ink-muted` | `#A7B6C9` | body copy on dark |

Exposed through `Frontend/tailwind.config.ts` and `AdminPanel/tailwind.config.ts` as
`mk-canvas`, `mk-surface`, etc., following the existing `navy` / `navy-dark` pattern.

The existing `--gradient-hero` is retightened to the new canvas range:
`linear-gradient(160deg, #101E33 0%, #08111F 60%, #050B14 100%)`.

### 4.3 Section kit

New directory `Shared/src/components/marketing/`. Every component takes a `tone` prop
where relevant (`"dark" | "darker" | "light"`) and owns its own vertical rhythm, so no
page hand-rolls padding again.

| Component | Responsibility |
|---|---|
| `Section` | Tone, vertical rhythm (`py-20 md:py-28`), max-width, horizontal padding |
| `Eyebrow` | Small uppercase orange label above a heading |
| `SectionHeading` | Display-font heading + optional lead paragraph, tone-aware |
| `StatBand` | Row of stats, orange numerals, responsive 2×2 → 1×4 |
| `LogoWall` | Monochrome logo row, grayscale on dark, wraps on mobile |
| `TestimonialCard` | Quote, name, role, avatar |
| `FeatureCard` | Icon, title, body — used by How-it-works and product previews |
| `CTABand` | Closing call-to-action strip with primary + secondary action |

Each is a presentational component with no data fetching and no router coupling beyond
accepting `to`/`href` props, so Phases 2–5 can reuse them unchanged.

**Interface contract:** these components accept content and tone; they never fetch, never
read global state, and never import from `@/` (Frontend-local) paths. Phase 2–5 pages
compose them the same way the homepage does.

### 4.4 Motion

One hook, `Shared/src/hooks/useReveal.ts`: IntersectionObserver, translates 12px and
fades in on first intersection, unobserves after firing. Returns a no-op (element
immediately visible) when `matchMedia("(prefers-reduced-motion: reduce)")` matches. No
animation library is added.

---

## 5. Phase 1 — Homepage

### 5.1 Section map

`Frontend/src/pages/Index.tsx` composes fifteen sections. Tone alternates so the eye gets
relief and the dark sections stay impactful.

| # | Section | Tone | Status |
|---|---|---|---|
| 1 | Header | dark, transparent → solid on scroll | modified |
| 2 | Hero | dark | modified |
| 3 | Trust strip | dark | **new** |
| 4 | Stat band | dark | **new** |
| 5 | Problem | light | restyled |
| 6 | How it works | dark | rewritten from Solution |
| 7 | Directory preview | dark | **new** |
| 8 | Funding preview | dark | **new** |
| 9 | Testimonials | dark | **new** |
| 10 | Pricing | light | restyled |
| 11 | Reassurance | light | **new** (replaces Disclaimer) |
| 12 | Insights | dark | **new** |
| 13 | FAQ | dark | trimmed |
| 14 | CTA band | dark | **new** |
| 15 | Footer | dark | modified |

### 5.2 Section detail

**1 — Header.** `AppHeader` gains a transparent-over-hero state on `/` only, switching to
solid `--mk-canvas` with a bottom hairline once scroll exceeds 80px. Auth-aware behaviour
is unchanged. The transparent state must keep AA contrast against the hero gradient's
lightest stop.

**2 — Hero.** Copy is unchanged: *"Scale Your Business With Intent. Access Capital With
Clarity."* Type scale drops from `text-4xl md:text-5xl lg:text-6xl xl:text-7xl` to
`text-3xl md:text-4xl lg:text-5xl` — 72px → 48px at desktop. Section height drops from
`min-h-screen` to `min-h-[85vh]` so the trust strip peeks and invites scroll. The
subhead, both CTAs, and the "Directory is free" microcopy all move up roughly 90px.
Background uses the retightened `--gradient-hero` plus a low-opacity grid overlay and a
single soft orange radial glow behind the CTA cluster.

**3 — Trust strip.** A line of context plus `LogoWall`. The context line is **not**
hardcoded — it reads `TRUST_LINE` from `homepage.ts` (suggested default: "Founders
building across 20+ African markets") because it makes a factual claim the user must
confirm. Logos are grayscale at 60% opacity, full colour on hover. Renders nothing if
`PARTNERS` is empty, so an unfilled content file never ships an empty band.

**4 — Stat band.** Four stats via `StatBand`, orange numerals in the display font. Values
come from `homepage.ts`.

**5 — Problem.** Existing content, restyled to the light tone with the section kit and
consistent rhythm. This is the page's first light section and exists to make sections 6–9
land harder.

**6 — How it works.** Replaces `Solution.tsx`. Three numbered steps — list your business,
get discovered, unlock funding intelligence — each a `FeatureCard` paired with a product
screenshot.

**7 — Directory preview.** Two or three representative SME profile cards rendered from
static sample data in `homepage.ts`, styled to match the real `/directory` cards, with a
"Browse the directory" CTA. Static rather than live-queried: the homepage should not
depend on a network round-trip or degrade if the query fails.

**8 — Funding preview.** One fully legible funding-opportunity card followed by two
partially blurred cards behind a soft gradient mask and a "Members see the full list"
label. This demonstrates the paid product honestly — the visible card is real sample
data, and the blur is presented as a teaser, not as fake content. The blurred cards are
`aria-hidden` so screen readers are not fed decorative noise.

**9 — Testimonials.** Three `TestimonialCard`s from `homepage.ts`. Renders nothing when
`TESTIMONIALS` is empty.

**10 — Pricing.** Existing two-tier content, restyled light, with the free tier presented
as a genuine offer rather than a lead-in to the paid one.

**11 — Reassurance.** See §6.

**12 — Insights.** Three most recent published posts from `blog_posts` via the existing
blog query and `BlogCard`, with a "Read the blog" link. This is the one data-bound
section; it renders nothing on error or empty result rather than showing a broken state.

**13 — FAQ.** See §7.

**14 — CTA band.** Closing `CTABand`: heading, primary "List your business — free",
secondary "See membership", and the existing `NewsletterSignup`.

**15 — Footer.** Existing `AppFooter`, plus a **Disclaimer** link in the Legal column
(§6.1).

### 5.3 Content file

`Frontend/src/content/homepage.ts` exports typed constants: `TRUST_LINE`, `STATS`,
`PARTNERS`, `TESTIMONIALS`, `SAMPLE_PROFILES`, `SAMPLE_OPPORTUNITY`. Every value the user must
replace carries a `// TODO: confirm with real data` comment. Logo and headshot files live
in `Frontend/public/logos/` and `Frontend/public/testimonials/`.

Sections whose arrays are empty render `null`. Placeholder content never reaches
production silently.

### 5.4 Imagery

**No stock photography.** Generic stock imagery of African business is the fastest way to
lose credibility with this audience.

- Hero: CSS-only composition — gradient, faint grid, orange radial glow. No image asset.
- Sections 6–8: real screenshots of the running app, captured from `/directory` and
  `/funding` in a local dev server at 1440×900, exported at 2× and committed to
  `Frontend/public/product/`. These are generated during implementation, not requested
  from the user.
- Logos and headshots: supplied by the user into the paths above.

---

## 6. Disclaimer

### 6.1 `/disclaimer` page

New route `/disclaimer` → `Frontend/src/pages/Disclaimer.tsx`, built on the same
`SiteLayout` as `/privacy` and `/terms`. It carries all five existing points from
`landing/Disclaimer.tsx` verbatim — nothing is softened, shortened, or removed — restyled
to match the legal pages. Includes the existing "In Summary" closing paragraph.

Linked from:
- `AppFooter` Legal column, as a plain text link beside Privacy and Terms.
- The reassurance section (§6.2).
- The Pricing section's fine print.

The full disclosure becomes *more* reachable than it is today — it currently exists only
as one block on one page, and gains a permanent URL that can be cited.

### 6.2 Reassurance section (homepage §11)

Replaces the warning block. Two calm columns:

```
┌─ What Cresciva does ──────┐┌─ What it doesn't ─────────┐
│ ✓ Puts your business in   ││ · Provide grants or loans │
│   front of buyers         ││   directly                │
│ ✓ Tracks live funding     ││ · Write or submit         │
│   calls across Africa     ││   applications for you    │
│ ✓ Curates them to your    ││ · Guarantee that you win  │
│   sector and stage        ││   any funding             │
└───────────────────────────┘└───────────────────────────┘
        Read the full disclaimer →
```

Design rules, all binding:

- The "doesn't" column is **neutral** — `--mk-ink-muted` / muted-foreground, small dot
  markers. No red, no amber, no alert-triangle icon, no `--destructive` token.
- Both columns share identical weight and width. Neither is visually subordinate.
- Heading is a statement of identity, not a warning: "What Cresciva is — and isn't".
- Positioned **after** Pricing, so it answers doubt at the decision point instead of
  manufacturing doubt before it.
- The link is plain text with an arrow, not a button. It offers detail; it does not
  demand acknowledgement.

`Frontend/src/components/landing/Disclaimer.tsx` is deleted once its content has moved
to the page.

### 6.3 What is deliberately not done

No modal, no interstitial, no cookie-style acceptance banner, no scroll-blocking. The
user's requirement is that disclosure never obstructs the UI, and every one of those
patterns obstructs it.

---

## 7. FAQ

`FAQ.tsx` currently hardcodes nine items. The array moves to
`Frontend/src/content/faqs.ts` as the single source, with each entry gaining
`homepage: boolean`.

**Homepage shows five** (`homepage: true`):
1. Is the SME Directory free?
2. What is the Funding Radar?
3. How do I pay, and in which currency?
4. How fast is access after I pay?
5. Does my membership auto-renew? Can I cancel?

Chosen as the five that block a purchase decision. The remaining four — who the
Collective is for, how to access the Radar, monthly plans, differentiation — are
positioning questions that do not block checkout.

**New `/faq` route** renders all nine from the same file. The homepage section ends with
"See all questions →". No answer is lost; the page just stops being a wall. The existing
"Reach out to us" mailto stays on both.

---

## 8. Files

**New**
```
Shared/src/components/marketing/{Section,Eyebrow,SectionHeading,StatBand,
  LogoWall,TestimonialCard,FeatureCard,CTABand}.tsx
Shared/src/components/marketing/index.ts
Shared/src/hooks/useReveal.ts
Frontend/src/content/{homepage,faqs}.ts
Frontend/src/pages/{Disclaimer,FAQ}.tsx
Frontend/src/components/landing/{TrustStrip,Stats,HowItWorks,DirectoryPreview,
  FundingPreview,Testimonials,Reassurance,Insights,ClosingCTA}.tsx
Frontend/public/{logos,testimonials,product}/
```

**Modified**
```
Shared/src/styles/index.css              tokens: orange, hover inversion, --mk-*
Frontend/tailwind.config.ts              expose mk-* colours
AdminPanel/tailwind.config.ts            expose mk-* colours (parity)
Frontend/src/App.tsx                     + /disclaimer, /faq
Frontend/src/pages/Index.tsx             new composition
Frontend/src/components/landing/{Hero,Problem,Pricing,FAQ}.tsx
Frontend/src/components/common/{AppHeader,AppFooter}.tsx
```

**Deleted**
```
Frontend/src/components/landing/Disclaimer.tsx    (content → pages/Disclaimer.tsx)
Frontend/src/components/landing/Solution.tsx      (→ HowItWorks.tsx)
```

## 9. Verification

1. `npm run build` and root `tsc` clean.
2. `npm test` — existing 211 tests pass. Tests referencing `landing/Disclaimer` or
   `landing/Solution` are updated, not deleted.
3. New tests: `/disclaimer` and `/faq` render and are reachable from the footer; the
   homepage renders with an **empty** `homepage.ts` without crashing or showing empty
   bands; FAQ homepage list contains exactly five items and `/faq` contains all nine.
4. Contrast re-verified against the table in §4.1 after tokens land, including AdminPanel
   buttons on the new hover value.
5. Manual pass at 375px, 768px, 1440px. Hero CTAs visible without scrolling at 375px.
6. `prefers-reduced-motion: reduce` — no transforms fire.
7. Keyboard pass: focus ring visible on every dark section; blurred funding cards are not
   focusable.

## 10. Roadmap — Phases 2 to 5

Each is a separate spec → plan → implementation cycle, composing the §4.3 kit.

- **Phase 2 — Trust pages.** `/about`, `/contact`. Low risk, presentational only.
- **Phase 3 — Product surfaces.** `/directory`, `/funding`. **Highest risk:** these are
  data-bound and subscription-gated. Restyling can break paywall UI, so this phase needs
  its own spec and a dedicated test pass over `isSubscriptionActive` display paths.
- **Phase 4 — Content surfaces.** `/blog`, `/blog/:slug`, `/resources`,
  `/resources/:slug`.
- **Phase 5 — Auth shells.** `/auth`, forgot, reset. Cosmetic.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Global orange change regresses AdminPanel contrast | §4.1 table + explicit AdminPanel re-verification in §9.4 |
| Hover inversion applied inconsistently | Single token `--primary-hover`; no component hardcodes hover |
| Homepage ships with placeholder stats | Empty arrays render `null`; every value carries a TODO comment |
| Insights section fails if `blog_posts` is empty | Renders `null` on empty or error |
| Fifteen sections hurt mobile performance | No image library, CSS-only hero, screenshots served at 2× WebP, `loading="lazy"` below section 6 |
| Deleting `Solution.tsx` breaks existing tests | §9.2 updates rather than deletes affected tests |
