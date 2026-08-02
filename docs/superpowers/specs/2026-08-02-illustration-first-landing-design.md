# Illustration-first landing page

**Date:** 2026-08-02
**Status:** Approved design, ready for implementation planning
**Scope:** The public landing page (`/`), plus the `/disclaimer` and `/faq` routes it spawns
**Branch:** `overhaul/hubspot-theme-dashboard-backend`

## 0. Relationship to the earlier spec

This spec **supersedes** `docs/superpowers/specs/2026-07-27-dark-marketing-redesign-design.md`
and its plan `docs/superpowers/plans/2026-07-27-dark-marketing-redesign.md`. That design chose a
dark-first canvas and product screenshots; this one chooses light-first and illustrations. Both
superseded documents stay in the repository as a record of the decision.

What survives from it, because it already landed in commit `2f33c55` and is brand-level rather
than page-level:

- `--primary` `#FF6B2C` and the hover-brightens rule (`--primary-hover` `#FF8347`).
- The `--mk-*` marketing surface tokens, now used only by the closing CTA band and footer.
- `Shared/src/lib/color.ts` and the contrast regression test over `index.css`.

Nothing else from that plan is carried forward.

---

## 1. Problem

The landing page is six sections of text on a white canvas. Three concrete defects:

1. **Nothing is ever shown.** Not one image, illustration, or screenshot. The page sells a
   directory and a funding tool without depicting either, so a visitor is asked to pay for
   something they have not seen. Meanwhile the repository already contains a coherent
   illustration system — `Shared/src/components/illustrations/`, seven hand-authored SVGs plus
   `Illustration.tsx`, `EmptyState`, `ErrorState`, `LoadingState` — that the marketing surface
   does not touch.
2. **The disclaimer argues against the sale.** `landing/Disclaimer.tsx` is a five-point warning
   block with an alert-triangle icon and a numbered list, positioned immediately *before*
   `Pricing`. It manufactures doubt at the moment of decision.
3. **The page has one audience.** `Index.tsx` redirects every signed-in user to the dashboard,
   so the page speaks only to strangers. A signed-in user who arrives by logo click or shared
   link sees "Get started" as though they had never signed up.

There is also no motion anywhere — the page arrives fully formed and reads as a static document.

## 2. Goals

- Every section leads with a visual: an illustration, or real product UI where that is more
  honest than a drawing.
- Extend the existing house illustration style rather than importing a third-party set.
- Show both products — the directory as it actually renders, the funding tool as an honest
  locked teaser.
- Move the disclaimer off the conversion path while making it *more* reachable.
- Adapt the page's calls to action to who is looking at it.
- Give the data-bound section real loading, error, and empty treatments.
- Add scroll-reveal motion that costs no bundle weight and disappears under
  `prefers-reduced-motion`.

### Non-goals

- No redesign of `/about`, `/contact`, `/directory`, `/funding`, `/blog`, `/resources`, the
  dashboard, or the auth shells.
- No app-wide empty-state sweep. That is Spec B (§11) and gets its own cycle.
- No stat bands, partner logos, or testimonials populated with content. See §7.
- No new backend tables, migrations, or changes to subscription, payment, or auth logic.
- No new runtime dependency in any workspace.

## 3. Decisions taken

| Decision | Choice |
|---|---|
| Canvas | Light-first; one dark punctuation band (closing CTA) plus the existing dark footer |
| Illustration source | Hand-authored, extending `Shared/src/components/illustrations/` |
| Product previews | Real components with static sample data, not drawings (§5.5, §5.6) |
| Social proof | Components built, content empty, sections render `null` (§7) |
| Motion | One `useReveal` IntersectionObserver hook in `Shared`, zero dependencies |
| Disclaimer | Full text moves to `/disclaimer`; a calm two-column section takes its place after Pricing |
| Signed-in redirect | Kept; adaptive states apply when a signed-in user reaches `/` anyway |

---

## 4. Foundations

### 4.1 Tones

No new surface tokens. The three tones map onto tokens that already exist:

| Tone | Background | Ink | Used by |
|---|---|---|---|
| `light` | `--background` `#FFFFFF` | `--ink-strong` / `--foreground` | Hero, Problem, Directory preview, Pricing, Reassurance, Insights |
| `tinted` | `--surface-subtle` `#F5F8FA` | `--ink-strong` / `--foreground` | How it works, Funding preview, FAQ |
| `dark` | `--mk-canvas` `#08111F` | `#FFFFFF` / `--mk-ink-muted` | Closing CTA band |

Tone alternation is the page's rhythm: light and tinted trade off down the page, and the single
dark band at the end lands hard precisely because nothing before it was dark.

### 4.2 Contrast

Every pair below is already verified by the existing `Shared/src/styles/__tests__/tokens.test.ts`
guard, or must be added to it:

- Orange is **never body text on light** — `#FF6B2C` on white is 2.84:1. Orange on light is
  restricted to fills behind navy labels, large display numerals, icons, and borders.
  `--primary-dark` `#E44E2E` (3.87:1) is the only orange permitted for large text on light.
- The dark CTA band reuses the verified `--mk-*` pairs: white 18.91:1, `--mk-ink-muted` 9.17:1,
  orange 6.66:1, all on `--mk-canvas`.
- Illustration strokes are `currentColor` and inherit the section's ink, so they cannot drift out
  of contrast when a tone changes.

**Pre-existing issue, noted not fixed here:** `--shadow-focus`, the `.dark` `--ring`, and the
sidebar tokens still reference `hsl(11 100% 68%)`, the *old* `#FF7A59` orange, which commit
`2f33c55` missed. This is a brand inconsistency across the whole app, not a landing-page defect.
It is recorded here so it is not mistaken for something this work introduced, and should be
picked up as its own change.

### 4.3 Motion

`Shared/src/hooks/useReveal.ts` — a single hook, no library.

```
const { ref, revealed } = useReveal({ delay?: number })
```

IntersectionObserver at `threshold: 0.15`, `rootMargin: "0px 0px -10% 0px"`. On first
intersection it sets `revealed` and unobserves — reveal is one-way and never re-fires on scroll
back. The consumer applies `opacity-0 translate-y-3` → `opacity-100 translate-y-0` with a 500ms
ease-out transition.

Under `matchMedia("(prefers-reduced-motion: reduce)")` the hook returns `revealed: true` on the
first render and never observes anything, so no transform is ever applied and no observer is
created. This is checked at call time rather than mount time so it is correct for users who
change the setting mid-session on a subsequent mount.

`Reveal` in the marketing kit wraps the hook for the common case, and takes `delay` so a parent
can stagger its children (`index * 80ms`, capped at 320ms so a long list never crawls).

### 4.4 Marketing kit

New directory `Shared/src/components/marketing/`. Presentational only: these components accept
content and tone, never fetch, never read global state, and never import from `@/`.

| Component | Responsibility |
|---|---|
| `Section` | Tone, vertical rhythm (`py-20 md:py-28`), max-width, horizontal padding, optional `id` |
| `Eyebrow` | Small uppercase orange label above a heading |
| `SectionHeading` | Display-font heading + optional lead paragraph, tone-aware |
| `IllustratedCard` | Illustration above title and body. The illustration-first card primitive |
| `SplitRow` | Illustration one side, copy the other, with a `reverse` prop for zig-zag |
| `BrowserFrame` | Chrome-less browser shell wrapping real product UI |
| `CTABand` | Closing call-to-action strip, dark tone |
| `StatBand` | Stat row, orange display numerals. Renders `null` on empty input |
| `Testimonials` | Quote cards. Renders `null` on empty input |
| `Reveal` | Wraps `useReveal` for the common case |

`SplitRow` and `IllustratedCard` are the two that make "illustration-first" structural rather
than decorative: a section cannot be composed from them without providing a visual.

---

## 5. Section map

Twelve sections. `Frontend/src/pages/Index.tsx` composes them and owns nothing else.

| # | Section | Tone | Status |
|---|---|---|---|
| 1 | Header | light | modified |
| 2 | Hero | light | rewritten |
| 3 | Problem | light | restyled |
| 4 | How it works | tinted | replaces `Solution.tsx` |
| 5 | Directory preview | light | **new** |
| 6 | Funding preview | tinted | **new** |
| 7 | Pricing | light | restyled |
| 8 | Reassurance | light | **new**, replaces the Disclaimer block |
| 9 | Insights | light | **new** |
| 10 | FAQ | tinted | trimmed |
| 11 | Closing CTA | **dark** | **new** |
| 12 | Footer | dark | modified |

### 5.1 Header

Existing `AppHeader`, unchanged in behaviour. On `/` it starts transparent over the hero and
switches to solid `--background` with a bottom hairline past 80px of scroll. Because the hero is
now light, the transparent state needs no special ink handling — the header's normal navy ink is
already correct against it. Auth-aware behaviour is untouched.

### 5.2 Hero

Split layout: copy left, `hero-growth` illustration right at roughly 40% width. Stacks on mobile
with the illustration **below** the CTAs, so the fold on a 375px screen still shows headline,
subhead, and both buttons.

Copy is unchanged: *"Scale Your Business With Intent. Access Capital With Clarity."* Type scale
drops from `text-4xl md:text-5xl lg:text-6xl xl:text-7xl` to `text-4xl md:text-5xl lg:text-6xl` —
the `xl:text-7xl` step is what currently pushes the CTAs under the fold.

Background is `--background` with a single soft orange radial glow behind the illustration at low
opacity. No gradient text, per the design system.

The CTA cluster is viewer-adaptive (§6).

### 5.3 Problem

Existing copy, restyled as three `IllustratedCard`s — `problem-invisible`, `problem-scattered`,
`problem-time` — revealed with an 80ms stagger. This replaces the current icon-and-text
treatment; the illustration is the card's first element and carries its meaning.

### 5.4 How it works

Replaces `Solution.tsx`. Three numbered steps as alternating `SplitRow`s: list your business
(`step-list`), get discovered (`step-discovered`), unlock funding intelligence (`step-funding`).
The zig-zag is what stops three consecutive illustration rows reading as a list.

The two-pillar content currently in `Solution.tsx` — directory and funding radar, with their
feature bullets — is redistributed: the directory bullets fold into step 1 and 2, the funding
bullets into step 3. Nothing is lost; the framing changes from "here are two products" to "here
is what happens".

### 5.5 Directory preview

Two or three representative SME profile cards rendered by the **real** directory card component
with static sample data from `homepage.ts`, inside a `BrowserFrame`. A "Browse the directory"
CTA follows.

Static rather than live-queried on purpose: the homepage must not depend on a network round-trip
or degrade when the query fails.

This is the deliberate deviation from illustrations-first. A directory card shown exactly as it
renders is more persuasive and more honest than a drawing of one, and it costs nothing to
maintain because it *is* the component.

### 5.6 Funding preview

One fully legible funding-opportunity card from static sample data, followed by an honest locked
state: the `locked-vault` illustration, "Members see the full curated list", and a link to
membership.

**No blurred fake cards.** Blurring implies content exists behind the blur at that exact shape
and count, which is a claim the page cannot support. An explicit locked state makes the same
point without the implication. The locked panel is a single non-focusable element, so keyboard
users are not walked through decorative content.

### 5.7 Pricing

Existing two-tier content, restyled with the kit and consistent rhythm. The free tier is
presented as a genuine offer, not a lead-in. Fine print gains a plain-text link to
`/disclaimer`. Keeps `id="pricing"` — it is an existing anchor target.

### 5.8 Reassurance

Replaces the warning block. Two columns of identical weight and width under the heading
**"What Cresciva is — and isn't"**, each led by its own illustration — `reassurance-does` and
`reassurance-doesnt`, drawn as a matched pair at identical scale so neither column reads as the
lesser one.

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

Binding design rules:

- The "doesn't" column is **neutral** — `--muted-foreground`, small dot markers. No red, no
  amber, no alert-triangle, no `--destructive`.
- Neither column is visually subordinate.
- The heading is a statement of identity, not a warning.
- Positioned **after** Pricing, answering doubt at the decision point rather than creating it
  beforehand.
- The link is plain text with an arrow, not a button. It offers detail; it does not demand
  acknowledgement.

### 5.9 Insights

The three most recent published posts from `blog_posts` via the existing blog query and
`BlogCard`, with a "Read the blog" link. This is the page's only data-bound section, and it gets
all four states:

| State | Treatment |
|---|---|
| Loading | Three card skeletons, no shimmer under reduced motion |
| Error | `error` illustration, short message, retry button |
| Empty | `empty-insights` illustration and a line pointing to the blog |
| Loaded | Three `BlogCard`s |

The error state is a retry, not a silent `null`: a failed fetch is a real event and hiding it
makes the page look like it has no blog.

### 5.10 FAQ

`FAQ.tsx` currently hardcodes nine items. The array moves to `Frontend/src/content/faqs.ts` as
the single source, each entry gaining `homepage: boolean`.

The homepage shows the **five** that block a purchase decision:

1. Is the SME Directory free?
2. What is the Funding Radar?
3. How do I pay, and in which currency?
4. How fast is access after I pay?
5. Does my membership auto-renew? Can I cancel?

The remaining four — who the Collective is for, how to access the Radar, monthly plans,
differentiation — are positioning questions that do not block checkout. They are **not deleted**:
a new `/faq` route renders all nine from the same file, and the homepage section ends with "See
all questions →". The existing "Reach out to us" mailto stays on both. Keeps `id="faq"`.

### 5.11 Closing CTA

The one dark band. `CTABand` on `--mk-canvas` with the `cta-launch` illustration, a heading,
primary "List your business — free", secondary "See membership", and the existing
`NewsletterSignup`.

### 5.12 Footer

Existing `AppFooter`, plus a **Disclaimer** link in the Legal column beside Privacy and Terms.

---

## 6. Viewer-adaptive states

`Index.tsx` keeps its existing redirect: a signed-in user landing on `/` still goes to
`DEFAULT_AUTHED_ROUTE`, with `?home=1` as the escape hatch. Returning members keep the fast path.
The adaptive states therefore serve the signed-in user who reaches `/` deliberately — logo click,
shared link, `?home=1`, or a back-navigation.

Four states, resolved from `useAuth` plus the existing `useSubscription` hook and a profile
lookup:

| Viewer | Primary CTA | Secondary | Extra |
|---|---|---|---|
| Signed out | List your business — free | See how funding works | — |
| Signed in, no profile | Finish your listing | Browse the directory | `profile-incomplete` band above Problem |
| Signed in, profile, no membership | Unlock the Funding Radar | Go to dashboard | Funding preview addresses them directly |
| Active member | Go to dashboard | Browse the directory | Previews collapse to plain links |

Rules:

- **The subscription check is not re-derived.** State resolution imports `isSubscriptionActive` /
  `useSubscription` from `Frontend/src/lib/subscription.ts`, the single frontend home for that
  rule per CLAUDE.md.
- **A subscription read error is not a downgrade.** `useSubscription` throws on error and
  surfaces `status: "error"`. On error the page renders the **signed-out** CTA set, never the
  "no membership" upsell — a paying member on a flaky connection is never shown an upgrade
  prompt.
- **While auth or subscription is loading**, the page renders the signed-out CTA set rather than
  a spinner. The landing page must never block on a network call to become readable.
- This is presentation only. No guard, no gate, no access decision depends on it; the database
  remains the boundary.

The logic lives in one hook, `Frontend/src/hooks/useViewerState.ts`, returning a discriminated
union. Sections consume the resolved state and never call `useAuth` themselves, so there is one
place to test and one place to change.

---

## 7. Social proof

`StatBand` and `Testimonials` are **built** and exported from the kit, and `homepage.ts` declares
`STATS: Stat[] = []` and `TESTIMONIALS: Testimonial[] = []`. Both render `null` on an empty
array, so neither appears on the page today.

The twelve-section map above is composed to look complete without them — that is why there is no
gap where a stat band "should" be.

No placeholder numbers, no invented quotes, no sample logos ship. Fabricated social proof on a
funding platform is a credibility and legal risk, and placeholder content has a way of reaching
production. When real figures exist, filling the arrays is the only change needed.

---

## 8. Illustrations

Twelve new SVGs in `Shared/src/components/illustrations/`, each registered in `index.ts` and
added to the `IllustrationName` union.

House recipe, matching the existing seven (see `EmptyDirectory.tsx`):

- `viewBox`-based, no fixed width or height; sized by the caller through `Illustration`.
- Strokes are `currentColor` at `strokeWidth={1.5}`, `strokeLinecap`/`strokeLinejoin` round.
- Fills are tokens only — `hsl(var(--primary))`, `hsl(var(--surface-muted))`. No literal hex.
- `aria-hidden` and `focusable="false"` on the `<svg>`; accessibility is handled by the
  `Illustration` wrapper's `title` prop.

| Name | Section |
|---|---|
| `hero-growth` | Hero |
| `problem-invisible`, `problem-scattered`, `problem-time` | Problem |
| `step-list`, `step-discovered`, `step-funding` | How it works |
| `reassurance-does`, `reassurance-doesnt` | Reassurance |
| `locked-vault` | Funding preview |
| `empty-insights` | Insights empty state |
| `cta-launch` | Closing CTA — **the only one that must read on `--mk-canvas`** |
| `profile-incomplete` | Viewer-state band |

`cta-launch` is the single dark-surface case. `currentColor` handles its strokes automatically
via `Illustration`'s `text-navy dark:text-white`, but that wrapper keys off the *theme*, not the
section tone — a dark band inside a light theme would give navy strokes on navy. `Illustration`
therefore gains an optional `tone` prop (`"auto" | "dark"`), defaulting to `"auto"` so all
existing call sites are unchanged; `"dark"` forces white strokes. Its `--surface-muted` fills are
replaced with `--mk-raised` in that illustration specifically.

---

## 9. Files

**New**
```
Shared/src/hooks/useReveal.ts
Shared/src/hooks/__tests__/useReveal.test.ts
Shared/src/components/marketing/{Section,Eyebrow,SectionHeading,IllustratedCard,SplitRow,
  BrowserFrame,CTABand,StatBand,Testimonials,Reveal}.tsx
Shared/src/components/marketing/index.ts
Shared/src/components/marketing/__tests__/marketing.test.tsx
Shared/src/components/illustrations/*.tsx                   (12 new)
Frontend/src/content/{homepage,faqs}.ts
Frontend/src/content/__tests__/content.test.ts
Frontend/src/hooks/useViewerState.ts
Frontend/src/hooks/__tests__/useViewerState.test.tsx
Frontend/src/pages/{Disclaimer,FAQ}.tsx
Frontend/src/pages/__tests__/{Disclaimer,FAQ}.test.tsx
Frontend/src/components/landing/{HowItWorks,DirectoryPreview,FundingPreview,Reassurance,
  Insights,ClosingCTA,ViewerBand}.tsx
Frontend/src/components/landing/__tests__/{landing,Insights}.test.tsx
```

**Modified**
```
Shared/src/components/common/Illustration.tsx     + tone prop
Shared/src/components/illustrations/index.ts      + 12 registrations
Frontend/src/App.tsx                              + /disclaimer, /faq lazy routes
Frontend/src/pages/Index.tsx                      twelve-section composition
Frontend/src/components/landing/{Hero,Problem,Pricing,FAQ}.tsx
Frontend/src/components/common/{AppHeader,AppFooter}.tsx
```

**Deleted**
```
Frontend/src/components/landing/Disclaimer.tsx    content → pages/Disclaimer.tsx, verbatim
Frontend/src/components/landing/Solution.tsx      → HowItWorks.tsx
```

Tests that reference the two deleted components are **updated, not deleted**.

---

## 10. Verification

1. `npm run build` and `npm run lint` clean; root `tsc` clean.
2. `npm test` — the existing suite passes.
3. New tests:
   - The homepage renders with a **fully empty** `homepage.ts` — no crash, no empty bands.
   - Each of the four viewer states renders its documented CTA; a subscription **error**
     renders the signed-out set, not the upsell.
   - `Insights` renders each of loading / error / empty / loaded.
   - The homepage FAQ list contains exactly five items; `/faq` contains all nine.
   - `/disclaimer` renders all five points and is reachable from the footer.
   - `useReveal` returns `revealed: true` immediately and constructs no observer under
     `prefers-reduced-motion: reduce`.
4. Contrast: the `tokens.test.ts` guard extended to cover any pair this work introduces.
5. Manual pass at 375px, 768px, 1440px. Hero headline, subhead, and both CTAs visible without
   scrolling at 375px.
6. Keyboard pass: visible focus ring in every tone; the funding locked panel is not focusable;
   `/faq` and `/disclaimer` reachable by keyboard from the footer.
7. Illustrations: every new SVG contains no literal hex fill.

## 11. Follow-on — Spec B

The app-wide state sweep is deliberately out of scope and gets its own spec → plan →
implementation cycle: replacing thin "No results" text with illustrated `EmptyState` /
`ErrorState` / `LoadingState` across `/directory`, `/funding`, `/resources`, `/blog`, and the
dashboard. It depends on nothing here beyond the illustrations this spec adds, and the two can be
built in either order.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Twelve hand-authored SVGs land inconsistent in style | Single documented recipe (§8); no literal hex is test-enforced; all reviewed against the existing seven |
| Adaptive CTAs mis-resolve and show a member an upsell | One hook, discriminated union, error and loading both fall back to signed-out (§6) |
| Illustration payload hurts mobile load | Inline SVG, no image requests, no library; the hero is the only above-fold illustration |
| Reveal animation causes layout shift | Transform and opacity only — never height, margin, or display |
| Deleting `Solution.tsx` breaks existing tests | §9 updates rather than deletes affected tests |
| Product preview drifts from the real directory card | The preview *uses* the real component; only the data is static |
