# 01 — Design System & Theme (orange / white / navy)

**Source of truth:** `docs/plans/00-FOUNDATION.md`. This plan implements FOUNDATION §1 (tokens,
type, anti-slop), §2 (primitives), §3 (imagery) and the motion/a11y gates in §4. Plans 02–06
consume the primitives and tokens defined here — the APIs in §7 below are contracts; do not drift.

**Goal:** retire the forest-green/gold/Playfair system entirely; ship the HubSpot-style
orange/navy/white token system (light + dark), Sora display + Inter body, navy-tinted shadows,
new button/badge variants, the `src/components/common/` primitives, an illustration set, and a
purposeful-motion policy — all WCAG 2.1 AA.

**Scope in:** `src/index.css`, `tailwind.config.ts`, `index.html` (font links only — meta is 08's),
`src/main.tsx` (font imports, MotionConfig via `src/App.tsx`), `src/components/ui/button.tsx` +
`badge.tsx` (variant maps only), new `src/components/common/*`, new `src/components/illustrations/*`,
a class-migration sweep across `src/pages/**`, `src/components/landing/*`, `src/components/admin/*`,
`src/components/NewsletterSignup.tsx`, `src/components/ImageUploadCrop.tsx`, `src/lib/markdown.tsx`,
hero image optimization.

**Scope out:** copy rewrites beyond unwrapping gradient spans (02–06 own their pages' copy), the
auth-aware `AppHeader`/`AppFooter` (02), per-route `<SEO>` values + og-banner + `index.html` meta
(08), route code-splitting (08), TanStack Query adoption (05).

**Dependencies:** none — this plan runs first. 02–06 must not start their UI work before the
migration sweep (§6) lands, or they will build on dead tokens.

---

## 1. FOUNDATION amendments (required for WCAG AA — record in 00-FOUNDATION.md first)

FOUNDATION §0 makes AA (≥4.5:1 text) a non-negotiable truth; §1.1 as written violates it in three
places. Per FOUNDATION's own rule ("add it here first, then use it"), append these corrections to
00-FOUNDATION §1.1 before implementing:

| Token | FOUNDATION said | Amended value | Why (measured) |
|---|---|---|---|
| `--primary-foreground` | `0 0% 100%` white | `217 47% 20%` navy | White on #FF7A59 = **2.45:1** (fails AA at any size). Navy #1B2A4A on #FF7A59 = **5.78:1** ✓; on hover #FF5C35 = **4.62:1** ✓. Solid orange fills get navy labels. |
| `--ring` (light mode) | `11 100% 68%` | `11 78% 52%` (#E44E2E) | Focus indicator needs 3:1 vs adjacent (WCAG 1.4.11). #FF7A59 on white = 2.45:1 ✗; #E44E2E = **3.85:1** ✓. Dark mode keeps `11 100% 68%` (5.78:1 on navy ✓). |
| *(new)* `--destructive-strong` | — | `356 65% 42%` (~#B1252F) | #F2545B with white text = 3.39:1 ✗. Destructive button fills + error text on white use `-strong` (**6.6:1** ✓). `--destructive` stays for borders/icons/tints. |
| *(new)* `--success-strong` | — | `170 100% 25%` (~#008070) | #00BDA5 as text on white = 2.38:1 ✗. Success *text* uses `-strong` (**4.9:1** ✓). `--success` only for fills-with-ink-text, icons ≥3:1 contexts, borders. |

Rule of thumb encoded by these: **orange/teal/red brights are fills, borders, icons, and
text-on-navy — never small text on white.** Text on white is navy ink or the `-strong` variants.

---

## 2. `src/index.css` — exact replacement

Replace the entire file with the block below. Deltas from today: Google Fonts `@import` deleted
(fonts move to self-hosted `@fontsource`, §4); forest/gold/cream/warm-white/`--gradient-gold`/
`--shadow-gold`/`.text-gradient-gold`/`.bg-hero-pattern` deleted; sidebar tokens recolored to navy;
reduced-motion and focus base rules added.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Cresciva Design System — orange / white / dark navy (see docs/plans/00-FOUNDATION.md §1) */

@layer base {
  :root {
    /* Canvas & ink */
    --background: 0 0% 100%;
    --foreground: 210 29% 27%;          /* #33475B body ink */
    --ink-strong: 217 47% 20%;          /* #1B2A4A headings */
    --surface-subtle: 204 44% 98%;      /* #F5F8FA alt sections */
    --surface-muted: 212 40% 94%;       /* #EAF0F6 muted panels */

    /* Brand */
    --primary: 11 100% 68%;             /* #FF7A59 orange — CTAs, active */
    --primary-foreground: 217 47% 20%;  /* navy label on orange (AA, see plan §1) */
    --primary-hover: 12 100% 60%;       /* #FF5C35 */
    --primary-dark: 11 78% 52%;         /* #E44E2E pressed / icons-on-light */
    --navy: 217 47% 20%;                /* #1B2A4A dark brand surfaces */
    --navy-light: 211 42% 30%;          /* #2C4A6B */
    --navy-dark: 216 55% 12%;           /* #0D1B2E footer / darkest */

    --secondary: 212 40% 94%;
    --secondary-foreground: 210 29% 27%;
    --muted: 204 44% 98%;
    --muted-foreground: 210 27% 44%;    /* #516F90, 5.6:1 on white */
    --accent: 11 100% 68%;
    --accent-foreground: 217 47% 20%;

    --card: 0 0% 100%;
    --card-foreground: 210 29% 27%;
    --popover: 0 0% 100%;
    --popover-foreground: 210 29% 27%;

    --border: 213 33% 84%;              /* #CBD6E2 */
    --input: 213 33% 84%;
    --ring: 11 78% 52%;                 /* #E44E2E — 3.85:1 on white (1.4.11) */

    /* Status */
    --destructive: 356 75% 54%;         /* #F2545B — borders/icons/tints only */
    --destructive-strong: 356 65% 42%;  /* fills w/ white text, error text on white */
    --destructive-foreground: 0 0% 100%;
    --success: 170 100% 37%;            /* #00BDA5 — fills/icons */
    --success-strong: 170 100% 25%;     /* success text on light */
    --warning: 36 89% 65%;              /* #F5C26B — always with ink text */
    --data-teal: 189 100% 37%;          /* charts/admin only, never CTAs */

    --radius: 0.625rem;                 /* 10px */

    /* Fonts (loaded via @fontsource in src/main.tsx) */
    --font-sans: "Inter", system-ui, sans-serif;
    --font-display: "Sora", system-ui, sans-serif;

    /* The one allowed gradient: dark navy hero panels. No gradient text anywhere. */
    --gradient-hero: linear-gradient(160deg, #12263A 0%, #1B2A4A 55%, #0D1B2E 100%);

    /* Shadows — navy-tinted, soft */
    --shadow-soft: 0 2px 8px -2px hsl(217 47% 20% / 0.08);
    --shadow-medium: 0 6px 20px -6px hsl(217 47% 20% / 0.12);
    --shadow-elevated: 0 18px 40px -14px hsl(217 47% 20% / 0.18);
    --shadow-focus: 0 0 0 3px hsl(11 100% 68% / 0.35);

    /* Sidebar (admin) — navy */
    --sidebar-background: 217 47% 20%;
    --sidebar-foreground: 210 30% 92%;
    --sidebar-primary: 11 100% 68%;
    --sidebar-primary-foreground: 217 47% 20%;
    --sidebar-accent: 211 42% 30%;
    --sidebar-accent-foreground: 0 0% 100%;
    --sidebar-border: 213 30% 30%;
    --sidebar-ring: 11 100% 68%;
  }

  .dark {
    --background: 216 55% 9%;           /* #0A1626 */
    --foreground: 210 30% 92%;
    --ink-strong: 0 0% 100%;
    --surface-subtle: 216 45% 13%;
    --surface-muted: 214 30% 18%;

    --primary: 11 100% 68%;             /* orange unchanged */
    --primary-foreground: 217 47% 20%;
    --primary-hover: 12 100% 60%;
    --primary-dark: 11 78% 52%;
    --navy: 216 45% 13%;
    --navy-light: 211 42% 30%;
    --navy-dark: 216 55% 7%;

    --secondary: 214 30% 18%;
    --secondary-foreground: 210 30% 92%;
    --muted: 214 30% 18%;
    --muted-foreground: 210 20% 68%;    /* AA on navy */
    --accent: 11 100% 68%;
    --accent-foreground: 217 47% 20%;

    --card: 216 45% 13%;
    --card-foreground: 210 30% 92%;
    --popover: 216 45% 13%;
    --popover-foreground: 210 30% 92%;

    --border: 214 25% 24%;
    --input: 214 25% 24%;
    --ring: 11 100% 68%;                /* 5.78:1 on navy canvas */

    --destructive: 356 75% 54%;
    --destructive-strong: 356 75% 54%;  /* bright red reads fine on navy (≥4.5:1 w/ white) */
    --destructive-foreground: 0 0% 100%;
    --success: 170 100% 37%;
    --success-strong: 170 100% 37%;
    --warning: 36 89% 65%;

    --shadow-soft: 0 2px 8px -2px hsl(216 55% 4% / 0.5);
    --shadow-medium: 0 6px 20px -6px hsl(216 55% 4% / 0.6);
    --shadow-elevated: 0 18px 40px -14px hsl(216 55% 4% / 0.7);

    --sidebar-background: 216 55% 7%;
    --sidebar-foreground: 210 30% 92%;
    --sidebar-primary: 11 100% 68%;
    --sidebar-primary-foreground: 217 47% 20%;
    --sidebar-accent: 214 30% 18%;
    --sidebar-accent-foreground: 0 0% 100%;
    --sidebar-border: 214 25% 20%;
    --sidebar-ring: 11 100% 68%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: var(--font-sans);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-display);
    letter-spacing: -0.01em;
    color: hsl(var(--ink-strong));
  }

  /* Visible focus for non-component elements (shadcn handles its own) */
  :focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer components {
  /* Dark navy hero/CTA panel background — the only gradient in the system */
  .bg-hero {
    background-image: var(--gradient-hero);
  }

  .card-hover {
    @apply transition-shadow duration-200 ease-out motion-safe:transition-all;
  }
  .card-hover:hover {
    box-shadow: var(--shadow-medium);
  }
  @media (prefers-reduced-motion: no-preference) {
    .card-hover:hover { transform: translateY(-2px); }
  }

  .skip-link {
    @apply sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
           focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white;
  }
}
```

Notes for the implementer:
- Headings default to `--ink-strong`; on navy sections override with `text-white` explicitly.
- `card-hover` lift reduced from −4px to −2px and gated behind `motion-safe`.
- `.text-gradient-gold` and `.bg-hero-pattern` are **gone** — the sweep in §6 removes all call
  sites first (grep must return zero before this file lands, or land both in one commit).

---

## 3. `tailwind.config.ts` — exact diffs

```diff
   theme: {
     container: {
       center: true,
       padding: "2rem",
       screens: { "2xl": "1400px" },
     },
     extend: {
       fontFamily: {
-        serif: ["Playfair Display", "serif"],
-        sans: ["Inter", "sans-serif"],
+        sans: ["Inter", "system-ui", "sans-serif"],
+        display: ["Sora", "system-ui", "sans-serif"],
       },
       colors: {
         border: "hsl(var(--border))",
         input: "hsl(var(--input))",
         ring: "hsl(var(--ring))",
         background: "hsl(var(--background))",
         foreground: "hsl(var(--foreground))",
-        forest: { DEFAULT: "hsl(var(--forest))", light: "hsl(var(--forest-light))", dark: "hsl(var(--forest-dark))" },
-        gold: { DEFAULT: "hsl(var(--gold))", light: "hsl(var(--gold-light))", dark: "hsl(var(--gold-dark))" },
-        cream: "hsl(var(--cream))",
-        "warm-white": "hsl(var(--warm-white))",
+        navy: {
+          DEFAULT: "hsl(var(--navy))",
+          light: "hsl(var(--navy-light))",
+          dark: "hsl(var(--navy-dark))",
+        },
+        ink: { strong: "hsl(var(--ink-strong))" },
+        surface: {
+          subtle: "hsl(var(--surface-subtle))",
+          muted: "hsl(var(--surface-muted))",
+        },
         primary: {
           DEFAULT: "hsl(var(--primary))",
           foreground: "hsl(var(--primary-foreground))",
+          hover: "hsl(var(--primary-hover))",
+          dark: "hsl(var(--primary-dark))",
         },
         destructive: {
           DEFAULT: "hsl(var(--destructive))",
+          strong: "hsl(var(--destructive-strong))",
           foreground: "hsl(var(--destructive-foreground))",
         },
+        success: {
+          DEFAULT: "hsl(var(--success))",
+          strong: "hsl(var(--success-strong))",
+        },
+        warning: "hsl(var(--warning))",
+        "data-teal": "hsl(var(--data-teal))",
         /* secondary, muted, accent, popover, card, sidebar blocks: unchanged */
       },
       boxShadow: {
         soft: "var(--shadow-soft)",
         medium: "var(--shadow-medium)",
-        gold: "var(--shadow-gold)",
         elevated: "var(--shadow-elevated)",
+        focus: "var(--shadow-focus)",
       },
       keyframes: {
         "accordion-down": { /* unchanged */ },
         "accordion-up": { /* unchanged */ },
-        "fade-up": { ... },
-        "fade-in": { ... },
-        shimmer: { ... },
+        "fade-in": {
+          "0%": { opacity: "0" },
+          "100%": { opacity: "1" },
+        },
       },
       animation: {
         "accordion-down": "accordion-down 0.2s ease-out",
         "accordion-up": "accordion-up 0.2s ease-out",
-        "fade-up": "fade-up 0.6s ease-out forwards",
-        "fade-in": "fade-in 0.5s ease-out forwards",
-        shimmer: "shimmer 2s linear infinite",
+        "fade-in": "fade-in 0.3s ease-out",
       },
     },
   },
```

Rationale: `fade-up`/`shimmer` are the scroll-fade/skeleton-shimmer tells; skeletons use core
`animate-pulse` + `motion-reduce:animate-none`. `fade-in` kept at 300ms for the single allowed
hero entrance and dialog mounts.

---

## 4. Fonts — self-hosted, subset (removes render-blocking `@import`)

Decision: **self-host via `@fontsource`** (latin subset, woff2, `font-display: swap` built in;
zero third-party connections — best case for 3G, no preconnect needed).

1. `npm i @fontsource/sora @fontsource/inter` (then remove any Playfair references).
2. Add to the **top** of `src/main.tsx`:
   ```ts
   import "@fontsource/sora/latin-500.css";
   import "@fontsource/sora/latin-600.css";
   import "@fontsource/sora/latin-700.css";
   import "@fontsource/inter/latin-400.css";
   import "@fontsource/inter/latin-500.css";
   import "@fontsource/inter/latin-600.css";
   ```
3. Delete the `@import url('https://fonts.googleapis.com/...')` line from `src/index.css`
   (already absent from the §2 block).
4. `index.html`: no font `<link>` needed. Do not touch meta tags (plan 08 owns them).

Budget: 6 weight files ≈ 60–90KB woff2 total vs today's 10 weights + render-blocking CSS fetch.

---

## 5. `src/components/ui/button.tsx` + `badge.tsx` variants

FOUNDATION §4 sanctions **editing the variant map** of stock shadcn components (compose elsewhere,
but "adding a new button variant is OK"). `button.tsx` is already carrying custom variants; confine
all edits to the `cva` maps — no structural/prop changes, so future shadcn updates diff cleanly.

### `src/components/ui/button.tsx` — replace the `variant` map with:

```ts
variant: {
  default:
    "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-dark shadow-soft hover:shadow-medium",
  destructive:
    "bg-destructive-strong text-destructive-foreground hover:bg-destructive-strong/90",
  outline:
    "border border-input bg-transparent text-foreground hover:bg-secondary hover:text-ink-strong",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-surface-muted",
  ghost: "hover:bg-secondary hover:text-ink-strong",
  link: "text-navy underline underline-offset-4 hover:text-navy-light",
  navy: "bg-navy text-white hover:bg-navy-light shadow-soft",
  navyOutline:
    "border border-navy bg-transparent text-navy hover:bg-navy hover:text-white",
  hero: "bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-medium hover:shadow-elevated",
  onDark:
    "border border-white/60 bg-transparent text-white hover:border-white hover:bg-white/10",
},
```

Also in the cva base string: change `transition-all duration-300` → `transition-colors
duration-200` and append `min-h-[44px]` to sizes `default`, `lg`, `xl` is already ≥44px
(`h-12`/`h-14`); bump `default: "h-10 px-5 py-2"` → `"h-11 px-5 py-2"` (44px touch target) and
`sm: "h-9 ..."` stays for dense admin UI only (documented exception, not for primary mobile CTAs).
`icon: "h-10 w-10"` → `"h-11 w-11"`.

Removed: `gold`, `goldOutline`, old `hero` (`hover:scale-105` gone), `heroOutline` (renamed
`onDark` — used for secondary CTAs on navy panels). The §6 sweep updates all call sites in the
same commit.

### `src/components/ui/badge.tsx` — extend the `variant` map (keep existing four):

```ts
success: "border-transparent bg-success/15 text-success-strong",
warning: "border-transparent bg-warning/20 text-ink-strong",
navy: "border-transparent bg-navy text-white",
accent: "border-transparent bg-primary/10 text-primary-dark",  // large/bold label chips only
```

---

## 6. Migration map (mechanical sweep — run before/with the token commit)

Sweep targets: `src/pages/**/*.tsx`, `src/components/landing/*.tsx`, `src/components/admin/*.tsx`,
`src/components/NewsletterSignup.tsx`, `src/components/ImageUploadCrop.tsx`, `src/lib/markdown.tsx`.
Order matters: do the **semantic flips first** (rows 1–4) — `--primary` changes meaning from
forest-green to orange, so today's `bg-primary`-as-dark-canvas would silently become orange pages.

| # | Find (regex-able) | Replace | Known sites |
|---|---|---|---|
| 1 | `bg-primary` as section/page canvas | `bg-navy` (hero panels: `bg-hero`) | `Hero.tsx:9` (→`bg-hero`), `Footer.tsx:37`, `Header.tsx:76`, `Directory.tsx:56`, `Funding.tsx:175` |
| 2 | `bg-primary/95` (scrolled header) | `bg-navy/95` | `Header.tsx:30` |
| 3 | `bg-gradient-to-b from-primary/80 via-primary/70 to-primary` | delete (hero becomes `bg-hero` panel, §8) | `Hero.tsx:16` |
| 4 | `text-primary-foreground` on navy canvases (incl. `/80 /70 /60 /40` opacities) | `text-white`; opacities: `/80`→`/80`, `/70`→`/75`, `/60`→`/75`, `/40`→`/70` (AA floors) | `Hero.tsx:37,50,79`, `Header.tsx` (5), `Footer.tsx` (8), `Directory.tsx:56,58`, `Funding.tsx:175,177`, `Solution.tsx:67` |
| 5 | `text-gradient-gold` span wrappers | unwrap span; on navy → `text-primary`; on light → plain (inherits `text-ink-strong`) | `Hero.tsx:40,43`, `Footer.tsx:48`, `Problem.tsx:80`, `Directory.tsx:62`, `Funding.tsx:184` |
| 6 | `font-serif` | `font-display` | all pages/landing/admin (~20 sites incl. `AdminPageHeader.tsx:15`, `markdown.tsx:153` `prose-headings:font-serif`→`prose-headings:font-display`) |
| 7 | `variant="gold"` | `variant="default"` | `Header.tsx:59,98`, `Pricing.tsx:196`, `Directory.tsx:78,98`, `Funding.tsx:162,164,206,316`, `Auth.tsx:130`, `CreateProfile.tsx:174`, `NewsletterSignup.tsx:77`, `ImageUploadCrop.tsx:109` |
| 8 | `variant="hero"` | `variant="hero"` (new def; no change at call site) | `Hero.tsx:63` |
| 9 | `variant="heroOutline"` / `variant="goldOutline"` | `variant="onDark"` | `Hero.tsx:69` |
| 10 | `text-gold` **on navy/dark bg** | `text-primary` (5.78:1 ✓) | `Header.tsx:35,53,92`, `Footer.tsx:65`, `Funding.tsx:180,192`, `AdminLayout.tsx:91,126,161` |
| 11 | `hover:text-gold` on navy | `hover:text-primary` | `Header.tsx:43,58,84`, `Footer.tsx:83,99–101`, `Directory.tsx:58`, `Funding.tsx:177` |
| 12 | `text-gold` / `text-gold-dark` **on light bg** | icons → `text-primary-dark`; small text → `text-foreground` or `text-ink-strong`; eyebrow kickers → **delete the element** (anti-slop, keep max one app-wide) | `Solution.tsx:44,71,84`, `FAQ.tsx:63`, `Problem.tsx:36,59`, `Pricing.tsx:135`, `Disclaimer.tsx:83`, `Funding.tsx:135,141,228,233,310`, `NewsletterSignup.tsx:50` |
| 13 | `hover:text-gold` on light | `hover:text-navy-light` | `FAQ.tsx:109`, `Directory.tsx:142,147,152`, `Funding.tsx:287`, `CreateProfile.tsx:115` |
| 14 | `bg-gold` (solid) | `bg-primary` | `Pricing.tsx:172` (delete whole ribbon per anti-slop) |
| 15 | `bg-gold/10`, `bg-gold/5` | `bg-primary/10`, `bg-primary/5` | `Hero.tsx:27`, `Funding.tsx:133,180,228,233,309`, `Disclaimer.tsx:82` |
| 16 | `border-gold(/20\|/30\|/40\|/80)?` | `border-primary/30` (pills/panels) or `border-border` (cards) | `Hero.tsx:27`, `Pricing.tsx:169`, `Problem.tsx:57`, `Solution.tsx:65`, `FAQ.tsx:85`, `Funding.tsx:133,148,180,191,223` |
| 17 | `shadow-gold` | `shadow-medium` | `Pricing.tsx:169` |
| 18 | `text-forest` | `text-navy` | `Pricing.tsx:139,205`, `Problem.tsx:41`, `Solution.tsx:49`, `FAQ.tsx:87,109`, `Auth.tsx:138`, `AdminGuard.tsx:33`, `Funding.tsx:227,261,267,273,275,281,287,296,304`, `Directory.tsx:142,147,152` |
| 19 | `text-forest-dark` | `text-ink-strong` | (4 sites — old gold-button labels, mostly die with variant swap) |
| 20 | `bg-forest` (solid) | `bg-navy` (+ its `text-primary-foreground` child → `text-white`) | `Directory.tsx:117`, `Funding.tsx:125` |
| 21 | `bg-forest/10` | `bg-navy/10` | `Problem.tsx:59`, `Disclaimer.tsx:43,68`, `Funding.tsx:227,275` |
| 22 | `bg-gradient-to-br from-forest to-forest-light` | `bg-navy` (flat) | `Solution.tsx:67` |
| 23 | `hover:border-gold/30\|40`, `data-[state=open]:border-gold/30` | `hover:border-primary/40`, `data-[state=open]:border-primary/40` | `Problem.tsx:57`, `Solution.tsx:65`, `FAQ.tsx:85`, `Directory.tsx:111`, `Funding.tsx:223` |
| 24 | `bg-hero-pattern` | delete element/class | `Hero.tsx:17` |
| 25 | `hover:scale-105` | delete | `button.tsx:20` (dies with variant rewrite) |
| 26 | `Sparkles` pill badges + "AI-powered" | delete pill; replace with plain proof-point text or nothing | `Hero.tsx:3,27–30`, `Funding.tsx:10,180–182` |
| 27 | `prose-a:text-forest` | `prose-a:text-navy prose-a:underline` | `markdown.tsx:153` |
| 28 | `whileInView` scroll-fades | delete `motion.*` wrapper → plain element (see §9 policy) | `Problem.tsx:31,54,74`, `Solution.tsx:39,62`, `Pricing.tsx:130,166,215`, `FAQ.tsx:58,76,100`, `Disclaimer.tsx:38,56`, `Footer.tsx:42` |
| 29 | `rounded-2xl`/`rounded-3xl` on cards | `rounded-xl` (FOUNDATION §1.3) | landing cards, Directory/Funding cards |

**Verification gate after sweep** (must all return zero matches in `src/`):
`grep -rn "forest\|gold\|text-gradient\|font-serif\|Playfair\|bg-hero-pattern\|hover:scale-105\|whileInView\|shadow-gold" src --include="*.tsx" --include="*.css"`
(allow: the word "gold" inside copy strings if any — check matches manually; none exist today).

---

## 7. Reusable primitives — `src/components/common/` (contracts for plans 02–06)

All primitives: named exports, `className?: string` merged via `cn()`, keyboard-operable, theme
aware, mobile-first. Actions render `<Button asChild><Link to>` when `to` is given (never
`<Link><Button/></Link>` nesting).

Shared action type (put in each file or `src/components/common/types.ts`):

```ts
export type ActionSpec = {
  label: string;
  to?: string;              // renders Link via asChild
  onClick?: () => void;     // renders plain Button
};
```

### 7.1 `src/components/common/EmptyState.tsx`

```ts
interface EmptyStateProps {
  variant?: "default" | "search" | "error" | "firstRun";  // picks default illustration + tone
  illustration?: IllustrationName;   // override (see §7.6)
  icon?: LucideIcon;                 // fallback when no illustration wanted
  title: string;
  description?: string;
  action?: ActionSpec;               // primary Button (variant="default")
  secondaryAction?: ActionSpec;      // Button variant="outline"
  className?: string;
}
```

Markup shape: centered column, `py-12 md:py-16`, illustration (`h-28 w-auto`, `aria-hidden`),
`h3.font-display.text-lg.text-ink-strong`, `p.text-sm.text-muted-foreground.max-w-sm`, actions row.
Root has `role="status"` for the `search` variant (results count changes announced).

Example (Directory, consumed by plan 04):
```tsx
<EmptyState
  variant="search"
  title="No businesses match your search"
  description="Try a different name, country, or sector."
  action={{ label: "Clear filters", onClick: reset }}
/>
```

### 7.2 `src/components/common/ErrorState.tsx`

```ts
interface ErrorStateProps {
  title?: string;            // default: "Something went wrong"
  message?: string;          // default: "We couldn't load this. Check your connection and try again."
  onRetry: () => void;       // REQUIRED — fetch errors must offer retry (IMPROVEMENTS §2.1)
  retryLabel?: string;       // default: "Try again"
  compact?: boolean;         // true = inline row (admin tables); false = full panel w/ illustration
  className?: string;
}
```

Root: `role="alert"`. Never shows raw error strings. Uses `error` illustration (non-compact),
title in `text-ink-strong`, Retry as `variant="default"`. **Contract: 02–06 render this on every
fetch `error` — never an empty or paywall state.**

### 7.3 `src/components/common/LoadingState.tsx`

Exports (all built on shadcn `Skeleton`, wrapped in `<div role="status" aria-live="polite">` with
`<span className="sr-only">Loading…</span>`; every Skeleton gets `motion-reduce:animate-none`):

```ts
export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string });
export function CardSkeleton({ media = false, lines = 3, className }: { media?: boolean; lines?: number; className?: string });
export function ListSkeleton({ count = 6, media, lines, className });   // grid of CardSkeleton
export function TableSkeleton({ rows = 8, columns = 4, className });
export function DashboardSkeleton();  // PageHeader bar + 4 StatCard blocks + 2 CardSkeletons
```

Contract: long operations (funding AI call, list fetches) show content-shaped skeletons, not
button spinners (plans 03/05 consume `ListSkeleton`/`DashboardSkeleton`).

### 7.4 `src/components/common/PageHeader.tsx`

```ts
interface PageHeaderProps {
  title: string;                    // renders h1
  subtitle?: string;
  actions?: React.ReactNode;        // right-aligned buttons
  breadcrumb?: React.ReactNode;     // slot above title
  onDark?: boolean;                 // true on navy page headers (Directory/Funding): white text
  className?: string;
}
```

Layout: `flex flex-col gap-4 md:flex-row md:items-end md:justify-between`, `h1.font-display
.text-3xl.md:text-4xl.font-bold` (`text-ink-strong`, or `text-white` when `onDark`). Replaces
`AdminPageHeader` (migrate `src/components/admin/AdminPageHeader.tsx` call sites to this, then
delete it).

### 7.5 `src/components/common/StatCard.tsx`

```ts
interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; direction: "up" | "down" | "flat" };  // up=text-success-strong, down=text-destructive-strong
  icon?: LucideIcon;
  hint?: string;                    // small muted caption
  loading?: boolean;                // renders skeleton in place of value
  className?: string;
}
```

Markup: `rounded-xl border bg-card p-5 shadow-soft`; value in `font-display text-3xl font-bold
text-ink-strong`; label `text-sm text-muted-foreground`. Delta arrows are icons + text (not color
alone — a11y).

### 7.6 `src/components/common/Illustration.tsx` + `src/components/illustrations/`

```ts
export type IllustrationName =
  | "empty-directory" | "empty-search" | "empty-funding" | "first-run"
  | "error" | "not-found" | "mail-sent";

interface IllustrationProps {
  name: IllustrationName;
  className?: string;       // size via h-* w-auto
  title?: string;           // if set: role="img" + <title>; else aria-hidden="true"
}
```

Backed by a registry `src/components/illustrations/index.ts` mapping names → React SVG components
(one file each, e.g. `src/components/illustrations/EmptySearch.tsx`). See §8 for authoring spec.

### 7.7 `src/components/common/SEO.tsx` (API owned here; per-route values owned by plan 08)

```ts
interface SEOProps {
  title: string;            // rendered as `${title} — Cresciva`
  description?: string;
  ogImage?: string;         // absolute path, default "/og-banner.png" once 08 ships it
  noindex?: boolean;
}
```

Implementation: `useEffect` sets `document.title` and upserts `<meta name="description">`,
`og:title/description/image`, `twitter:*` tags; restores nothing on unmount (last-write-wins is
fine for an SPA). No react-helmet dependency.

---

## 8. Imagery & illustrations (FOUNDATION §3)

**Authoring spec (all 7 illustrations, original work, license-safe):** inline SVG React
components, `viewBox="0 0 240 180"`, flat geometric line style, `stroke="currentColor"`
`strokeWidth={1.5}` for structure + at most two accent shapes using `fill="hsl(var(--primary))"`
and `fill="hsl(var(--surface-muted))"`. Wrapper `<Illustration>` sets `text-navy dark:text-white`
on the container so strokes theme automatically. No gradients, no drop shadows, no stock-photo
traces, ≤3KB each.

| Name | File | Used by |
|---|---|---|
| `empty-directory` | `src/components/illustrations/EmptyDirectory.tsx` (storefront outline) | 04 directory zero-state |
| `empty-search` | `EmptySearch.tsx` (magnifier over empty list) | 04 filters, admin tables |
| `empty-funding` | `EmptyFunding.tsx` (radar/compass) | 05 funding zero-state |
| `first-run` | `FirstRun.tsx` (flag on hill) | 03 dashboard onboarding |
| `error` | `ErrorCloud.tsx` (unplugged cable) | ErrorState everywhere |
| `not-found` | `NotFound404.tsx` (signpost) | NotFound page (08 restyles copy) |
| `mail-sent` | `MailSent.tsx` (envelope + check) | 02 email-confirm, newsletter success |

**Hero (`src/components/landing/Hero.tsx`):** replace the 248KB `src/assets/hero-entrepreneurs.jpg`
+ 30%-opacity + gradient-stack with a clean `bg-hero` navy gradient panel (§2) — deletes the JPG
from the landing critical path entirely. If a photo is later wanted: compress to ≤80KB, provide
`srcSet` 640/1024/1600w, `alt=""` (decorative), `fetchpriority="high"`. Default for this plan:
**no photo; delete `src/assets/hero-entrepreneurs.jpg`** and its import.

**OG banner:** out of scope here — plan 08 owns `public/og-banner.png` (1200×630, navy bg, orange
wordmark).

---

## 9. Motion policy

1. **`src/App.tsx`:** wrap the tree in `<MotionConfig reducedMotion="user">` (import from
   `framer-motion`), directly inside `<QueryClientProvider>`. This makes every framer animation
   respect OS reduced-motion. The CSS catch-all in §2 covers non-framer transitions.
2. **Remove all `whileInView` scroll-fades** (14 sites, migration row 28). Sections render
   statically — content must be visible without JS (IMPROVEMENTS §8).
3. **Allowed motion (exhaustive):**
   - One hero entrance on `/`: single `animate-fade-in` (300ms, opacity-only, CSS not framer) on
     the hero content wrapper — not staggered per-child.
   - Radix/shadcn built-ins: accordion expand, dialog/dropdown mount (200ms).
   - `card-hover` −2px lift, `motion-safe` only.
   - Skeleton `animate-pulse` with `motion-reduce:animate-none`.
   - Button color/shadow transitions ≤200ms. No transform transitions on CTAs.
4. **Banned:** `hover:scale-*`, parallax, staggered reveals, shimmer, looping animation,
   animated gradients. Anything new needs a FOUNDATION amendment.
5. After this plan, `framer-motion` remains only for `MotionConfig` + any Radix needs — flag to
   plan 08 that it may be removable entirely (bundle win) once landing sections are static.

---

## 10. Accessibility acceptance

**Contrast pairs (computed, WCAG relative luminance — these exact pairs go into the automated
test in §11):**

| Pair | Ratio | Verdict |
|---|---|---|
| `foreground` #33475B on #FFFFFF | 9.6:1 | AA/AAA body ✓ |
| `ink-strong` #1B2A4A on #FFFFFF | 14.2:1 | ✓ |
| `muted-foreground` #516F90 on #FFFFFF | 5.6:1 | AA ✓ |
| white on `navy` #1B2A4A | 14.2:1 | ✓ |
| white/75 on `navy` (effective ~#586178 blend) | ≥4.6:1 | AA ✓ (floor — never below /70) |
| `primary` #FF7A59 text on `navy` #1B2A4A | 5.78:1 | AA ✓ (orange text allowed on navy only) |
| `primary-foreground` navy on `primary` #FF7A59 | 5.78:1 | AA ✓ (button labels) |
| navy on `primary-hover` #FF5C35 | 4.62:1 | AA ✓ |
| `primary-dark` #E44E2E icons on white | 3.85:1 | 1.4.11 non-text ✓ (never small text) |
| `ring` #E44E2E on white | 3.85:1 | 1.4.11 ✓ |
| `destructive-strong` on white / white on it | 6.6:1 | AA ✓ |
| `success-strong` #008070 on white | 4.9:1 | AA ✓ |
| dark: `foreground` (210 30% 92%) on #0A1626 | ~16:1 | ✓ |
| dark: `muted-foreground` (210 20% 68%) on #0A1626 | ~7.9:1 | ✓ |

**Hard rules enforced by this plan:** orange/`--success`/`--warning`/`--destructive`(base) never
used as small text on white — the migration map routes every such site to ink or `-strong` tokens.

**Focus:** visible 2px ring on every interactive element (`:focus-visible` base rule + shadcn
`ring` token); ring color per-mode as in §1. Skip-link class shipped (`.skip-link`); plan 02 wires
it into `AppHeader`.

**Touch targets:** buttons `h-11`+ (44px) default/lg/xl and `icon` 44px (§5); directory-card
contact links and footer links get `py-2` min in the sweep (verify with devtools ≥44×44).

**Motion:** `MotionConfig reducedMotion="user"` + CSS catch-all (§2, §9).

---

## 11. Test plan

New files (Vitest + Testing Library, jsdom):

1. `src/test/contrast.test.ts` — pure function computing WCAG contrast from the hex pairs in §10
   (hardcode the token hex values next to their HSL source in a `TOKENS` map); assert every pair's
   threshold. Fails the build if anyone "tweaks" a token below AA.
2. `src/test/anti-slop.test.ts` — reads `src/**/*.{tsx,css}` (via `import.meta.glob` raw or
   `fs.readdirSync` in node env) and asserts **zero** matches for:
   `text-gradient`, `\bgold\b` (class contexts), `\bforest\b`, `font-serif`, `Playfair`,
   `hover:scale-105`, `whileInView`, `fonts.googleapis.com`, `bg-hero-pattern`, `Sparkles`.
3. `src/components/common/__tests__/EmptyState.test.tsx` — renders title/description; `action.to`
   renders a link with correct href; `action.onClick` fires; `variant="error"` shape.
4. `src/components/common/__tests__/ErrorState.test.tsx` — `role="alert"` present; retry callback
   fires; default copy shown; no raw error text prop exists.
5. `src/components/common/__tests__/LoadingState.test.tsx` — `role="status"` + sr-only label;
   `TableSkeleton` renders `rows × columns` cells.
6. `src/components/common/__tests__/StatCard.test.tsx` — value/label/delta direction classes;
   `loading` renders skeleton, not value.
7. `src/components/common/__tests__/SEO.test.tsx` — sets `document.title` to
   `"X — Cresciva"`; upserts description meta.

Manual QA checklist: light + dark screenshot pass of `/`, `/auth`, `/directory`, `/funding`,
`/admin` (sidebar navy, orange active states); OS reduced-motion on → no animation anywhere;
keyboard-tab through landing + auth (visible ring every stop); Lighthouse a11y ≥ 95 on `/` and
`/directory`; 3G throttle → fonts swap without layout blowup, no Google Fonts request in network
panel.

## Acceptance criteria

- [ ] `src/index.css` matches §2 (no `@import`, no forest/gold/gradient-gold/hero-pattern tokens).
- [ ] `tailwind.config.ts` matches §3; `npm run build` green with zero unknown-class warnings.
- [ ] Fonts self-hosted: Sora 500/600/700 + Inter 400/500/600 via `@fontsource`, headings render
      Sora, no request to `fonts.googleapis.com`.
- [ ] Button/badge variant maps match §5; no `gold`/`goldOutline` variants remain; all CTAs ≥44px.
- [ ] §6 verification grep returns zero matches.
- [ ] All 7 primitives exist at the exact paths in §7 with the exact prop contracts (02–06 depend
      on them), each with a passing test.
- [ ] 7 illustrations authored per §8 spec; hero JPG deleted; landing has no raster imagery.
- [ ] `<MotionConfig reducedMotion="user">` in `src/App.tsx`; zero `whileInView` in `src/`.
- [ ] `contrast.test.ts` + `anti-slop.test.ts` green; `npm run build && npm run lint && npm test`
      all green; FOUNDATION amendments from §1 recorded in `00-FOUNDATION.md`.

## Ordered implementation checklist

1. Record §1 amendments in `docs/plans/00-FOUNDATION.md` §1.1.
2. `npm i @fontsource/sora @fontsource/inter`; add imports to `src/main.tsx`.
3. Write new `src/index.css` (§2) + `tailwind.config.ts` (§3) + button/badge variants (§5)
   **and** run the §6 migration sweep in the same commit (rows 1–4 first, then 5–29).
4. Run §6 verification grep until clean; fix stragglers.
5. Hero rework: `bg-hero` panel, delete `src/assets/hero-entrepreneurs.jpg` + import, static
   content + single CSS fade (§8, §9).
6. Add `<MotionConfig reducedMotion="user">` to `src/App.tsx`; confirm zero `whileInView`.
7. Author `src/components/illustrations/*` (7 files + `index.ts` registry).
8. Build primitives in `src/components/common/` (§7); migrate `AdminPageHeader` call sites to
   `PageHeader`, delete `src/components/admin/AdminPageHeader.tsx`.
9. Write tests (§11 items 1–7); run full suite.
10. Manual QA pass (light/dark, keyboard, reduced-motion, 3G, Lighthouse); fix findings.
11. Hand off: notify plans 02–06 that primitives + tokens are stable (this doc §7 is the contract).
