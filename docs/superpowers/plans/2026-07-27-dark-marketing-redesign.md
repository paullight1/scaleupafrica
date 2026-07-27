# Dark-First Marketing Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Cresciva homepage as a dark-navy, orange-accented conversion page with fifteen sections, and move the disclaimer off the conversion path onto its own route.

**Architecture:** Phase 0 adds design tokens (`--mk-*` marketing surfaces, a brighter `--primary`) to the shared stylesheet and a presentational section kit to `Shared/src/components/marketing/`. Phase 1 composes the homepage from that kit, adds `/disclaimer` and `/faq` routes, and moves all hardcoded marketing copy into two content files under `Frontend/src/content/`. The kit is deliberately data-free so Phases 2–5 reuse it unchanged.

**Tech Stack:** Vite + React 18 + TypeScript, Tailwind (shared preset), shadcn/ui (Radix), React Router v6, TanStack Query, framer-motion (already installed), Vitest + Testing Library (jsdom), Supabase.

---

## Global Constraints

These apply to **every** task. Each task's requirements implicitly include this section.

- **Package manager is npm.** Never `bun`, never `yarn`. `bun.lockb` was deliberately removed.
- **Do not add any new runtime dependency.** framer-motion, lucide-react, date-fns, tailwindcss-animate are already present and are the only animation/icon/date/plugin libraries permitted.
- **Path aliases:** `@/` → `Frontend/src/`, `@shared/` → `Shared/src/`, `@contracts/` → `Shared/contracts/`. Files in `Shared/` MUST NOT import from `@/` — that dependency direction is one-way.
- **Design tokens live in `Shared/src/styles/index.css`.** Tailwind only *maps* them, in `Shared/tailwind.preset.ts`. Never add a colour to `Frontend/tailwind.config.ts` or `AdminPanel/tailwind.config.ts` — those files declare `content` globs only.
- **Never hardcode a hex colour in a component.** Use Tailwind classes bound to tokens.
- **Orange is never body text on a light background.** `--primary` on white is 2.84:1 and fails AA. Use `text-primary-dark` for orange-on-light icons/large text only.
- **Brand name is "Cresciva".** The membership is "The Cresciva Collective". Never "ScaleUp Africa". Contact address is `hello@cresciva.com`.
- **`id="pricing"` must survive.** `AppHeader` links to `/#pricing`; removing that anchor breaks site navigation. Same for `id="faq"`.
- **`Shared/src/components/ui/*` are stock shadcn.** Compose them; do not modify them.
- **Every marketing section renders `null` when its content array is empty.** Placeholder content must never reach production silently.
- **Run `npm test` from the repo root** (workspaces). Single file: `npx vitest run <path> --root Frontend`.

### Deviations from the spec — read before starting

Three spec items changed after inspecting the codebase. These are deliberate; do not "restore" the spec version.

1. **No custom `useReveal` hook.** The spec proposed one. `framer-motion` is already a dependency and `App.tsx` already wraps everything in `<MotionConfig reducedMotion="user">`, which disables transform animations under `prefers-reduced-motion` globally. A hand-rolled IntersectionObserver would duplicate that. Task 5 builds a thin `<Reveal>` wrapper over `motion.div` instead.
2. **No transparent-on-scroll header.** The spec proposed it. `AppHeader`'s docstring records that transparent-on-scroll was a **bug that was deliberately fixed**. Reintroducing it would regress known-fixed behaviour. The header stays solid navy — which sits fine against the dark canvas anyway. `AppHeader` is therefore *not* modified by this plan.
3. **No product screenshots.** The spec called for captured PNGs in `public/product/`. Task 12 renders mock product UI in the DOM inside a `BrowserFrame` component instead. This is responsive, keyboard-accessible, adds zero binary weight, never goes stale when the real UI changes, and removes a manual capture step that a fresh engineer cannot reliably reproduce.
4. **`AdminPanel/tailwind.config.ts` is NOT modified.** The spec listed it. Inspection shows both apps consume `Shared/tailwind.preset.ts`, and their own configs declare `content` globs only. Adding colours to the app configs would fork the design system. Task 2 touches the preset alone; the AdminPanel picks the tokens up automatically.

### Pre-existing issue found (NOT introduced here, NOT fixed here)

`Button`'s `active:bg-primary-dark` puts navy `#1B2A4A` on `#E44E2E` = **3.68:1**, below AA for a 14px label. This is true on `main` today and is unrelated to the palette change. Task 1's guard test documents it with an explicit `AA_LARGE` threshold and a comment so it is tracked rather than silently accepted. Do not change `--primary-dark` or `--ring` in this plan — they are consumed app-wide and widening scope here risks the admin panel.

---

## File Structure

**Create**

| File | Responsibility |
|---|---|
| `Shared/src/lib/color.ts` | Pure colour math: HSL→RGB, relative luminance, contrast ratio. No React. |
| `Shared/src/lib/__tests__/color.test.ts` | Unit tests for the above against known WCAG values. |
| `Shared/src/styles/__tests__/tokens.test.ts` | Reads `index.css`, asserts every token pair meets its contrast floor. Regression guard. |
| `Shared/src/components/marketing/Section.tsx` | Tone (`dark`/`darker`/`light`), vertical rhythm, max-width, horizontal padding. |
| `Shared/src/components/marketing/Eyebrow.tsx` | Small uppercase orange label. |
| `Shared/src/components/marketing/SectionHeading.tsx` | Display heading + optional lead, tone-aware. |
| `Shared/src/components/marketing/StatBand.tsx` | Stat row, orange numerals. |
| `Shared/src/components/marketing/LogoWall.tsx` | Grayscale logo row. |
| `Shared/src/components/marketing/TestimonialCard.tsx` | Quote, name, role, avatar. |
| `Shared/src/components/marketing/FeatureCard.tsx` | Icon, title, body. |
| `Shared/src/components/marketing/CTABand.tsx` | Closing CTA strip. |
| `Shared/src/components/marketing/BrowserFrame.tsx` | Chrome-less browser shell wrapping mock product UI. |
| `Shared/src/components/marketing/Reveal.tsx` | framer-motion scroll-reveal wrapper. |
| `Shared/src/components/marketing/index.ts` | Barrel export for the kit. |
| `Shared/src/components/marketing/__tests__/marketing.test.tsx` | Kit behaviour: empty-array `null` returns, tone classes. |
| `Frontend/src/content/homepage.ts` | All homepage marketing content the user must supply. |
| `Frontend/src/content/faqs.ts` | Single FAQ source, `homepage: boolean` per entry. |
| `Frontend/src/content/__tests__/content.test.ts` | Invariants: exactly 5 homepage FAQs, unique ids. |
| `Frontend/src/pages/Disclaimer.tsx` | Full five-point disclosure. |
| `Frontend/src/pages/FAQ.tsx` | All FAQs. |
| `Frontend/src/pages/__tests__/Disclaimer.test.tsx` | Renders all five points. |
| `Frontend/src/pages/__tests__/FAQ.test.tsx` | Renders all entries. |
| `Frontend/src/components/landing/TrustStrip.tsx` | §3 |
| `Frontend/src/components/landing/Stats.tsx` | §4 |
| `Frontend/src/components/landing/HowItWorks.tsx` | §6, replaces `Solution.tsx` |
| `Frontend/src/components/landing/DirectoryPreview.tsx` | §7 |
| `Frontend/src/components/landing/FundingPreview.tsx` | §8 |
| `Frontend/src/components/landing/Testimonials.tsx` | §9 |
| `Frontend/src/components/landing/Reassurance.tsx` | §11 |
| `Frontend/src/components/landing/Insights.tsx` | §12 |
| `Frontend/src/components/landing/ClosingCTA.tsx` | §14 |
| `Frontend/src/components/landing/__tests__/landing.test.tsx` | Empty-content rendering, reassurance neutrality. |
| `Frontend/src/components/landing/__tests__/Insights.test.tsx` | Blog teaser loading/error/empty states. Separate file because `vi.mock` hoists per-file. |
| `Frontend/src/pages/__tests__/Index.test.tsx` | Homepage composition + empty-content resilience. |
| `Frontend/public/logos/.gitkeep` | User drops partner logos here. |
| `Frontend/public/testimonials/.gitkeep` | User drops headshots here. |

**Modify**

| File | Change |
|---|---|
| `Shared/src/styles/index.css` | `--primary`/`--accent`/`--primary-hover` values; add `--mk-*`; retighten `--gradient-hero`. |
| `Shared/tailwind.preset.ts` | Map `mk-*` colours and the hero gradient. Both apps inherit it. |
| `Frontend/src/App.tsx` | Add `/disclaimer`, `/faq` lazy routes. |
| `Frontend/src/pages/Index.tsx` | New fifteen-section composition. |
| `Frontend/src/components/landing/Hero.tsx` | Type scale down, `min-h-[85vh]`, dark canvas. |
| `Frontend/src/components/landing/Problem.tsx` | Light tone via kit. |
| `Frontend/src/components/landing/Pricing.tsx` | Light tone, disclaimer link in fine print. Keep `id="pricing"`. |
| `Frontend/src/components/landing/FAQ.tsx` | Read from `faqs.ts`, 5 items, dark tone, "See all". Keep `id="faq"`. |
| `Frontend/src/components/common/AppFooter.tsx` | Disclaimer link in Legal column. |

**Delete**

| File | Reason |
|---|---|
| `Frontend/src/components/landing/Disclaimer.tsx` | Content moves to `pages/Disclaimer.tsx` (Task 7). |
| `Frontend/src/components/landing/Solution.tsx` | Superseded by `HowItWorks.tsx` (Task 11). |

---

## Task 1: Colour math + palette change + contrast guard

The brighter orange lands first, behind a test that fails if any pairing regresses.

**Files:**
- Create: `Shared/src/lib/color.ts`
- Create: `Shared/src/lib/__tests__/color.test.ts`
- Create: `Shared/src/styles/__tests__/tokens.test.ts`
- Modify: `Shared/src/styles/index.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `hslStringToRgb(s: string): [number, number, number]`, `relativeLuminance(rgb: [number,number,number]): number`, `contrastRatio(a: string, b: string): number` — both args HSL strings in the CSS custom-property format `"217 47% 20%"`.

- [ ] **Step 1: Write the failing colour-math test**

Create `Shared/src/lib/__tests__/color.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hslStringToRgb, relativeLuminance, contrastRatio } from "@shared/lib/color";

describe("hslStringToRgb", () => {
  it("parses the CSS custom-property format", () => {
    expect(hslStringToRgb("0 0% 100%")).toEqual([255, 255, 255]);
    expect(hslStringToRgb("0 0% 0%")).toEqual([0, 0, 0]);
  });

  it("round-trips the brand orange", () => {
    expect(hslStringToRgb("17.9 100% 58.6%")).toEqual([255, 107, 44]); // #FF6B2C
  });

  it("round-trips the brand navy", () => {
    expect(hslStringToRgb("217 47% 20%")).toEqual([27, 42, 74]); // #1B2A4A
  });
});

describe("relativeLuminance", () => {
  it("is 1 for white and 0 for black", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white", () => {
    expect(contrastRatio("0 0% 0%", "0 0% 100%")).toBeCloseTo(21, 2);
  });

  it("is symmetric", () => {
    const a = contrastRatio("217 47% 20%", "17.9 100% 58.6%");
    const b = contrastRatio("17.9 100% 58.6%", "217 47% 20%");
    expect(a).toBeCloseTo(b, 10);
  });

  it("matches the verified navy-on-orange ratio", () => {
    expect(contrastRatio("217 47% 20%", "17.9 100% 58.6%")).toBeCloseTo(5.01, 1);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/lib/__tests__/color.test.ts --root Shared`
Expected: FAIL — `Failed to resolve import "@shared/lib/color"`.

> If `--root Shared` has no vitest config, run from Frontend instead:
> `npx vitest run ../Shared/src/lib/__tests__/color.test.ts --root Frontend`
> Frontend's `vitest.config.ts` already aliases `@shared`. Use whichever resolves; use the same form for every later Shared-side test.

- [ ] **Step 3: Implement the colour math**

Create `Shared/src/lib/color.ts`:

```ts
/**
 * Colour math for design-token verification. Pure, dependency-free, no React.
 * Inputs use the CSS custom-property format our tokens are stored in:
 * `"217 47% 20%"` — space-separated H, S%, L%, no `hsl()` wrapper.
 */

export type Rgb = [number, number, number];

/** Parse `"217 47% 20%"` into 8-bit sRGB. Throws on malformed input. */
export function hslStringToRgb(value: string): Rgb {
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3) {
    throw new Error(`Expected "H S% L%", received "${value}"`);
  }
  const h = Number.parseFloat(parts[0]);
  const s = Number.parseFloat(parts[1]) / 100;
  const l = Number.parseFloat(parts[2]) / 100;
  if (![h, s, l].every(Number.isFinite)) {
    throw new Error(`Non-numeric component in "${value}"`);
  }

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];

  return [r, g, b].map((v) => Math.round((v + m) * 255)) as Rgb;
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const [rl, gl, bl] = [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG 2.1 contrast ratio between two HSL-string colours. Always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(hslStringToRgb(a));
  const lb = relativeLuminance(hslStringToRgb(b));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/lib/__tests__/color.test.ts --root Shared`
Expected: PASS — 7 tests.

- [ ] **Step 5: Write the failing token guard test**

Create `Shared/src/styles/__tests__/tokens.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contrastRatio } from "@shared/lib/color";

const CSS = readFileSync(
  fileURLToPath(new URL("../index.css", import.meta.url)),
  "utf8",
);

/** Read a custom property from the `:root` block (first declaration wins). */
function token(name: string): string {
  const match = CSS.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`Token --${name} not found in index.css`);
  return match[1].trim();
}

const AA = 4.5;
const AA_LARGE = 3;

describe("design tokens", () => {
  it("uses the brighter orange for --primary and --accent", () => {
    expect(token("primary")).toBe("17.9 100% 58.6%");
    expect(token("accent")).toBe("17.9 100% 58.6%");
  });

  it("brightens rather than darkens on hover, so the navy label holds AA", () => {
    const base = contrastRatio(token("primary-foreground"), token("primary"));
    const hover = contrastRatio(token("primary-foreground"), token("primary-hover"));
    expect(base).toBeGreaterThanOrEqual(AA);
    expect(hover).toBeGreaterThanOrEqual(AA);
    // The inversion itself: hover must be LIGHTER than base, or the label fails.
    expect(hover).toBeGreaterThan(base);
  });

  it.each([
    ["ink on canvas", "0 0% 100%", "mk-canvas", AA],
    ["muted ink on canvas", "mk-ink-muted", "mk-canvas", AA],
    ["muted ink on surface", "mk-ink-muted", "mk-surface", AA],
    ["muted ink on raised", "mk-ink-muted", "mk-raised", AA],
    ["orange on canvas", "primary", "mk-canvas", AA],
    ["orange on surface", "primary", "mk-surface", AA],
    ["orange on raised", "primary", "mk-raised", AA],
  ])("%s meets its floor", (_label, fg, bg, floor) => {
    const fgValue = fg.includes("%") ? fg : token(fg);
    const bgValue = bg.includes("%") ? bg : token(bg);
    expect(contrastRatio(fgValue, bgValue)).toBeGreaterThanOrEqual(floor);
  });

  it("holds at least the large-text floor on the pressed state", () => {
    // Button uses `active:bg-primary-dark` with a navy label — currently 3.68:1,
    // below AA for a 14px label. PRE-EXISTING on main, not introduced by the
    // palette change, and deliberately not fixed here (--primary-dark is
    // consumed app-wide incl. AdminPanel).
    //
    // The floor is AA_LARGE so this cannot regress further, and so the test
    // keeps passing if someone later raises it to full AA. Do NOT add an upper
    // bound asserting it still fails — that would break the fix.
    const pressed = contrastRatio(token("primary-foreground"), token("primary-dark"));
    expect(pressed).toBeGreaterThanOrEqual(AA_LARGE);
  });
});
```

- [ ] **Step 6: Run and confirm it fails**

Run: `npx vitest run src/styles/__tests__/tokens.test.ts --root Shared`
Expected: FAIL — `--primary` is still `11 100% 68%`, and `--mk-canvas` is not found.

- [ ] **Step 7: Update the tokens**

In `Shared/src/styles/index.css`, inside the `:root` block, replace these three lines:

```css
    --primary: 11 100% 68%;             /* #FF7A59 orange — CTAs, active */
    --primary-foreground: 217 47% 20%;  /* navy label on orange (AA, see plan §1) */
    --primary-hover: 12 100% 61%;       /* ~#FF5E37 — nudged +1% L so navy label ≥4.5:1 AA (see plan §1) */
```

with:

```css
    --primary: 17.9 100% 58.6%;         /* #FF6B2C orange — CTAs, active */
    --primary-foreground: 217 47% 20%;  /* navy label on orange — 5.01:1 AA */
    /* Hover BRIGHTENS. Darkening (#F25A18) drops the navy label to 4.23:1 and
       fails AA. Do not "fix" this back to a darker value. */
    --primary-hover: 19.6 100% 63.9%;   /* #FF8347 — navy label 5.82:1 AA */
```

In the same block, replace:

```css
    --accent: 11 100% 68%;
```

with:

```css
    --accent: 17.9 100% 58.6%;
```

Leave `--primary-dark` and `--ring` untouched — see "Pre-existing issue" above.

- [ ] **Step 8: Add the marketing surface tokens**

In the same `:root` block, immediately after the `--navy-dark:` line, insert:

```css
    /* Marketing surfaces — dark-first landing sections. Declared once and NOT
       overridden in .dark: these sections are dark in both themes by design. */
    --mk-canvas: 216.5 59% 7.6%;        /* #08111F page base, deepest */
    --mk-surface: 216 52.2% 13.1%;      /* #101E33 cards, panels */
    --mk-raised: 216 48.4% 18.2%;       /* #182A45 hover, elevated */
    --mk-border: 214.3 36.2% 22.7%;     /* #25374F hairlines on dark */
    --mk-ink-muted: 213.5 23.9% 72.2%;  /* #A7B6C9 body copy on dark, 9.17:1 */
```

Then retighten the hero gradient to the new canvas range — replace:

```css
    --gradient-hero: linear-gradient(160deg, #12263A 0%, #1B2A4A 55%, #0D1B2E 100%);
```

with:

```css
    --gradient-hero: linear-gradient(160deg, #101E33 0%, #08111F 60%, #050B14 100%);
```

Also update the `.dark` block's `--primary`, `--primary-hover`, and `--accent` to the same three new values, so the two themes do not diverge. The `.dark` block currently repeats `11 100% 68%` / `12 100% 61%` / `11 100% 68%` for these.

- [ ] **Step 9: Run the guard and confirm it passes**

Run: `npx vitest run src/styles/__tests__/tokens.test.ts --root Shared`
Expected: PASS — 10 tests (2 + 7 parameterised + 1).

- [ ] **Step 10: Run the whole suite for regressions**

Run: `npm test`
Expected: PASS — the pre-existing 211 Frontend tests plus the new ones. No snapshot of a colour value should break; if one does, it hardcoded a hex and must be changed to a token class.

- [ ] **Step 11: Commit**

```bash
git add Shared/src/lib/color.ts Shared/src/lib/__tests__/color.test.ts \
        Shared/src/styles/__tests__/tokens.test.ts Shared/src/styles/index.css
git commit -m "feat(theme): brighter #FF6B2C orange, hover inversion, marketing surface tokens"
```

---

## Task 2: Map the marketing tokens into Tailwind

**Files:**
- Modify: `Shared/tailwind.preset.ts`

**Interfaces:**
- Consumes: `--mk-*` tokens from Task 1.
- Produces: Tailwind classes `bg-mk-canvas`, `bg-mk-surface`, `bg-mk-raised`, `border-mk-border`, `text-mk-ink-muted`, and `bg-gradient-hero`.

- [ ] **Step 1: Add the colours to the preset**

In `Shared/tailwind.preset.ts`, inside `theme.extend.colors`, immediately after the `surface: { ... }` entry, insert:

```ts
        mk: {
          canvas: "hsl(var(--mk-canvas))",
          surface: "hsl(var(--mk-surface))",
          raised: "hsl(var(--mk-raised))",
          border: "hsl(var(--mk-border))",
          "ink-muted": "hsl(var(--mk-ink-muted))",
        },
```

- [ ] **Step 2: Expose the hero gradient as a background image**

In the same `theme.extend` object, immediately after the `colors: { ... }` block, insert:

```ts
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
      },
```

- [ ] **Step 3: Verify the classes compile**

Run: `npm run build:web`
Expected: build succeeds. Tailwind silently drops unknown classes, so also confirm generation explicitly:

```bash
grep -c "mk-canvas\|gradient-hero" Frontend/dist/assets/*.css
```

Expected: `0` at this point — nothing uses the classes yet. That is correct; this step only proves the config parses. Task 9 re-runs this check with a non-zero expectation.

- [ ] **Step 4: Commit**

```bash
git add Shared/tailwind.preset.ts
git commit -m "feat(theme): map mk-* surfaces and hero gradient into the Tailwind preset"
```

---

## Task 3: Section kit — layout primitives

**Files:**
- Create: `Shared/src/components/marketing/Section.tsx`
- Create: `Shared/src/components/marketing/Eyebrow.tsx`
- Create: `Shared/src/components/marketing/SectionHeading.tsx`
- Create: `Shared/src/components/marketing/__tests__/marketing.test.tsx`

**Interfaces:**
- Consumes: `mk-*` Tailwind classes (Task 2), `cn` from `@shared/lib/utils`.
- Produces:
  - `<Section tone?: "dark" | "darker" | "light"; id?: string; className?: string; innerClassName?: string; children>` — renders `<section>`.
  - `<Eyebrow tone?: "dark" | "light"; children>` — renders `<p>`.
  - `<SectionHeading tone?: "dark" | "light"; eyebrow?: string; title: ReactNode; lead?: ReactNode; align?: "center" | "left"; className?: string>` — renders a heading block containing `<h2>`.

- [ ] **Step 1: Write the failing test**

Create `Shared/src/components/marketing/__tests__/marketing.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Section, Eyebrow, SectionHeading } from "@shared/components/marketing";

describe("Section", () => {
  it("defaults to the dark canvas", () => {
    const { container } = render(<Section>body</Section>);
    expect(container.querySelector("section")).toHaveClass("bg-mk-canvas");
  });

  it("renders the light tone when asked", () => {
    const { container } = render(<Section tone="light">body</Section>);
    expect(container.querySelector("section")).toHaveClass("bg-surface-subtle");
  });

  it("forwards an id so anchor links keep working", () => {
    const { container } = render(<Section id="pricing">body</Section>);
    expect(container.querySelector("section")).toHaveAttribute("id", "pricing");
  });
});

describe("SectionHeading", () => {
  it("renders the title as an h2", () => {
    render(<SectionHeading title="Two tools" />);
    expect(screen.getByRole("heading", { level: 2, name: "Two tools" })).toBeInTheDocument();
  });

  it("renders the eyebrow and lead when supplied", () => {
    render(<SectionHeading eyebrow="How it works" title="Two tools" lead="A lead." />);
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("A lead.")).toBeInTheDocument();
  });

  it("omits the eyebrow element entirely when not supplied", () => {
    const { container } = render(<SectionHeading title="Two tools" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});

describe("Eyebrow", () => {
  it("renders orange on dark by default", () => {
    render(<Eyebrow>Members only</Eyebrow>);
    expect(screen.getByText("Members only")).toHaveClass("text-primary");
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/components/marketing/__tests__/marketing.test.tsx --root Shared`
Expected: FAIL — cannot resolve `@shared/components/marketing`.

- [ ] **Step 3: Implement `Section`**

Create `Shared/src/components/marketing/Section.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

export type SectionTone = "dark" | "darker" | "light";

const TONE_CLASS: Record<SectionTone, string> = {
  dark: "bg-mk-canvas text-white",
  darker: "bg-[hsl(216_55%_5%)] text-white",
  light: "bg-surface-subtle text-foreground",
};

interface SectionProps {
  tone?: SectionTone;
  /** Anchor target. `pricing` and `faq` are linked from the header — keep them. */
  id?: string;
  className?: string;
  /** Applied to the inner max-width container. */
  innerClassName?: string;
  children: ReactNode;
}

/**
 * The one place vertical rhythm and page gutters are defined for marketing
 * sections. Pages compose this rather than hand-rolling padding, so Phases 2-5
 * stay consistent with the homepage for free.
 */
export function Section({
  tone = "dark",
  id,
  className,
  innerClassName,
  children,
}: SectionProps) {
  return (
    <section id={id} className={cn("py-20 md:py-28", TONE_CLASS[tone], className)}>
      <div className={cn("mx-auto max-w-7xl px-6 lg:px-8", innerClassName)}>{children}</div>
    </section>
  );
}

export default Section;
```

- [ ] **Step 4: Implement `Eyebrow`**

Create `Shared/src/components/marketing/Eyebrow.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

interface EyebrowProps {
  /** `dark` = on a dark section (orange). `light` = on a light section. */
  tone?: "dark" | "light";
  className?: string;
  children: ReactNode;
}

/**
 * Small uppercase label above a section heading. On light sections it uses
 * `primary-dark`, never `primary` — plain orange on white is 2.84:1 and fails AA.
 */
export function Eyebrow({ tone = "dark", className, children }: EyebrowProps) {
  return (
    <p
      className={cn(
        "text-sm font-semibold uppercase tracking-wider",
        tone === "dark" ? "text-primary" : "text-primary-dark",
        className,
      )}
    >
      {children}
    </p>
  );
}

export default Eyebrow;
```

- [ ] **Step 5: Implement `SectionHeading`**

Create `Shared/src/components/marketing/SectionHeading.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { Eyebrow } from "./Eyebrow";

interface SectionHeadingProps {
  tone?: "dark" | "light";
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({
  tone = "dark",
  eyebrow,
  title,
  lead,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && <Eyebrow tone={tone} className="mb-4">{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "font-display text-3xl font-bold md:text-4xl",
          tone === "dark" ? "text-white" : "text-ink-strong",
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            "mt-5 text-lg leading-relaxed",
            tone === "dark" ? "text-mk-ink-muted" : "text-muted-foreground",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

export default SectionHeading;
```

- [ ] **Step 6: Create the barrel**

Create `Shared/src/components/marketing/index.ts`:

```ts
export { Section, type SectionTone } from "./Section";
export { Eyebrow } from "./Eyebrow";
export { SectionHeading } from "./SectionHeading";
```

- [ ] **Step 7: Run and confirm it passes**

Run: `npx vitest run src/components/marketing/__tests__/marketing.test.tsx --root Shared`
Expected: PASS — 7 tests.

- [ ] **Step 8: Commit**

```bash
git add Shared/src/components/marketing/
git commit -m "feat(marketing): add Section, Eyebrow and SectionHeading primitives"
```

---

## Task 4: Section kit — content components

**Files:**
- Create: `Shared/src/components/marketing/{StatBand,LogoWall,TestimonialCard,FeatureCard,CTABand}.tsx`
- Modify: `Shared/src/components/marketing/index.ts`
- Modify: `Shared/src/components/marketing/__tests__/marketing.test.tsx`

**Interfaces:**
- Consumes: `Section` primitives (Task 3).
- Produces:
  - `type Stat = { value: string; label: string }`; `<StatBand items: Stat[]>` — returns `null` when `items` is empty.
  - `type Partner = { name: string; logo: string }`; `<LogoWall items: Partner[]; className?: string>` — returns `null` when empty.
  - `type Testimonial = { quote: string; name: string; role: string; avatar?: string }`; `<TestimonialCard item: Testimonial>`.
  - `<FeatureCard icon: LucideIcon; step?: number; title: string; body: string>`.
  - `<CTABand title: string; body?: string; children: ReactNode>` — `children` holds the action buttons.

- [ ] **Step 1: Extend the test file**

Append to `Shared/src/components/marketing/__tests__/marketing.test.tsx`:

```tsx
import { StatBand, LogoWall, TestimonialCard, FeatureCard, CTABand } from "@shared/components/marketing";
import { Radar } from "lucide-react";

describe("StatBand", () => {
  it("renders nothing when there are no stats", () => {
    const { container } = render(<StatBand items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each value and label", () => {
    render(<StatBand items={[{ value: "1,200+", label: "SMEs listed" }]} />);
    expect(screen.getByText("1,200+")).toBeInTheDocument();
    expect(screen.getByText("SMEs listed")).toBeInTheDocument();
  });
});

describe("LogoWall", () => {
  it("renders nothing when there are no partners", () => {
    const { container } = render(<LogoWall items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("uses the partner name as alt text", () => {
    render(<LogoWall items={[{ name: "Acme", logo: "/logos/acme.svg" }]} />);
    expect(screen.getByAltText("Acme")).toHaveAttribute("src", "/logos/acme.svg");
  });
});

describe("TestimonialCard", () => {
  it("renders the quote inside a blockquote with attribution", () => {
    render(
      <TestimonialCard
        item={{ quote: "Changed how we raise.", name: "Ada", role: "Founder, Kano" }}
      />,
    );
    expect(screen.getByText(/Changed how we raise/)).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Founder, Kano")).toBeInTheDocument();
  });

  it("falls back to an initial when no avatar is supplied", () => {
    render(<TestimonialCard item={{ quote: "q", name: "Ada", role: "r" }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});

describe("FeatureCard", () => {
  it("renders the step number when supplied", () => {
    render(<FeatureCard icon={Radar} step={2} title="Get discovered" body="Buyers find you." />);
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Get discovered" })).toBeInTheDocument();
  });
});

describe("CTABand", () => {
  it("renders its actions", () => {
    render(<CTABand title="Ready?"><button type="button">Go</button></CTABand>);
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/components/marketing/__tests__/marketing.test.tsx --root Shared`
Expected: FAIL — `StatBand` is not exported.

- [ ] **Step 3: Implement `StatBand`**

Create `Shared/src/components/marketing/StatBand.tsx`:

```tsx
import { cn } from "@shared/lib/utils";

export type Stat = { value: string; label: string };

/**
 * Renders `null` on an empty list so an unfilled content file never ships an
 * empty band to production.
 */
export function StatBand({ items, className }: { items: Stat[]; className?: string }) {
  if (items.length === 0) return null;

  return (
    <dl className={cn("grid grid-cols-2 gap-8 lg:grid-cols-4", className)}>
      {items.map((stat) => (
        <div key={stat.label} className="text-center">
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span className="block font-display text-4xl font-bold text-primary md:text-5xl">
              {stat.value}
            </span>
            <span className="mt-2 block text-sm text-mk-ink-muted">{stat.label}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default StatBand;
```

- [ ] **Step 4: Implement `LogoWall`**

Create `Shared/src/components/marketing/LogoWall.tsx`:

```tsx
import { cn } from "@shared/lib/utils";

export type Partner = { name: string; logo: string };

/** Grayscale partner logos, full colour on hover. `null` when empty. */
export function LogoWall({ items, className }: { items: Partner[]; className?: string }) {
  if (items.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap items-center justify-center gap-x-12 gap-y-8", className)}>
      {items.map((partner) => (
        <li key={partner.name}>
          <img
            src={partner.logo}
            alt={partner.name}
            loading="lazy"
            className="h-8 w-auto opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0 md:h-10"
          />
        </li>
      ))}
    </ul>
  );
}

export default LogoWall;
```

- [ ] **Step 5: Implement `TestimonialCard`**

Create `Shared/src/components/marketing/TestimonialCard.tsx`:

```tsx
export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  /** Path under /testimonials. Omit to render an initial instead. */
  avatar?: string;
};

export function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <figure className="flex h-full flex-col rounded-xl border border-mk-border bg-mk-surface p-8">
      <blockquote className="flex-1 text-lg leading-relaxed text-white">
        &ldquo;{item.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-4">
        {item.avatar ? (
          <img
            src={item.avatar}
            alt=""
            loading="lazy"
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-full bg-mk-raised font-display font-bold text-primary"
          >
            {item.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="block font-semibold text-white">{item.name}</span>
          <span className="block text-sm text-mk-ink-muted">{item.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export default TestimonialCard;
```

- [ ] **Step 6: Implement `FeatureCard`**

Create `Shared/src/components/marketing/FeatureCard.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  /** 1-based; rendered zero-padded as an ordinal marker. */
  step?: number;
  title: string;
  body: string;
}

export function FeatureCard({ icon: Icon, step, title, body }: FeatureCardProps) {
  return (
    <div className="h-full rounded-xl border border-mk-border bg-mk-surface p-8 transition-colors hover:border-primary/40 hover:bg-mk-raised">
      <div className="mb-6 flex items-center gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="h-6 w-6" />
        </span>
        {step !== undefined && (
          <span aria-hidden className="font-display text-2xl font-bold text-mk-raised">
            {String(step).padStart(2, "0")}
          </span>
        )}
      </div>
      <h3 className="mb-3 font-display text-xl font-bold text-white">{title}</h3>
      <p className="leading-relaxed text-mk-ink-muted">{body}</p>
    </div>
  );
}

export default FeatureCard;
```

> Note: the step marker uses `text-mk-raised` — a very low-contrast decorative
> numeral on the card surface. It is `aria-hidden` and carries no information the
> title does not, so it is exempt from the contrast floor by WCAG 1.4.3.

- [ ] **Step 7: Implement `CTABand`**

Create `Shared/src/components/marketing/CTABand.tsx`:

```tsx
import type { ReactNode } from "react";

interface CTABandProps {
  title: string;
  body?: string;
  /** Action buttons/links. */
  children: ReactNode;
}

export function CTABand({ title, body, children }: CTABandProps) {
  return (
    <div className="rounded-2xl border border-mk-border bg-mk-surface px-8 py-14 text-center md:px-16">
      <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-white md:text-4xl">
        {title}
      </h2>
      {body && <p className="mx-auto mt-5 max-w-xl text-lg text-mk-ink-muted">{body}</p>}
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        {children}
      </div>
    </div>
  );
}

export default CTABand;
```

- [ ] **Step 8: Extend the barrel**

Replace the contents of `Shared/src/components/marketing/index.ts` with:

```ts
export { Section, type SectionTone } from "./Section";
export { Eyebrow } from "./Eyebrow";
export { SectionHeading } from "./SectionHeading";
export { StatBand, type Stat } from "./StatBand";
export { LogoWall, type Partner } from "./LogoWall";
export { TestimonialCard, type Testimonial } from "./TestimonialCard";
export { FeatureCard } from "./FeatureCard";
export { CTABand } from "./CTABand";
```

- [ ] **Step 9: Run and confirm it passes**

Run: `npx vitest run src/components/marketing/__tests__/marketing.test.tsx --root Shared`
Expected: PASS — 15 tests.

- [ ] **Step 10: Commit**

```bash
git add Shared/src/components/marketing/
git commit -m "feat(marketing): add StatBand, LogoWall, TestimonialCard, FeatureCard, CTABand"
```

---

## Task 5: Reveal wrapper and BrowserFrame

**Files:**
- Create: `Shared/src/components/marketing/Reveal.tsx`
- Create: `Shared/src/components/marketing/BrowserFrame.tsx`
- Modify: `Shared/src/components/marketing/index.ts`
- Modify: `Shared/src/components/marketing/__tests__/marketing.test.tsx`

**Interfaces:**
- Consumes: `framer-motion` (already installed).
- Produces:
  - `<Reveal delay?: number; className?: string; children>` — fades and lifts on scroll into view, once.
  - `<BrowserFrame label: string; children; className?: string>` — decorative browser chrome around mock product UI.

- [ ] **Step 1: Extend the test file**

Append to `Shared/src/components/marketing/__tests__/marketing.test.tsx`:

```tsx
import { Reveal, BrowserFrame } from "@shared/components/marketing";

describe("Reveal", () => {
  it("always renders its children (content must never depend on animation)", () => {
    render(<Reveal><p>Visible content</p></Reveal>);
    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });
});

describe("BrowserFrame", () => {
  it("shows the address label and wraps its children", () => {
    render(<BrowserFrame label="cresciva.com/directory"><p>rows</p></BrowserFrame>);
    expect(screen.getByText("cresciva.com/directory")).toBeInTheDocument();
    expect(screen.getByText("rows")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/components/marketing/__tests__/marketing.test.tsx --root Shared`
Expected: FAIL — `Reveal` is not exported.

- [ ] **Step 3: Implement `Reveal`**

Create `Shared/src/components/marketing/Reveal.tsx`:

```tsx
import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface RevealProps {
  /** Stagger, in seconds. */
  delay?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Scroll-reveal wrapper. Deliberately thin: `App.tsx` already wraps the tree in
 * `<MotionConfig reducedMotion="user">`, so framer-motion suppresses the
 * transform for users with `prefers-reduced-motion: reduce`. Do not hand-roll an
 * IntersectionObserver here — it would bypass that global setting.
 *
 * Opacity starts at 1 in the initial state's absence of animation support, so
 * content is never hidden from crawlers or from a failed animation.
 */
export function Reveal({ delay = 0, className, children }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
```

- [ ] **Step 4: Implement `BrowserFrame`**

Create `Shared/src/components/marketing/BrowserFrame.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";

interface BrowserFrameProps {
  /** Shown in the fake address bar, e.g. "cresciva.com/directory". */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * Decorative browser chrome around live mock product UI.
 *
 * We render real DOM rather than screenshotting the app: it stays responsive,
 * stays accessible, adds no binary weight, and cannot go stale when the real
 * product UI changes. The chrome itself is decorative and hidden from a11y.
 */
export function BrowserFrame({ label, className, children }: BrowserFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-mk-border bg-mk-surface shadow-elevated",
        className,
      )}
    >
      <div
        aria-hidden
        className="flex items-center gap-2 border-b border-mk-border bg-mk-raised px-4 py-3"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-mk-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-mk-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-mk-border" />
        <span className="ml-3 truncate rounded-md bg-mk-canvas px-3 py-1 text-xs text-mk-ink-muted">
          {label}
        </span>
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}

export default BrowserFrame;
```

- [ ] **Step 5: Extend the barrel**

Append to `Shared/src/components/marketing/index.ts`:

```ts
export { Reveal } from "./Reveal";
export { BrowserFrame } from "./BrowserFrame";
```

- [ ] **Step 6: Run and confirm it passes**

Run: `npx vitest run src/components/marketing/__tests__/marketing.test.tsx --root Shared`
Expected: PASS — 17 tests.

- [ ] **Step 7: Commit**

```bash
git add Shared/src/components/marketing/
git commit -m "feat(marketing): add Reveal and BrowserFrame"
```

---

## Task 6: Content files

**Files:**
- Create: `Frontend/src/content/homepage.ts`
- Create: `Frontend/src/content/faqs.ts`
- Create: `Frontend/src/content/__tests__/content.test.ts`
- Create: `Frontend/public/logos/.gitkeep`
- Create: `Frontend/public/testimonials/.gitkeep`

**Interfaces:**
- Consumes: `Stat`, `Partner`, `Testimonial` types from `@shared/components/marketing`.
- Produces:
  - From `@/content/homepage`: `TRUST_LINE: string`, `STATS: Stat[]`, `PARTNERS: Partner[]`, `TESTIMONIALS: Testimonial[]`, `SAMPLE_PROFILES: SampleProfile[]`, `SAMPLE_OPPORTUNITIES: SampleOpportunity[]`.
  - `type SampleProfile = { name: string; sector: string; country: string; blurb: string }`.
  - `type SampleOpportunity = { title: string; funder: string; amount: string; deadline: string; tags: string[] }`.
  - From `@/content/faqs`: `type Faq = { id: string; question: string; answer: string; homepage: boolean }`, `FAQS: Faq[]`, `HOMEPAGE_FAQS: Faq[]`.

- [ ] **Step 1: Write the failing test**

Create `Frontend/src/content/__tests__/content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { FAQS, HOMEPAGE_FAQS } from "@/content/faqs";
import { STATS, PARTNERS, TESTIMONIALS, SAMPLE_PROFILES, SAMPLE_OPPORTUNITIES } from "@/content/homepage";

describe("faqs", () => {
  it("keeps every original answer", () => {
    expect(FAQS).toHaveLength(9);
  });

  it("shows exactly five on the homepage", () => {
    expect(HOMEPAGE_FAQS).toHaveLength(5);
  });

  it("derives the homepage list from the full list", () => {
    expect(HOMEPAGE_FAQS.every((f) => FAQS.includes(f))).toBe(true);
  });

  it("has unique ids", () => {
    expect(new Set(FAQS.map((f) => f.id)).size).toBe(FAQS.length);
  });

  it("has no empty answers", () => {
    expect(FAQS.every((f) => f.answer.trim().length > 0)).toBe(true);
  });
});

describe("homepage content", () => {
  it("ships four stats", () => {
    expect(STATS).toHaveLength(4);
  });

  it("ships sample product data for the previews", () => {
    expect(SAMPLE_PROFILES.length).toBeGreaterThanOrEqual(3);
    expect(SAMPLE_OPPORTUNITIES.length).toBeGreaterThanOrEqual(3);
  });

  // These assert the INVARIANT, not the current emptiness: they are vacuously
  // true while PARTNERS/TESTIMONIALS are empty and become real checks once the
  // user fills them in. Do NOT replace these with `toEqual([])` — that would
  // fail the moment real content is added.
  it("gives every partner a name and a logo under /logos/", () => {
    for (const partner of PARTNERS) {
      expect(partner.name.trim()).not.toBe("");
      expect(partner.logo).toMatch(/^\/logos\//);
    }
  });

  it("gives every testimonial a quote, a name and a role", () => {
    for (const item of TESTIMONIALS) {
      expect(item.quote.trim()).not.toBe("");
      expect(item.name.trim()).not.toBe("");
      expect(item.role.trim()).not.toBe("");
      if (item.avatar) expect(item.avatar).toMatch(/^\/testimonials\//);
    }
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/content/__tests__/content.test.ts --root Frontend`
Expected: FAIL — cannot resolve `@/content/faqs`.

- [ ] **Step 3: Create the FAQ content file**

Create `Frontend/src/content/faqs.ts`. Answers are copied **verbatim** from the current `Frontend/src/components/landing/FAQ.tsx` — do not reword them:

```ts
export type Faq = {
  id: string;
  question: string;
  answer: string;
  /** Shown in the trimmed homepage section. The rest live on /faq. */
  homepage: boolean;
};

/**
 * Single source of truth for both the homepage section and /faq.
 * `homepage: true` marks the five questions that block a purchase decision;
 * the others are positioning questions that do not.
 */
export const FAQS: Faq[] = [
  {
    id: "who-for",
    question: "Which SMEs is the Collective for?",
    answer:
      "The Collective is sector-agnostic. We welcome African SME founders across all industries who are ready to scale their businesses with structure and access to curated capital intelligence.",
    homepage: false,
  },
  {
    id: "directory-free",
    question: "Is the SME Directory free?",
    answer:
      "Yes. The Pan-African SME Directory is free to join and public. Create a profile in minutes and become discoverable to buyers, partners, and collaborators across the continent.",
    homepage: true,
  },
  {
    id: "funding-radar",
    question: "What is the Funding Radar?",
    answer:
      "The Funding Radar is our AI-powered page that aggregates relevant grants, competitions, accelerators, pitch events, and development finance opportunities for African SMEs. Enter keywords describing your business and get a curated list.",
    homepage: true,
  },
  {
    id: "radar-access",
    question: "How do I access the Funding Radar?",
    answer:
      "The Funding Radar is available exclusively to active Collective members with an annual subscription. Once your subscription expires, access is revoked until you resubscribe.",
    homepage: false,
  },
  {
    id: "payment",
    question: "How do I pay, and in which currency?",
    answer:
      "Card payments are processed securely by Paystack in Nigerian Naira (NGN) or US Dollars (USD). If you pay a USD price with a local card, your bank converts at its own rate. Prefer mobile money or a bank transfer? Message us on WhatsApp — we confirm your payment and activate your membership within 12 hours.",
    homepage: true,
  },
  {
    id: "access-speed",
    question: "How fast is access after I pay?",
    answer:
      "Card payments are automatic — access is usually unlocked in under a minute once the payment is confirmed. Bank transfers and mobile-money payments handled by our concierge are activated within 12 hours.",
    homepage: true,
  },
  {
    id: "monthly-plan",
    question: "Is there a monthly plan?",
    answer:
      "We offer an annual membership only. This keeps the community focused, committed, and easier to serve deeply throughout the year.",
    homepage: false,
  },
  {
    id: "auto-renew",
    question: "Does my membership auto-renew? Can I cancel?",
    answer:
      "No auto-renew — we never store your card or charge you again, so there's nothing to cancel. Your access runs until it expires; renew any time (renewing early adds a year to your current expiry). We don't provide partial refunds.",
    homepage: true,
  },
  {
    id: "differentiation",
    question: "How is this different from other founder communities?",
    answer:
      "Two things set us apart: a free public directory that gives every African founder visibility, and AI-curated capital intelligence filtered specifically for African SMEs ready to scale.",
    homepage: false,
  },
];

export const HOMEPAGE_FAQS: Faq[] = FAQS.filter((f) => f.homepage);
```

- [ ] **Step 4: Create the homepage content file**

Create `Frontend/src/content/homepage.ts`:

```ts
import type { Stat, Partner, Testimonial } from "@shared/components/marketing";

/**
 * Everything on the homepage that is a factual claim about Cresciva lives here,
 * so it can be confirmed in one place rather than hunted across components.
 *
 * PARTNERS and TESTIMONIALS start EMPTY on purpose. Their sections render
 * `null` when empty, so the page degrades to "no logo wall" rather than to
 * "fake logo wall". Fill them in only with real, permissioned assets.
 */

/** Context line above the partner logos. Makes a factual claim — confirm it. */
export const TRUST_LINE = "Founders building across 20+ African markets"; // TODO: confirm with real data

/** TODO: confirm every figure below with real data before launch. */
export const STATS: Stat[] = [
  { value: "1,200+", label: "SMEs listed" }, // TODO: confirm with real data
  { value: "20+", label: "African markets" }, // TODO: confirm with real data
  { value: "450+", label: "Funding calls tracked" }, // TODO: confirm with real data
  { value: "$2.4B", label: "Capital represented" }, // TODO: confirm with real data
];

/** Drop logo files into Frontend/public/logos/ and list them here. */
export const PARTNERS: Partner[] = [];

/** Drop headshots into Frontend/public/testimonials/ and list them here. */
export const TESTIMONIALS: Testimonial[] = [];

export type SampleProfile = {
  name: string;
  sector: string;
  country: string;
  blurb: string;
};

/**
 * Illustrative directory rows for the §7 preview. Static by design: the
 * homepage must not depend on a network round-trip, and must not degrade if
 * the directory query fails. These are clearly illustrative, not real members.
 */
export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    name: "Kano Agro Processing",
    sector: "Agriculture",
    country: "Nigeria",
    blurb: "Rice milling and packaging for northern Nigerian retail chains.",
  },
  {
    name: "Sahara Solar Works",
    sector: "Energy",
    country: "Kenya",
    blurb: "Off-grid solar installation for rural clinics and schools.",
  },
  {
    name: "Accra Textile Studio",
    sector: "Manufacturing",
    country: "Ghana",
    blurb: "Small-batch woven textiles for export to European buyers.",
  },
];

export type SampleOpportunity = {
  title: string;
  funder: string;
  amount: string;
  deadline: string;
  tags: string[];
};

/** Illustrative funding rows for the §8 preview. */
export const SAMPLE_OPPORTUNITIES: SampleOpportunity[] = [
  {
    title: "Agri-SME Growth Grant",
    funder: "West Africa Development Fund",
    amount: "$25,000 – $100,000",
    deadline: "Rolling",
    tags: ["Grant", "Agriculture"],
  },
  {
    title: "Clean Energy Accelerator, Cohort 6",
    funder: "Pan-African Climate Initiative",
    amount: "Equity-free, $50,000",
    deadline: "Quarterly",
    tags: ["Accelerator", "Energy"],
  },
  {
    title: "Women-Led Manufacturing Fellowship",
    funder: "Continental Enterprise Trust",
    amount: "$15,000 + mentorship",
    deadline: "Annual",
    tags: ["Fellowship", "Manufacturing"],
  },
];
```

- [ ] **Step 5: Create the asset folders**

```bash
mkdir -p Frontend/public/logos Frontend/public/testimonials
touch Frontend/public/logos/.gitkeep Frontend/public/testimonials/.gitkeep
```

- [ ] **Step 6: Run and confirm it passes**

Run: `npx vitest run src/content/__tests__/content.test.ts --root Frontend`
Expected: PASS — 9 tests.

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/content/ Frontend/public/logos Frontend/public/testimonials
git commit -m "feat(content): extract homepage and FAQ content into editable content files"
```

---

## Task 7: `/disclaimer` page + footer link

**Files:**
- Create: `Frontend/src/pages/Disclaimer.tsx`
- Create: `Frontend/src/pages/__tests__/Disclaimer.test.tsx`
- Modify: `Frontend/src/App.tsx`
- Modify: `Frontend/src/components/common/AppFooter.tsx`
- Delete: `Frontend/src/components/landing/Disclaimer.tsx`

**Interfaces:**
- Consumes: `SEO`, `PageHeader` from `@shared/components/common`.
- Produces: route `/disclaimer`; default-exported `Disclaimer` page component.

- [ ] **Step 1: Write the failing test**

Create `Frontend/src/pages/__tests__/Disclaimer.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Disclaimer from "@/pages/Disclaimer";

function renderPage() {
  return render(
    <MemoryRouter>
      <Disclaimer />
    </MemoryRouter>,
  );
}

describe("Disclaimer page", () => {
  it("carries all five disclosure points", () => {
    renderPage();
    for (const heading of [
      "We Are Not a Funding Organization",
      "No Guarantee of Grant Success",
      "We Do Not Write Applications",
      "Directory Listings Are Member-Provided",
      "Information Accuracy",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });

  it("keeps the summary paragraph", () => {
    renderPage();
    expect(screen.getByText(/supportive partner in the scaling/i)).toBeInTheDocument();
  });

  it("does not use alarm styling", () => {
    const { container } = renderPage();
    expect(container.querySelector(".text-destructive")).toBeNull();
    expect(container.querySelector(".bg-destructive")).toBeNull();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/pages/__tests__/Disclaimer.test.tsx --root Frontend`
Expected: FAIL — cannot resolve `@/pages/Disclaimer`.

- [ ] **Step 3: Create the page**

Create `Frontend/src/pages/Disclaimer.tsx`. The five points are copied **verbatim** from `Frontend/src/components/landing/Disclaimer.tsx` — nothing is softened, shortened, or removed:

```tsx
import { Link } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";

const LAST_UPDATED = "27 July 2026";

const points = [
  {
    title: "We Are Not a Funding Organization",
    description:
      "The Cresciva Collective is an educational and networking membership. We do not provide grants, loans, or direct funding of any kind.",
  },
  {
    title: "No Guarantee of Grant Success",
    description:
      "While we provide curated information about funding opportunities, we cannot and do not guarantee that any member will receive a grant or funding. Success depends on many factors beyond our control.",
  },
  {
    title: "We Do Not Write Applications",
    description:
      "Our team does not write, edit, or submit grant applications on behalf of members. We provide information and guidance, but the application process remains your responsibility.",
  },
  {
    title: "Directory Listings Are Member-Provided",
    description:
      "SME Directory profiles are created and maintained by members themselves. We do not verify, endorse, or guarantee the accuracy of any business listed. Do your own due diligence before transacting.",
  },
  {
    title: "Information Accuracy",
    description:
      "We strive to provide accurate and timely information about funding opportunities. However, details change frequently, and members should always verify information directly with funding sources.",
  },
];

/**
 * The full disclosure, on its own permanent URL. Linked from the footer, the
 * homepage reassurance section, and the pricing fine print.
 *
 * Deliberately NOT a modal, interstitial, or acceptance banner — disclosure
 * must never obstruct the UI. It is complete and reachable; it does not demand
 * acknowledgement.
 */
const Disclaimer = () => {
  return (
    <>
      <SEO
        title="Disclaimer"
        description="What Cresciva does and does not do: we are not a funding organization, we do not write applications, and we do not guarantee funding outcomes."
      />

      <section className="bg-navy px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <PageHeader
            onDark
            title="Disclaimer"
            subtitle={`Last updated: ${LAST_UPDATED}`}
          />
        </div>
      </section>

      <section className="bg-background px-6 py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
            We would rather be clear up front than have you discover a limit later. Here is
            exactly what a Cresciva membership is, and what it is not.
          </p>

          <ol className="space-y-8">
            {points.map((point, index) => (
              <li key={point.title} className="flex gap-5">
                <span
                  aria-hidden
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted font-semibold text-ink-strong"
                >
                  {index + 1}
                </span>
                <div>
                  <h2 className="mb-2 font-display text-lg font-bold text-ink-strong">
                    {point.title}
                  </h2>
                  <p className="leading-relaxed text-muted-foreground">{point.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-12 rounded-xl border border-border bg-surface-subtle p-6">
            <p className="leading-relaxed text-foreground">
              <strong className="font-semibold text-ink-strong">In summary:</strong> We are your
              supportive partner in the scaling journey, providing visibility through the directory
              and curated capital intelligence. The work of building and funding your business
              remains yours.
            </p>
          </div>

          <p className="mt-10 text-sm text-muted-foreground">
            Questions about any of this?{" "}
            <Link
              to="/contact"
              className="font-semibold text-navy underline-offset-4 hover:underline"
            >
              Get in touch
            </Link>
            . See also our{" "}
            <Link to="/terms" className="font-semibold text-navy underline-offset-4 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="font-semibold text-navy underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
};

export default Disclaimer;
```

- [ ] **Step 4: Register the route**

In `Frontend/src/App.tsx`, add to the lazy-import group beside `Privacy` and `Terms`:

```tsx
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
```

and add the route inside the `{/* Marketing / legal */}` group, after the `/terms` route:

```tsx
              <Route path="/disclaimer" element={<Disclaimer />} />
```

- [ ] **Step 5: Add the footer link**

In `Frontend/src/components/common/AppFooter.tsx`, in the `footerNav` array's `Legal` column, add a third entry so it reads:

```ts
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Disclaimer", to: "/disclaimer" },
    ],
  },
```

- [ ] **Step 6: Delete the old landing block**

```bash
git rm Frontend/src/components/landing/Disclaimer.tsx
```

Then remove its import and its `<Disclaimer />` usage from `Frontend/src/pages/Index.tsx`. The import line to delete is:

```tsx
import Disclaimer from "@/components/landing/Disclaimer";
```

and the usage line to delete is the bare `<Disclaimer />` between `</section>` (solution) and `<Pricing />`.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/pages/__tests__/Disclaimer.test.tsx --root Frontend`
Expected: PASS — 3 tests.

Run: `npm test`
Expected: PASS. If any test imported `@/components/landing/Disclaimer`, update it to `@/pages/Disclaimer` rather than deleting it.

- [ ] **Step 8: Commit**

```bash
git add -A Frontend/src/pages/Disclaimer.tsx Frontend/src/pages/__tests__/Disclaimer.test.tsx \
           Frontend/src/App.tsx Frontend/src/components/common/AppFooter.tsx \
           Frontend/src/pages/Index.tsx Frontend/src/components/landing/Disclaimer.tsx
git commit -m "feat(legal): move the disclaimer to its own /disclaimer route off the conversion path"
```

---

## Task 8: `/faq` page + trimmed homepage FAQ

**Files:**
- Create: `Frontend/src/pages/FAQ.tsx`
- Create: `Frontend/src/pages/__tests__/FAQ.test.tsx`
- Modify: `Frontend/src/App.tsx`
- Modify: `Frontend/src/components/landing/FAQ.tsx`

**Interfaces:**
- Consumes: `FAQS`, `HOMEPAGE_FAQS` from `@/content/faqs` (Task 6); `Section`, `SectionHeading` from `@shared/components/marketing` (Task 3).
- Produces: route `/faq`; the landing `FAQ` component now renders five items and keeps `id="faq"`.

- [ ] **Step 1: Write the failing test**

Create `Frontend/src/pages/__tests__/FAQ.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FAQPage from "@/pages/FAQ";
import LandingFAQ from "@/components/landing/FAQ";
import { FAQS, HOMEPAGE_FAQS } from "@/content/faqs";

describe("/faq page", () => {
  it("renders every question", () => {
    render(<MemoryRouter><FAQPage /></MemoryRouter>);
    for (const faq of FAQS) {
      expect(screen.getByRole("button", { name: faq.question })).toBeInTheDocument();
    }
  });
});

describe("homepage FAQ section", () => {
  it("renders only the five homepage questions", () => {
    render(<MemoryRouter><LandingFAQ /></MemoryRouter>);
    for (const faq of HOMEPAGE_FAQS) {
      expect(screen.getByRole("button", { name: faq.question })).toBeInTheDocument();
    }
    for (const faq of FAQS.filter((f) => !f.homepage)) {
      expect(screen.queryByRole("button", { name: faq.question })).not.toBeInTheDocument();
    }
  });

  it("links to the full list", () => {
    render(<MemoryRouter><LandingFAQ /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /see all questions/i })).toHaveAttribute("href", "/faq");
  });

  it("keeps the #faq anchor the header links to", () => {
    const { container } = render(<MemoryRouter><LandingFAQ /></MemoryRouter>);
    expect(container.querySelector("#faq")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/pages/__tests__/FAQ.test.tsx --root Frontend`
Expected: FAIL — cannot resolve `@/pages/FAQ`.

- [ ] **Step 3: Rewrite the landing FAQ section**

Replace the entire contents of `Frontend/src/components/landing/FAQ.tsx` with:

```tsx
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@shared/components/ui/accordion";
import { Section, SectionHeading } from "@shared/components/marketing";
import { HOMEPAGE_FAQS } from "@/content/faqs";

/**
 * Homepage FAQ — the five questions that block a purchase decision. The other
 * four are positioning questions and live on /faq. Keeps `id="faq"`: AppHeader
 * and the footer link to it.
 */
const FAQ = () => {
  return (
    <Section id="faq" innerClassName="max-w-4xl">
      <SectionHeading
        eyebrow="Questions"
        title="Before you join"
        lead="The things founders ask us most."
      />

      <Accordion type="single" collapsible className="mt-14 space-y-4">
        {HOMEPAGE_FAQS.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className="rounded-xl border border-mk-border bg-mk-surface px-6 data-[state=open]:border-primary/40"
          >
            <AccordionTrigger className="py-5 text-left font-semibold text-white hover:text-primary hover:no-underline [&[data-state=open]]:text-primary">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5 leading-relaxed text-mk-ink-muted">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <Link
          to="/faq"
          className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
        >
          See all questions &rarr;
        </Link>
        <p className="text-sm text-mk-ink-muted">
          Still stuck?{" "}
          <a
            href="mailto:hello@cresciva.com"
            className="font-medium text-white underline-offset-4 hover:underline"
          >
            Reach out to us
          </a>
        </p>
      </div>
    </Section>
  );
};

export default FAQ;
```

- [ ] **Step 4: Create the `/faq` page**

Create `Frontend/src/pages/FAQ.tsx`:

```tsx
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@shared/components/ui/accordion";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { FAQS } from "@/content/faqs";

/** Every question, from the same source the homepage section reads. */
const FAQPage = () => {
  return (
    <>
      <SEO
        title="Frequently Asked Questions"
        description="How the Cresciva directory, Funding Radar, membership, payment, and access all work."
      />

      <section className="bg-navy px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <PageHeader
            onDark
            title="Frequently Asked Questions"
            subtitle="Everything about the directory, the Funding Radar, and membership."
          />
        </div>
      </section>

      <section className="bg-background px-6 py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="space-y-4">
            {FAQS.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="rounded-xl border border-border bg-card px-6 shadow-soft data-[state=open]:border-primary/40"
              >
                <AccordionTrigger className="py-5 text-left font-semibold text-ink-strong hover:text-navy hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="mt-12 text-center text-muted-foreground">
            Still have questions?{" "}
            <Link
              to="/contact"
              className="font-semibold text-navy underline-offset-4 hover:underline"
            >
              Get in touch
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
};

export default FAQPage;
```

- [ ] **Step 5: Register the route**

In `Frontend/src/App.tsx`, add to the lazy-import group:

```tsx
const FAQPage = lazy(() => import("./pages/FAQ"));
```

and add the route in the `{/* Marketing / legal */}` group:

```tsx
              <Route path="/faq" element={<FAQPage />} />
```

- [ ] **Step 6: Add the footer link**

In `Frontend/src/components/common/AppFooter.tsx`, add to the `Resources` column's links so it reads:

```ts
    links: [
      { label: "Resource Library", to: "/resources" },
      { label: "Blog", to: "/blog" },
      { label: "FAQ", to: "/faq" },
    ],
```

- [ ] **Step 7: Run and confirm it passes**

Run: `npx vitest run src/pages/__tests__/FAQ.test.tsx --root Frontend`
Expected: PASS — 4 tests.

- [ ] **Step 8: Commit**

```bash
git add Frontend/src/pages/FAQ.tsx Frontend/src/pages/__tests__/FAQ.test.tsx \
        Frontend/src/components/landing/FAQ.tsx Frontend/src/App.tsx \
        Frontend/src/components/common/AppFooter.tsx
git commit -m "feat(faq): trim the homepage FAQ to five and move the full set to /faq"
```

---

## Task 9: Hero — reduced type scale, dark canvas

**Files:**
- Modify: `Frontend/src/components/landing/Hero.tsx`
- Create: `Frontend/src/components/landing/__tests__/landing.test.tsx`

**Interfaces:**
- Consumes: `bg-gradient-hero` (Task 2).
- Produces: unchanged default export `Hero`.

- [ ] **Step 1: Write the failing test**

Create `Frontend/src/components/landing/__tests__/landing.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hero from "@/components/landing/Hero";

function renderIn(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Hero", () => {
  it("keeps the existing headline copy", () => {
    renderIn(<Hero />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Scale Your Business With Intent.");
    expect(h1).toHaveTextContent("Access Capital With Clarity.");
  });

  it("uses the reduced type scale, not the old 7xl ramp", () => {
    renderIn(<Hero />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).toContain("text-3xl");
    expect(h1.className).toContain("lg:text-5xl");
    expect(h1.className).not.toContain("text-7xl");
  });

  it("no longer fills the whole viewport, so the next section peeks", () => {
    const { container } = renderIn(<Hero />);
    const section = container.querySelector("section");
    expect(section?.className).toContain("min-h-[85vh]");
    expect(section?.className).not.toContain("min-h-screen");
  });

  it("keeps both calls to action", () => {
    renderIn(<Hero />);
    expect(screen.getByRole("link", { name: /get started/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /funding/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: FAIL — the heading still contains `text-7xl` and the section is `min-h-screen`.

- [ ] **Step 3: Rewrite the Hero**

Replace the entire contents of `Frontend/src/components/landing/Hero.tsx` with:

```tsx
import { Button } from "@shared/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Hero. Copy is unchanged; only the type scale and section height moved.
 * 72px -> 48px at desktop and 100vh -> 85vh, so the CTAs sit above the fold on
 * a 375px viewport and the trust strip peeks to invite scroll.
 */
const Hero = () => {
  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-mk-canvas bg-gradient-hero">
      {/* Decorative: faint grid + a single warm glow behind the CTA cluster. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] max-w-[90vw] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/20 blur-[120px]"
      />

      <div className="relative z-10 mx-auto flex min-h-[85vh] max-w-7xl animate-fade-in flex-col items-center justify-center px-6 py-24 text-center lg:px-8">
        <div className="mb-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            Pan-African SME Ecosystem
          </span>
        </div>

        <h1 className="mb-6 max-w-3xl font-display text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
          Scale Your Business <span className="text-primary">With Intent.</span>
          <br />
          Access Capital <span className="text-primary">With Clarity.</span>
        </h1>

        <p className="mb-9 max-w-2xl text-lg leading-relaxed text-mk-ink-muted">
          Get listed on the Pan-African SME Directory and unlock AI-curated funding
          intelligence built for African founders ready to scale.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link to="/auth?next=/directory/create">
            <Button variant="hero" size="xl" className="w-full sm:w-auto">
              Get started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/funding">
            <Button variant="onDark" size="xl" className="w-full sm:w-auto">
              Access Funding Intelligence
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-sm text-mk-ink-muted">
          Directory is free. Funding Intelligence unlocks with annual membership.
        </p>
      </div>
    </section>
  );
};

export default Hero;
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: PASS — 4 tests.

- [ ] **Step 5: Confirm the new classes actually reach the stylesheet**

Run: `npm run build:web`
Then: `grep -c "gradient-hero" Frontend/dist/assets/*.css`
Expected: at least `1`. If `0`, the preset's `backgroundImage` entry from Task 2 did not apply — recheck it before continuing.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/landing/Hero.tsx \
        Frontend/src/components/landing/__tests__/landing.test.tsx
git commit -m "feat(hero): reduce type scale to 48px and drop to 85vh so CTAs clear the fold"
```

---

## Task 10: Trust strip + stat band

**Files:**
- Create: `Frontend/src/components/landing/TrustStrip.tsx`
- Create: `Frontend/src/components/landing/Stats.tsx`
- Modify: `Frontend/src/components/landing/__tests__/landing.test.tsx`

**Interfaces:**
- Consumes: `TRUST_LINE`, `PARTNERS`, `STATS` from `@/content/homepage`; `Section`, `LogoWall`, `StatBand`, `Reveal` from `@shared/components/marketing`.
- Produces: default exports `TrustStrip`, `Stats`.

- [ ] **Step 1: Extend the landing test**

Append to `Frontend/src/components/landing/__tests__/landing.test.tsx`:

```tsx
import TrustStrip from "@/components/landing/TrustStrip";
import Stats from "@/components/landing/Stats";
import { STATS } from "@/content/homepage";

describe("TrustStrip", () => {
  // Both branches are exercised with injected fixtures, so these keep passing
  // whether or not the real PARTNERS list has been filled in yet.
  it("renders nothing when there are no partners", () => {
    const { container } = renderIn(<TrustStrip items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the trust line and logos when partners exist", () => {
    renderIn(
      <TrustStrip items={[{ name: "Acme", logo: "/logos/acme.svg" }]} line="Trusted widely" />,
    );
    expect(screen.getByText("Trusted widely")).toBeInTheDocument();
    expect(screen.getByAltText("Acme")).toBeInTheDocument();
  });
});

describe("Stats", () => {
  it("renders every configured stat", () => {
    renderIn(<Stats />);
    for (const stat of STATS) {
      expect(screen.getByText(stat.value)).toBeInTheDocument();
      expect(screen.getByText(stat.label)).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: FAIL — cannot resolve `@/components/landing/TrustStrip`.

- [ ] **Step 3: Implement `TrustStrip`**

Create `Frontend/src/components/landing/TrustStrip.tsx`:

```tsx
import { Section, LogoWall, type Partner } from "@shared/components/marketing";
import { TRUST_LINE, PARTNERS } from "@/content/homepage";

interface TrustStripProps {
  /** Defaults to the real content. Overridable so both branches are testable
   *  without mocking the content module. */
  items?: Partner[];
  line?: string;
}

/**
 * Partner/press logos. Renders nothing at all while there are no partners — a
 * missing logo wall is fine, a fabricated one is not.
 */
const TrustStrip = ({ items = PARTNERS, line = TRUST_LINE }: TrustStripProps = {}) => {
  if (items.length === 0) return null;

  return (
    <Section className="py-14 md:py-16">
      <p className="text-center text-sm font-medium uppercase tracking-wider text-mk-ink-muted">
        {line}
      </p>
      <LogoWall items={items} className="mt-10" />
    </Section>
  );
};

export default TrustStrip;
```

- [ ] **Step 4: Implement `Stats`**

Create `Frontend/src/components/landing/Stats.tsx`:

```tsx
import { Section, StatBand, Reveal } from "@shared/components/marketing";
import { STATS } from "@/content/homepage";

const Stats = () => {
  if (STATS.length === 0) return null;

  return (
    <Section tone="darker" className="py-16 md:py-20">
      <Reveal>
        <StatBand items={STATS} />
      </Reveal>
    </Section>
  );
};

export default Stats;
```

- [ ] **Step 5: Run and confirm it passes**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/landing/TrustStrip.tsx \
        Frontend/src/components/landing/Stats.tsx \
        Frontend/src/components/landing/__tests__/landing.test.tsx
git commit -m "feat(landing): add trust strip and stat band"
```

---

## Task 11: How it works (replaces Solution)

**Files:**
- Create: `Frontend/src/components/landing/HowItWorks.tsx`
- Modify: `Frontend/src/components/landing/__tests__/landing.test.tsx`
- Delete: `Frontend/src/components/landing/Solution.tsx`

**Interfaces:**
- Consumes: `Section`, `SectionHeading`, `FeatureCard`, `Reveal` from `@shared/components/marketing`.
- Produces: default export `HowItWorks`.

- [ ] **Step 1: Extend the landing test**

Append to `Frontend/src/components/landing/__tests__/landing.test.tsx`:

```tsx
import HowItWorks from "@/components/landing/HowItWorks";

describe("HowItWorks", () => {
  it("renders three numbered steps", () => {
    renderIn(<HowItWorks />);
    expect(screen.getByRole("heading", { level: 3, name: /list your business/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /get discovered/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /unlock funding/i })).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: FAIL — cannot resolve `@/components/landing/HowItWorks`.

- [ ] **Step 3: Implement `HowItWorks`**

Create `Frontend/src/components/landing/HowItWorks.tsx`:

```tsx
import { UserRoundPlus, Search, Radar } from "lucide-react";
import { Section, SectionHeading, FeatureCard, Reveal } from "@shared/components/marketing";

/**
 * Replaces the old two-pillar `Solution` section with a three-step narrative.
 * Steps describe what the founder does, in order, rather than what we sell.
 */
const steps = [
  {
    icon: UserRoundPlus,
    title: "List your business",
    body: "Create a public profile in minutes. Sector, country, what you do, how to reach you. Free, and always free.",
  },
  {
    icon: Search,
    title: "Get discovered",
    body: "Buyers, partners and collaborators search the directory by name, sector and country. Your profile is a real, shareable page.",
  },
  {
    icon: Radar,
    title: "Unlock funding intelligence",
    body: "Members get the Funding Radar: grants, competitions, accelerators and development finance, curated to your business.",
  },
];

const HowItWorks = () => {
  return (
    <Section id="solution">
      <SectionHeading
        eyebrow="How it works"
        title={<>Two tools. <span className="text-primary">One growth engine.</span></>}
        lead="Get visible on the free Pan-African SME Directory, and unlock AI-curated funding intelligence when you're ready to scale."
      />

      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.08}>
            <FeatureCard
              icon={step.icon}
              step={index + 1}
              title={step.title}
              body={step.body}
            />
          </Reveal>
        ))}
      </div>
    </Section>
  );
};

export default HowItWorks;
```

- [ ] **Step 4: Delete `Solution.tsx`**

```bash
git rm Frontend/src/components/landing/Solution.tsx
```

Its import and usage in `Index.tsx` are removed in Task 16. If `npm test` reports a broken import before then, that is expected until Task 16 lands — but if any *test file* imported `Solution`, update it to `HowItWorks` now rather than deleting it.

- [ ] **Step 5: Run and confirm it passes**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```bash
git add -A Frontend/src/components/landing/
git commit -m "feat(landing): replace Solution with a three-step HowItWorks section"
```

---

## Task 12: Directory and Funding previews

**Files:**
- Create: `Frontend/src/components/landing/DirectoryPreview.tsx`
- Create: `Frontend/src/components/landing/FundingPreview.tsx`
- Modify: `Frontend/src/components/landing/__tests__/landing.test.tsx`

**Interfaces:**
- Consumes: `SAMPLE_PROFILES`, `SAMPLE_OPPORTUNITIES` from `@/content/homepage`; `Section`, `SectionHeading`, `BrowserFrame`, `Reveal` from `@shared/components/marketing`; `Button` from `@shared/components/ui/button`.
- Produces: default exports `DirectoryPreview`, `FundingPreview`.

- [ ] **Step 1: Extend the landing test**

Append to `Frontend/src/components/landing/__tests__/landing.test.tsx`:

```tsx
import DirectoryPreview from "@/components/landing/DirectoryPreview";
import FundingPreview from "@/components/landing/FundingPreview";
import { SAMPLE_PROFILES, SAMPLE_OPPORTUNITIES } from "@/content/homepage";

describe("DirectoryPreview", () => {
  it("shows the sample profiles and links to the real directory", () => {
    renderIn(<DirectoryPreview />);
    expect(screen.getByText(SAMPLE_PROFILES[0].name)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse the directory/i })).toHaveAttribute(
      "href",
      "/directory",
    );
  });

  it("labels the sample data as illustrative", () => {
    renderIn(<DirectoryPreview />);
    expect(screen.getByText(/illustrative/i)).toBeInTheDocument();
  });
});

describe("FundingPreview", () => {
  it("shows the first opportunity in full", () => {
    renderIn(<FundingPreview />);
    expect(screen.getByText(SAMPLE_OPPORTUNITIES[0].title)).toBeInTheDocument();
  });

  it("hides the teased rows from assistive tech", () => {
    const { container } = renderIn(<FundingPreview />);
    const teased = container.querySelector("[data-testid='funding-teaser']");
    expect(teased).toHaveAttribute("aria-hidden", "true");
  });

  it("links to the funding page", () => {
    renderIn(<FundingPreview />);
    expect(screen.getByRole("link", { name: /see the funding radar/i })).toHaveAttribute(
      "href",
      "/funding",
    );
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: FAIL — cannot resolve `@/components/landing/DirectoryPreview`.

- [ ] **Step 3: Implement `DirectoryPreview`**

Create `Frontend/src/components/landing/DirectoryPreview.tsx`:

```tsx
import { Link } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, SectionHeading, BrowserFrame, Reveal } from "@shared/components/marketing";
import { SAMPLE_PROFILES } from "@/content/homepage";

/**
 * Shows what the directory actually looks like. Renders mock rows in the DOM
 * rather than a screenshot: responsive, accessible, and it cannot go stale.
 * The data is static so the homepage never waits on a network call.
 */
const DirectoryPreview = () => {
  return (
    <Section tone="darker">
      <SectionHeading
        eyebrow="The directory"
        title={<>A real page, <span className="text-primary">not a listing in a spreadsheet.</span></>}
        lead="Every member gets a shareable profile that buyers and partners can find by name, sector or country."
      />

      <Reveal className="mt-14">
        <BrowserFrame label="cresciva.com/directory" className="mx-auto max-w-4xl">
          <ul className="space-y-3">
            {SAMPLE_PROFILES.map((profile) => (
              <li
                key={profile.name}
                className="flex items-start gap-4 rounded-lg border border-mk-border bg-mk-canvas p-4"
              >
                <span
                  aria-hidden
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary font-display font-bold text-primary-foreground"
                >
                  {profile.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{profile.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-mk-ink-muted">
                    <span>{profile.sector}</span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {profile.country}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-mk-ink-muted">{profile.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        </BrowserFrame>
      </Reveal>

      <p className="mt-6 text-center text-xs text-mk-ink-muted">
        Illustrative examples, not real member listings.
      </p>

      <div className="mt-10 text-center">
        <Button asChild variant="hero" size="lg">
          <Link to="/directory">
            Browse the directory
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Section>
  );
};

export default DirectoryPreview;
```

- [ ] **Step 4: Implement `FundingPreview`**

Create `Frontend/src/components/landing/FundingPreview.tsx`:

```tsx
import { Link } from "react-router-dom";
import { CalendarClock, ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, SectionHeading, BrowserFrame, Reveal } from "@shared/components/marketing";
import { SAMPLE_OPPORTUNITIES, type SampleOpportunity } from "@/content/homepage";

function OpportunityRow({ item }: { item: SampleOpportunity }) {
  return (
    <div className="rounded-lg border border-mk-border bg-mk-canvas p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-semibold text-white">{item.title}</p>
        <span className="inline-flex items-center gap-1 text-xs text-mk-ink-muted">
          <CalendarClock className="h-3 w-3" /> {item.deadline}
        </span>
      </div>
      <p className="mt-1 text-sm text-mk-ink-muted">{item.funder}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
          {item.amount}
        </span>
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-mk-border px-2 py-1 text-xs text-mk-ink-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The paid product, shown honestly: the first row is fully legible, the rest
 * are blurred as an explicit teaser. Teased rows are aria-hidden so screen
 * readers are not fed decorative noise, and they contain no real data.
 */
const FundingPreview = () => {
  const [first, ...rest] = SAMPLE_OPPORTUNITIES;

  return (
    <Section>
      <SectionHeading
        eyebrow="Members only"
        title={<>Funding calls, <span className="text-primary">already filtered for you.</span></>}
        lead="Grants, competitions, accelerators and development finance for African SMEs — curated to your sector and stage, refreshed continuously."
      />

      <Reveal className="mt-14">
        <BrowserFrame label="cresciva.com/funding" className="mx-auto max-w-3xl">
          <div className="space-y-3">
            {first && <OpportunityRow item={first} />}

            <div className="relative">
              <div
                data-testid="funding-teaser"
                aria-hidden="true"
                className="space-y-3 blur-[6px]"
              >
                {rest.map((item) => (
                  <OpportunityRow key={item.title} item={item} />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-b from-transparent to-mk-surface pb-4">
                <span className="rounded-full border border-mk-border bg-mk-canvas px-4 py-2 text-sm font-medium text-white">
                  Members see the full list
                </span>
              </div>
            </div>
          </div>
        </BrowserFrame>
      </Reveal>

      <p className="mt-6 text-center text-xs text-mk-ink-muted">
        Illustrative examples, not live opportunities.
      </p>

      <div className="mt-10 text-center">
        <Button asChild variant="hero" size="lg">
          <Link to="/funding">
            See the Funding Radar
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Section>
  );
};

export default FundingPreview;
```

- [ ] **Step 5: Run and confirm it passes**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: PASS — 13 tests.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/landing/DirectoryPreview.tsx \
        Frontend/src/components/landing/FundingPreview.tsx \
        Frontend/src/components/landing/__tests__/landing.test.tsx
git commit -m "feat(landing): show the directory and funding products with in-DOM previews"
```

---

## Task 13: Testimonials + Insights

**Files:**
- Create: `Frontend/src/components/landing/Testimonials.tsx`
- Create: `Frontend/src/components/landing/Insights.tsx`
- Modify: `Frontend/src/components/landing/__tests__/landing.test.tsx`
- Create: `Frontend/src/components/landing/__tests__/Insights.test.tsx`

**Interfaces:**
- Consumes: `TESTIMONIALS` from `@/content/homepage`; `useBlogList` from `@/hooks/queries/blog`; `BlogCard` from `@/components/blog/BlogCard`.
- Produces: default exports `Testimonials`, `Insights`.

> `Insights` gets its **own** test file. `vi.mock` is hoisted to the top of the
> file it appears in, so mocking the blog module inside `landing.test.tsx` would
> apply to every test in that file. Keep it isolated.

- [ ] **Step 1a: Extend the landing test for Testimonials**

Append to `Frontend/src/components/landing/__tests__/landing.test.tsx`:

```tsx
import Testimonials from "@/components/landing/Testimonials";

describe("Testimonials", () => {
  // Injected fixtures again — these keep passing once real quotes are added.
  it("renders nothing when there are no testimonials", () => {
    const { container } = renderIn(<Testimonials items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the quotes it is given", () => {
    renderIn(
      <Testimonials items={[{ quote: "Real change.", name: "Ada", role: "Founder, Kano" }]} />,
    );
    expect(screen.getByText(/Real change/)).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("shows at most three", () => {
    const many = [1, 2, 3, 4].map((n) => ({
      quote: `Quote ${n}`,
      name: `Name ${n}`,
      role: "Founder",
    }));
    renderIn(<Testimonials items={many} />);
    expect(screen.getByText(/Quote 3/)).toBeInTheDocument();
    expect(screen.queryByText(/Quote 4/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 1b: Create the Insights test file**

Create `Frontend/src/components/landing/__tests__/Insights.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/queries/blog", () => ({ useBlogList: vi.fn() }));

import Insights from "@/components/landing/Insights";
import { useBlogList } from "@/hooks/queries/blog";

function renderIn(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Insights", () => {
  it("renders nothing while the query is loading", () => {
    vi.mocked(useBlogList).mockReturnValue({ data: undefined, isError: false } as never);
    const { container } = renderIn(<Insights />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the query errors, rather than a broken state", () => {
    vi.mocked(useBlogList).mockReturnValue({ data: undefined, isError: true } as never);
    const { container } = renderIn(<Insights />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no published posts", () => {
    vi.mocked(useBlogList).mockReturnValue({
      data: { pages: [{ rows: [], count: 0, nextOffset: 0 }] },
      isError: false,
    } as never);
    const { container } = renderIn(<Insights />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders up to three posts when they exist", () => {
    vi.mocked(useBlogList).mockReturnValue({
      data: {
        pages: [
          {
            rows: [1, 2, 3, 4].map((n) => ({
              id: `id-${n}`,
              title: `Post ${n}`,
              slug: `post-${n}`,
              excerpt: null,
              cover_image_url: null,
              category: null,
              tags: [],
              read_time_min: null,
              author_name: null,
              published_at: null,
              featured: false,
            })),
            count: 4,
            nextOffset: 0,
          },
        ],
      },
      isError: false,
    } as never);
    renderIn(<Insights />);
    expect(screen.getByText("Post 1")).toBeInTheDocument();
    expect(screen.getByText("Post 3")).toBeInTheDocument();
    expect(screen.queryByText("Post 4")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run both and confirm they fail**

Run: `npx vitest run src/components/landing/__tests__/ --root Frontend`
Expected: FAIL — cannot resolve `@/components/landing/Testimonials` or `@/components/landing/Insights`.

- [ ] **Step 3: Implement `Testimonials`**

Create `Frontend/src/components/landing/Testimonials.tsx`:

```tsx
import {
  Section,
  SectionHeading,
  TestimonialCard,
  Reveal,
  type Testimonial,
} from "@shared/components/marketing";
import { TESTIMONIALS } from "@/content/homepage";

interface TestimonialsProps {
  /** Defaults to the real content. Overridable so both branches are testable
   *  without mocking the content module. */
  items?: Testimonial[];
}

/** Renders nothing until real, permissioned quotes exist in homepage.ts. */
const Testimonials = ({ items = TESTIMONIALS }: TestimonialsProps = {}) => {
  if (items.length === 0) return null;

  return (
    <Section tone="darker">
      <SectionHeading
        eyebrow="Members"
        title="Founders already building with us"
      />

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {items.slice(0, 3).map((item, index) => (
          <Reveal key={item.name} delay={index * 0.08}>
            <TestimonialCard item={item} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
};

export default Testimonials;
```

- [ ] **Step 4: Implement `Insights`**

Create `Frontend/src/components/landing/Insights.tsx`:

```tsx
import { Link } from "react-router-dom";
import { Section, SectionHeading, Reveal } from "@shared/components/marketing";
import { BlogCard } from "@/components/blog/BlogCard";
import { useBlogList } from "@/hooks/queries/blog";

/**
 * Latest three published posts. The homepage's only data-bound section, so it
 * fails quietly: loading, error and empty all render `null` rather than a
 * skeleton or an error card that would break the page's rhythm.
 */
const Insights = () => {
  const { data, isError } = useBlogList({ q: "", category: null });

  if (isError) return null;

  const posts = data?.pages?.[0]?.rows?.slice(0, 3) ?? [];
  if (posts.length === 0) return null;

  return (
    <Section>
      <SectionHeading
        eyebrow="Insights"
        title="Playbooks, not platitudes"
        lead="Practical writing on funding, growth and running an SME in Africa."
      />

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {posts.map((post, index) => (
          <Reveal key={post.id} delay={index * 0.08}>
            <BlogCard post={post} />
          </Reveal>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link
          to="/blog"
          className="font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
        >
          Read the blog &rarr;
        </Link>
      </div>
    </Section>
  );
};

export default Insights;
```

- [ ] **Step 5: Run and confirm they pass**

Run: `npx vitest run src/components/landing/__tests__/ --root Frontend`
Expected: PASS — 16 in `landing.test.tsx`, 4 in `Insights.test.tsx`.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/components/landing/Testimonials.tsx \
        Frontend/src/components/landing/Insights.tsx \
        Frontend/src/components/landing/__tests__/
git commit -m "feat(landing): add testimonials and a blog insights teaser"
```

---

## Task 14: Reassurance section

The soft disclaimer. This is the section the whole disclaimer change exists for — read the design rules before writing it.

**Files:**
- Create: `Frontend/src/components/landing/Reassurance.tsx`
- Modify: `Frontend/src/components/landing/__tests__/landing.test.tsx`

**Interfaces:**
- Consumes: `Section`, `SectionHeading`, `Reveal` from `@shared/components/marketing`.
- Produces: default export `Reassurance`.

**Design rules — all binding:**
1. The "doesn't" column is **neutral**. `text-muted-foreground` with small dot markers. Never `--destructive`, never red or amber, never an alert-triangle icon.
2. Both columns get identical width and weight. Neither is visually subordinate.
3. The heading is a statement of identity, not a warning.
4. The link is plain text with an arrow — not a button. It offers detail; it does not demand acknowledgement.

- [ ] **Step 1: Extend the landing test**

Append to `Frontend/src/components/landing/__tests__/landing.test.tsx`:

```tsx
import Reassurance from "@/components/landing/Reassurance";

describe("Reassurance", () => {
  it("states both what Cresciva does and what it doesn't", () => {
    renderIn(<Reassurance />);
    expect(screen.getByText(/what cresciva does/i)).toBeInTheDocument();
    expect(screen.getByText(/what it doesn't/i)).toBeInTheDocument();
  });

  it("links to the full disclaimer as plain text, not a button", () => {
    renderIn(<Reassurance />);
    const link = screen.getByRole("link", { name: /read the full disclaimer/i });
    expect(link).toHaveAttribute("href", "/disclaimer");
    expect(link.className).not.toContain("bg-primary");
  });

  it("uses no alarm styling anywhere", () => {
    const { container } = renderIn(<Reassurance />);
    expect(container.querySelector("[class*='destructive']")).toBeNull();
    expect(container.querySelector("[class*='warning']")).toBeNull();
  });

  it("keeps both columns the same width", () => {
    const { container } = renderIn(<Reassurance />);
    const grid = container.querySelector("[data-testid='reassurance-grid']");
    expect(grid?.className).toContain("md:grid-cols-2");
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: FAIL — cannot resolve `@/components/landing/Reassurance`.

- [ ] **Step 3: Implement `Reassurance`**

Create `Frontend/src/components/landing/Reassurance.tsx`:

```tsx
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Section, SectionHeading, Reveal } from "@shared/components/marketing";

const does = [
  "Puts your business in front of buyers, partners and collaborators",
  "Tracks live funding calls across the continent, continuously",
  "Curates them down to your sector and stage",
  "Gives you one credible, shareable profile page",
];

const doesNot = [
  "Provide grants or loans directly",
  "Write or submit applications for you",
  "Guarantee that you win any funding",
  "Verify or endorse other members' listings",
];

/**
 * The honest boundary, framed as identity rather than warning, and positioned
 * AFTER pricing so it answers doubt at the decision point instead of
 * manufacturing doubt before it.
 *
 * The "doesn't" column is deliberately NEUTRAL — no red, no amber, no alert
 * icon, no `destructive` token. Styling it as a warning is what made the old
 * section cost conversions. Do not "improve" it by adding emphasis.
 */
const Reassurance = () => {
  return (
    <Section tone="light">
      <SectionHeading
        tone="light"
        eyebrow="Straight answers"
        title={<>What Cresciva is &mdash; <span className="text-primary-dark">and isn't</span></>}
        lead="We would rather set the boundary now than have you find it later."
      />

      <Reveal className="mt-14">
        <div
          data-testid="reassurance-grid"
          className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2"
        >
          <div className="rounded-xl border border-border bg-card p-8">
            <h3 className="mb-6 font-display text-lg font-bold text-ink-strong">
              What Cresciva does
            </h3>
            <ul className="space-y-4">
              {does.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-dark" aria-hidden />
                  <span className="text-sm leading-relaxed text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-8">
            <h3 className="mb-6 font-display text-lg font-bold text-ink-strong">
              What it doesn&rsquo;t
            </h3>
            <ul className="space-y-4">
              {doesNot.map((item) => (
                <li key={item} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground"
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      <p className="mt-10 text-center">
        <Link
          to="/disclaimer"
          className="font-semibold text-navy underline-offset-4 transition-colors hover:text-navy-light hover:underline"
        >
          Read the full disclaimer &rarr;
        </Link>
      </p>
    </Section>
  );
};

export default Reassurance;
```

- [ ] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: PASS — 20 tests.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/components/landing/Reassurance.tsx \
        Frontend/src/components/landing/__tests__/landing.test.tsx
git commit -m "feat(landing): add a neutral reassurance section in place of the warning block"
```

---

## Task 15: Closing CTA + Problem and Pricing restyle

**Files:**
- Create: `Frontend/src/components/landing/ClosingCTA.tsx`
- Modify: `Frontend/src/components/landing/Problem.tsx`
- Modify: `Frontend/src/components/landing/Pricing.tsx`
- Modify: `Frontend/src/components/landing/__tests__/landing.test.tsx`

**Interfaces:**
- Consumes: `Section`, `SectionHeading`, `CTABand` from `@shared/components/marketing`; `NewsletterSignup` from `@/components/NewsletterSignup`.
- Produces: default export `ClosingCTA`. `Problem` and `Pricing` keep their existing default exports and `Pricing` keeps `id="pricing"`.

- [ ] **Step 1: Extend the landing test**

Append to `Frontend/src/components/landing/__tests__/landing.test.tsx`:

```tsx
import ClosingCTA from "@/components/landing/ClosingCTA";
import Problem from "@/components/landing/Problem";

describe("ClosingCTA", () => {
  it("offers both actions", () => {
    renderIn(<ClosingCTA />);
    expect(screen.getByRole("link", { name: /list your business/i })).toHaveAttribute(
      "href",
      "/auth?next=/directory/create",
    );
    expect(screen.getByRole("link", { name: /see membership/i })).toHaveAttribute(
      "href",
      "/#pricing",
    );
  });
});

describe("Problem", () => {
  it("keeps its three pain points on the light tone", () => {
    const { container } = renderIn(<Problem />);
    expect(container.querySelector("section")).toHaveClass("bg-surface-subtle");
    expect(screen.getByRole("heading", { name: /funding feels out of reach/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: FAIL — cannot resolve `@/components/landing/ClosingCTA`.

- [ ] **Step 3: Implement `ClosingCTA`**

Create `Frontend/src/components/landing/ClosingCTA.tsx`:

```tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, CTABand } from "@shared/components/marketing";
import NewsletterSignup from "@/components/NewsletterSignup";

const ClosingCTA = () => {
  return (
    <Section tone="darker">
      <CTABand
        title="Your business deserves to be found."
        body="Listing is free and takes a few minutes. Funding intelligence is there when you're ready."
      >
        <Button asChild variant="hero" size="xl">
          <Link to="/auth?next=/directory/create">
            List your business
            <ArrowRight className="ml-1 h-5 w-5" />
          </Link>
        </Button>
        <Button asChild variant="onDark" size="xl">
          <Link to="/#pricing">See membership</Link>
        </Button>
      </CTABand>

      <div className="mx-auto mt-12 max-w-md text-center">
        <p className="mb-3 text-sm font-semibold text-white">
          Or get funding calls in your inbox
        </p>
        <NewsletterSignup source="homepage-cta" variant="inline" />
      </div>
    </Section>
  );
};

export default ClosingCTA;
```

- [ ] **Step 4: Restyle `Problem` onto the light tone**

Replace the **entire contents** of `Frontend/src/components/landing/Problem.tsx` with the following. The three pain points are unchanged; only the wrapper and heading move onto the kit.

```tsx
import { Search, TrendingUp, Compass } from "lucide-react";
import { Section, SectionHeading, Reveal } from "@shared/components/marketing";

const problems = [
  {
    icon: Search,
    title: "Funding Feels Out of Reach",
    description:
      "Grants, competitions and capital calls exist for African SMEs, but they are scattered across websites, newsletters and WhatsApp groups. You spend hours hunting instead of building.",
  },
  {
    icon: Compass,
    title: "Growth Without a Framework",
    description:
      "You are generating revenue, but scaling feels like guesswork. Without proven growth frameworks tailored to African realities, momentum stalls before it compounds.",
  },
  {
    icon: TrendingUp,
    title: "No Shared Growth Infrastructure",
    description:
      "Serious SMEs across the continent are solving the same problems in isolation. There is no shared, trusted place that pairs funding intelligence with growth playbooks built for us.",
  },
];

/** The tension. First light section on the page — it exists to make the dark
 *  product sections that follow land harder. */
const Problem = () => {
  return (
    <Section tone="light" id="problem">
      <SectionHeading
        tone="light"
        eyebrow="The gap"
        title={
          <>
            Ambition is not the problem.{" "}
            <span className="text-primary-dark">Access is.</span>
          </>
        }
        lead="African SMEs already have the drive. What they need is access to funding and proven growth frameworks that help them scale."
      />

      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {problems.map((problem, index) => (
          <Reveal key={problem.title} delay={index * 0.08}>
            <div className="group h-full rounded-xl border border-border bg-card p-8 shadow-soft transition-colors hover:border-primary/40 hover:shadow-medium">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-navy/10 text-navy transition-colors group-hover:bg-primary/10 group-hover:text-primary-dark">
                <problem.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-3 font-display text-xl font-semibold text-ink-strong">
                {problem.title}
              </h3>
              <p className="leading-relaxed text-muted-foreground">{problem.description}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <p className="mx-auto mt-16 max-w-2xl text-center text-lg font-medium text-foreground">
        This is why we built{" "}
        <span className="font-bold text-ink-strong">The Cresciva Collective</span>, the funding
        and growth infrastructure for serious African SMEs.
      </p>
    </Section>
  );
};

export default Problem;
```

- [ ] **Step 5: Restyle `Pricing` and add the disclaimer link**

In `Frontend/src/components/landing/Pricing.tsx`, change the section wrapper only — **keep `id="pricing"`**. Replace:

```tsx
    <section id="pricing" className="bg-secondary py-24">
```

with:

```tsx
    <section id="pricing" className="bg-surface-subtle py-20 md:py-28">
```

Then extend the closing fine print. Replace:

```tsx
        <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
          Access is activated automatically once payment is confirmed — usually under a minute. Paying by
          transfer or mobile money? We activate within 12 hours. Membership does not auto-renew.
        </p>
```

with:

```tsx
        <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
          Access is activated automatically once payment is confirmed — usually under a minute. Paying by
          transfer or mobile money? We activate within 12 hours. Membership does not auto-renew.{" "}
          <Link
            to="/disclaimer"
            className="font-medium text-navy underline-offset-4 hover:underline"
          >
            What membership does and doesn&rsquo;t include
          </Link>
          .
        </p>
```

`Link` is already imported in this file.

- [ ] **Step 6: Run and confirm it passes**

Run: `npx vitest run src/components/landing/__tests__/landing.test.tsx --root Frontend`
Expected: PASS — 22 tests.

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/components/landing/
git commit -m "feat(landing): add closing CTA, restyle Problem and Pricing onto the light tone"
```

---

## Task 16: Compose the homepage and verify end to end

**Files:**
- Modify: `Frontend/src/pages/Index.tsx`
- Create: `Frontend/src/pages/__tests__/Index.test.tsx`

**Interfaces:**
- Consumes: every landing component from Tasks 9–15.
- Produces: the finished homepage.

- [ ] **Step 1: Write the failing test**

Create `Frontend/src/pages/__tests__/Index.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const authState = vi.hoisted(() => ({ user: null as unknown, loading: false }));
vi.mock("@shared/hooks/useAuth", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/queries/blog", () => ({ useBlogList: () => ({ data: undefined, isError: true }) }));
vi.mock("@/components/billing/CheckoutButton", () => ({
  CheckoutButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

import Index from "@/pages/Index";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Index />
    </MemoryRouter>,
  );
}

describe("homepage", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
  });

  it("renders the hero headline", () => {
    renderHome();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Scale Your Business");
  });

  it("survives empty PARTNERS, empty TESTIMONIALS and a failed blog query", () => {
    // None of those three sections may throw or render an empty shell.
    expect(() => renderHome()).not.toThrow();
  });

  it("keeps the #pricing anchor the header links to", () => {
    const { container } = renderHome();
    expect(container.querySelector("#pricing")).not.toBeNull();
  });

  it("keeps the #faq anchor", () => {
    const { container } = renderHome();
    expect(container.querySelector("#faq")).not.toBeNull();
  });

  it("shows the reassurance section instead of a warning block", () => {
    renderHome();
    expect(screen.getByText(/what cresciva does/i)).toBeInTheDocument();
    expect(screen.queryByText(/important disclaimer/i)).not.toBeInTheDocument();
  });

  it("links to the full disclaimer", () => {
    renderHome();
    expect(
      screen.getByRole("link", { name: /read the full disclaimer/i }),
    ).toHaveAttribute("href", "/disclaimer");
  });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/pages/__tests__/Index.test.tsx --root Frontend`
Expected: FAIL — `Index.tsx` still imports the deleted `Solution` and renders the old order.

- [ ] **Step 3: Rewrite `Index.tsx`**

Replace the entire contents of `Frontend/src/pages/Index.tsx` with:

```tsx
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { DEFAULT_AUTHED_ROUTE } from "@shared/lib/routes";
import { SEO } from "@shared/components/common/SEO";
import Hero from "@/components/landing/Hero";
import TrustStrip from "@/components/landing/TrustStrip";
import Stats from "@/components/landing/Stats";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import DirectoryPreview from "@/components/landing/DirectoryPreview";
import FundingPreview from "@/components/landing/FundingPreview";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import Reassurance from "@/components/landing/Reassurance";
import Insights from "@/components/landing/Insights";
import FAQ from "@/components/landing/FAQ";
import ClosingCTA from "@/components/landing/ClosingCTA";

/**
 * Dark-first landing page. Tone alternates dark -> light -> dark so the orange
 * accent keeps its impact and the eye gets relief.
 *
 * Section order is deliberate: proof (stats, previews, testimonials) comes
 * BEFORE pricing, and the reassurance/disclaimer section comes AFTER it.
 */
const Index = () => {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  // Returning members land on their dashboard, not the marketing page.
  // Escape hatch: /?home=1 keeps them on the landing page.
  if (!loading && user && params.get("home") !== "1") {
    return <Navigate to={DEFAULT_AUTHED_ROUTE} replace />;
  }

  return (
    <div className="overflow-x-hidden bg-mk-canvas">
      <SEO
        title="Pan-African SME Directory & Funding Intelligence"
        description="List your business on the Pan-African SME directory and find real, current funding opportunities — grants, accelerators, and fellowships curated for African founders."
      />

      <Hero />
      <TrustStrip />
      <Stats />
      <Problem />
      <HowItWorks />
      <DirectoryPreview />
      <FundingPreview />
      <Testimonials />
      <Pricing />
      <Reassurance />
      <Insights />
      <FAQ />
      <ClosingCTA />
    </div>
  );
};

export default Index;
```

- [ ] **Step 4: Run the homepage test**

Run: `npx vitest run src/pages/__tests__/Index.test.tsx --root Frontend`
Expected: PASS — 6 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — all pre-existing tests plus every test added by this plan. Any failure referencing `landing/Disclaimer` or `landing/Solution` means a test still imports a deleted module: update it to `pages/Disclaimer` or `landing/HowItWorks` respectively. Do not delete the test.

- [ ] **Step 6: Typecheck and build**

Run: `npx tsc --noEmit` from the repo root.
Expected: no errors.

Run: `npm run build`
Expected: both Frontend and AdminPanel build successfully.

- [ ] **Step 7: Re-verify the palette guard**

Run: `npx vitest run src/styles/__tests__/tokens.test.ts --root Shared`
Expected: PASS. This confirms nothing in Tasks 2–16 regressed a contrast pairing.

- [ ] **Step 8: Manual verification**

Run: `npm run dev` and check each of the following. Record the result of each; do not mark this step done until all seven pass.

1. **375px** — hero headline and both CTAs visible without scrolling.
2. **768px and 1440px** — no horizontal scrollbar on any section.
3. **`/#pricing`** from the header — scrolls to the pricing section.
4. **Footer → Disclaimer** — lands on `/disclaimer` with all five points.
5. **Homepage → "See all questions"** — lands on `/faq` with all nine.
6. **Reduced motion** — enable `prefers-reduced-motion: reduce` in devtools; reload; confirm no elements slide in. Content must still be visible.
7. **Keyboard** — tab through the whole homepage. Focus ring visible on every dark section; the blurred funding rows are NOT focusable.

- [ ] **Step 9: Commit**

```bash
git add Frontend/src/pages/Index.tsx Frontend/src/pages/__tests__/Index.test.tsx
git commit -m "feat(home): compose the dark-first fifteen-section homepage"
```

---

## Handover notes for the user

Once this plan is implemented, these need real values before launch. Every one is
a factual claim about Cresciva that only the user can confirm.

1. **`Frontend/src/content/homepage.ts`** — replace the four `STATS` values and
   `TRUST_LINE`. Each is marked `// TODO: confirm with real data`.
2. **`Frontend/public/logos/`** — drop partner logo files in, then list them in
   `PARTNERS`. Until then the trust strip does not render at all.
3. **`Frontend/public/testimonials/`** — drop headshots in, then list quotes in
   `TESTIMONIALS`. Until then the testimonials section does not render at all.
4. **`Frontend/src/pages/Disclaimer.tsx`** — confirm `LAST_UPDATED` and have the
   five points reviewed by counsel, as with `/privacy` and `/terms`.

## Deferred — Phases 2 to 5

Each gets its own spec → plan → implementation cycle, composing the Task 3–5 kit.

- **Phase 2 — Trust pages:** `/about`, `/contact`. Presentational, low risk.
- **Phase 3 — Product surfaces:** `/directory`, `/funding`. **Highest risk** —
  data-bound and subscription-gated. Needs a dedicated test pass over the
  `isSubscriptionActive` display paths before any restyle.
- **Phase 4 — Content surfaces:** `/blog`, `/blog/:slug`, `/resources`,
  `/resources/:slug`.
- **Phase 5 — Auth shells:** `/auth`, forgot, reset. Cosmetic.
