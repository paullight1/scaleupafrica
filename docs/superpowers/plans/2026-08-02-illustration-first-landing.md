# Illustration-First Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Cresciva landing page as a light-first, illustration-led, twelve-section conversion page with viewer-adaptive CTAs, real states on its data-bound section, and zero-dependency scroll reveal.

**Architecture:** A presentational marketing kit in `Shared/src/components/marketing/` plus a `useReveal` hook in `Shared/src/hooks/`. Twelve new hand-authored SVGs extend the existing house illustration set. `Frontend/src/pages/Index.tsx` composes landing sections from the kit; all marketing copy the user must own moves into `Frontend/src/content/`. Two routes (`/disclaimer`, `/faq`) absorb content pulled off the homepage.

**Tech Stack:** Vite + React 18 + TypeScript, Tailwind (shared preset), shadcn/ui (Radix), React Router v6, TanStack Query, Vitest + Testing Library (jsdom), Supabase.

**Spec:** `docs/superpowers/specs/2026-08-02-illustration-first-landing-design.md`

## Global Constraints

- **No new runtime dependency in any workspace.** `Shared/` in particular stays dependency-free — do not import `framer-motion` into it.
- **Orange is never small text on a light surface.** `#FF6B2C` on white is 2.84:1; `--primary-dark` `#E44E2E` is 3.87:1 — large text, icons, and borders only. On light tones use `text-navy`.
- **Illustrations use tokens, never literal hex.** Fills are `hsl(var(--primary))` / `hsl(var(--surface-muted))` / `hsl(var(--mk-raised))`; strokes are `currentColor` at `strokeWidth={1.5}`, round caps and joins.
- **No placeholder social proof.** `STATS` and `TESTIMONIALS` ship as empty arrays and their components render `null`.
- **A subscription read error is never a downgrade.** `status: "error"` renders the signed-out CTA set, never the upsell.
- **Reveal animates transform and opacity only** — never height, margin, or display.
- **Existing anchors survive:** Pricing keeps `id="pricing"`, FAQ keeps `id="faq"`.
- Every task ends green: `npm test --workspace <ws>` for the workspace touched.

### Deviations from the spec — read before starting

1. **No transparent header.** Spec §5.1 asks for a transparent-over-hero header on `/`. `AppHeader`'s docstring records that transparent-on-scroll was a *bug that was fixed*, and the header is navy with white ink — it cannot sit on a light hero. `AppHeader` is therefore **not modified at all** by this plan.
2. **Eyebrow is tone-aware, not always orange.** Spec §4.4 calls for a "small uppercase orange label". Small orange text fails AA on light. `Eyebrow` renders `text-navy` on light/tinted and `text-primary` on dark.
3. **The directory preview is inert.** Sample profiles do not resolve to real `/directory/:slug` routes, so the `BrowserFrame` sets the `inert` attribute and `aria-hidden` on its contents. The real link is the CTA below the frame.
4. **`--mk-ink` does not exist.** The spec's token table lists it; `index.css` never defined it. Dark-tone headings use literal `text-white`.
5. **An active member is `member` regardless of profile.** They have already converted; the dashboard's `OnboardingChecklist` owns profile completion.

---

## File Structure

| File | Responsibility |
|---|---|
| `Shared/src/hooks/useReveal.ts` | IntersectionObserver reveal. Reduced-motion aware. No deps. |
| `Shared/src/components/marketing/types.ts` | `Tone`, `Stat`, `Testimonial`. |
| `Shared/src/components/marketing/Section.tsx` | Tone, rhythm, max-width, padding. |
| `Shared/src/components/marketing/Eyebrow.tsx` | Tone-aware uppercase label. |
| `Shared/src/components/marketing/SectionHeading.tsx` | Eyebrow + heading + lead. |
| `Shared/src/components/marketing/Reveal.tsx` | `useReveal` wrapper with stagger delay. |
| `Shared/src/components/marketing/IllustratedCard.tsx` | Illustration-above-copy card. |
| `Shared/src/components/marketing/SplitRow.tsx` | Illustration / copy, reversible. |
| `Shared/src/components/marketing/BrowserFrame.tsx` | Inert browser shell for product previews. |
| `Shared/src/components/marketing/CTABand.tsx` | Dark closing CTA. |
| `Shared/src/components/marketing/StatBand.tsx` | Stats; `null` on empty. |
| `Shared/src/components/marketing/Testimonials.tsx` | Quotes; `null` on empty. |
| `Shared/src/components/marketing/index.ts` | Barrel. |
| `Shared/src/components/illustrations/*.tsx` | 12 new SVGs. |
| `Frontend/src/content/homepage.ts` | Marketing content + sample data. |
| `Frontend/src/content/faqs.ts` | Single FAQ source. |
| `Frontend/src/hooks/useViewerState.ts` | Auth + subscription → viewer state + CTAs. |
| `Frontend/src/components/landing/*.tsx` | Nine landing sections. |
| `Frontend/src/pages/{Disclaimer,FAQ}.tsx` | Absorbed content. |

---

## Task 1: `useReveal` hook

**Files:**
- Create: `Shared/src/hooks/useReveal.ts`
- Test: `Shared/src/hooks/__tests__/useReveal.test.tsx`

**Interfaces:**
- Produces: `useReveal(): { ref: (node: Element | null) => void; revealed: boolean }`

- [ ] **Step 1: Write the failing test**

```tsx
// Shared/src/hooks/__tests__/useReveal.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReveal } from "@shared/hooks/useReveal";

type Cb = (entries: Pick<IntersectionObserverEntry, "isIntersecting">[]) => void;

const instances: { cb: Cb; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];

class FakeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(cb: Cb) {
    instances.push({ cb, observe: this.observe, disconnect: this.disconnect });
  }
}

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

describe("useReveal", () => {
  beforeEach(() => {
    instances.length = 0;
    setReducedMotion(false);
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts hidden and reveals on first intersection", () => {
    const { result } = renderHook(() => useReveal());
    expect(result.current.revealed).toBe(false);

    act(() => result.current.ref(document.createElement("div")));
    expect(instances).toHaveLength(1);

    act(() => instances[0].cb([{ isIntersecting: true }]));
    expect(result.current.revealed).toBe(true);
  });

  it("unobserves after firing, so it never re-runs", () => {
    const { result } = renderHook(() => useReveal());
    act(() => result.current.ref(document.createElement("div")));
    act(() => instances[0].cb([{ isIntersecting: true }]));
    expect(instances[0].disconnect).toHaveBeenCalled();
  });

  it("stays hidden while the element is out of view", () => {
    const { result } = renderHook(() => useReveal());
    act(() => result.current.ref(document.createElement("div")));
    act(() => instances[0].cb([{ isIntersecting: false }]));
    expect(result.current.revealed).toBe(false);
  });

  it("is revealed immediately and creates no observer under reduced motion", () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useReveal());
    expect(result.current.revealed).toBe(true);
    act(() => result.current.ref(document.createElement("div")));
    expect(instances).toHaveLength(0);
  });

  it("reveals immediately when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() => useReveal());
    act(() => result.current.ref(document.createElement("div")));
    expect(result.current.revealed).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Shared -- src/hooks/__tests__/useReveal.test.tsx`
Expected: FAIL — cannot resolve `@shared/hooks/useReveal`.

- [ ] **Step 3: Implement the hook**

```ts
// Shared/src/hooks/useReveal.ts
import { useCallback, useEffect, useRef, useState } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION).matches
  );
}

export interface UseRevealResult {
  /** Callback ref — attach to the element that should reveal. */
  ref: (node: Element | null) => void;
  revealed: boolean;
}

/**
 * One-way scroll reveal. Fires once on first intersection and unobserves, so
 * scrolling back up never replays it.
 *
 * Under `prefers-reduced-motion: reduce` it returns `revealed: true` on the
 * first render and never constructs an observer — the consumer's transform
 * classes are therefore never applied. The preference is read once per mount
 * rather than subscribed to, so a mid-transition setting change can't strand
 * an element at opacity 0.
 */
export function useReveal(): UseRevealResult {
  const [reduced] = useState(prefersReducedMotion);
  const [revealed, setRevealed] = useState(reduced);
  const doneRef = useRef(reduced);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const disconnect = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  // Identity is stable across renders, so React never re-invokes this on a
  // state change — the element is observed exactly once.
  const ref = useCallback(
    (node: Element | null) => {
      disconnect();
      if (!node || doneRef.current) return;

      if (typeof IntersectionObserver === "undefined") {
        doneRef.current = true;
        setRevealed(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          doneRef.current = true;
          setRevealed(true);
          disconnect();
        },
        { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [disconnect],
  );

  useEffect(() => disconnect, [disconnect]);

  return { ref, revealed };
}

export default useReveal;
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test --workspace Shared -- src/hooks/__tests__/useReveal.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add Shared/src/hooks/useReveal.ts Shared/src/hooks/__tests__/useReveal.test.tsx
git commit -m "feat(shared): zero-dependency useReveal scroll hook"
```

---

## Task 2: Marketing tokens in Tailwind + `Illustration` tone

**Files:**
- Modify: `Shared/tailwind.preset.ts` (colors block)
- Modify: `Shared/src/components/common/Illustration.tsx`
- Test: `Shared/src/components/common/__tests__/Illustration.test.tsx`

**Interfaces:**
- Produces: Tailwind classes `bg-mk-canvas`, `bg-mk-surface`, `bg-mk-raised`, `border-mk-border`, `text-mk-ink-muted`.
- Produces: `<Illustration name tone?: "auto" | "dark" title? className? />`

- [ ] **Step 1: Write the failing test**

```tsx
// Shared/src/components/common/__tests__/Illustration.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Illustration } from "@shared/components/common/Illustration";

describe("Illustration", () => {
  it("is decorative without a title", () => {
    const { container } = render(<Illustration name="empty-search" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("is an accessible image with a title", () => {
    render(<Illustration name="empty-search" title="Nothing found" />);
    expect(screen.getByRole("img", { name: "Nothing found" })).toBeInTheDocument();
  });

  it("follows the theme by default", () => {
    const { container } = render(<Illustration name="empty-search" />);
    expect(container.firstElementChild).toHaveClass("text-navy");
  });

  it("forces white strokes on a dark marketing surface", () => {
    const { container } = render(<Illustration name="empty-search" tone="dark" />);
    expect(container.firstElementChild).toHaveClass("text-white");
    expect(container.firstElementChild).not.toHaveClass("text-navy");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Shared -- src/components/common/__tests__/Illustration.test.tsx`
Expected: FAIL on the `tone="dark"` case — unknown prop, class is still `text-navy`.

- [ ] **Step 3: Add the `mk-*` colours to the preset**

In `Shared/tailwind.preset.ts`, inside `theme.extend.colors`, immediately after the `surface` entry:

```ts
        // Marketing surfaces — dark landing bands. Declared once in
        // index.css and NOT overridden in .dark: these are dark in both themes.
        mk: {
          canvas: "hsl(var(--mk-canvas))",
          surface: "hsl(var(--mk-surface))",
          raised: "hsl(var(--mk-raised))",
          border: "hsl(var(--mk-border))",
          "ink-muted": "hsl(var(--mk-ink-muted))",
        },
```

- [ ] **Step 4: Add the `tone` prop to `Illustration`**

Replace the body of `Shared/src/components/common/Illustration.tsx`:

```tsx
import { cn } from "@shared/lib/utils";
import { illustrationRegistry, type IllustrationName } from "@shared/components/illustrations";

export type { IllustrationName };

interface IllustrationProps {
  name: IllustrationName;
  /** Size via h-* w-auto. */
  className?: string;
  /** If set, the graphic is meaningful: role="img" + accessible name. Else decorative. */
  title?: string;
  /**
   * "auto" follows the app theme (navy on light, white in dark mode).
   * "dark" forces white strokes — required inside a `--mk-*` marketing band,
   * which is dark even while the app theme is light.
   */
  tone?: "auto" | "dark";
}

/**
 * Wrapper for the brand SVG illustration set. Strokes theme automatically:
 * the container sets `currentColor` to navy (light) / white (dark).
 */
export function Illustration({ name, className, title, tone = "auto" }: IllustrationProps) {
  const Svg = illustrationRegistry[name];
  if (!Svg) return null;

  return (
    <div
      className={cn(tone === "dark" ? "text-white" : "text-navy dark:text-white", className)}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <Svg className="h-full w-full" />
    </div>
  );
}

export default Illustration;
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test --workspace Shared -- src/components/common/__tests__/Illustration.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add Shared/tailwind.preset.ts Shared/src/components/common/Illustration.tsx \
  Shared/src/components/common/__tests__/Illustration.test.tsx
git commit -m "feat(shared): map mk-* colours into Tailwind, add Illustration tone prop"
```

---

## Task 3: Marketing kit — layout primitives

**Files:**
- Create: `Shared/src/components/marketing/{types,Section,Eyebrow,SectionHeading,Reveal}.tsx` (`types.ts` has no JSX)
- Test: `Shared/src/components/marketing/__tests__/layout.test.tsx`

**Interfaces:**
- Consumes: `useReveal` (Task 1), `mk-*` classes (Task 2).
- Produces:
  - `type Tone = "light" | "tinted" | "dark"`
  - `type Stat = { value: string; label: string }`
  - `type Testimonial = { quote: string; name: string; role: string; avatarUrl?: string }`
  - `<Section tone? id? className? containerClassName? children />`
  - `<Eyebrow tone? children />`
  - `<SectionHeading eyebrow? title lead? tone? align? />`
  - `<Reveal delay? className? children />`

- [ ] **Step 1: Write the failing test**

```tsx
// Shared/src/components/marketing/__tests__/layout.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Section, Eyebrow, SectionHeading, Reveal } from "@shared/components/marketing";

describe("Section", () => {
  it("defaults to the light tone", () => {
    const { container } = render(<Section>body</Section>);
    expect(container.querySelector("section")).toHaveClass("bg-background");
  });

  it("applies the tinted and dark tones", () => {
    const { container: tinted } = render(<Section tone="tinted">body</Section>);
    expect(tinted.querySelector("section")).toHaveClass("bg-surface-subtle");
    const { container: dark } = render(<Section tone="dark">body</Section>);
    expect(dark.querySelector("section")).toHaveClass("bg-mk-canvas");
  });

  it("forwards an id so existing anchors keep working", () => {
    const { container } = render(<Section id="pricing">body</Section>);
    expect(container.querySelector("section")).toHaveAttribute("id", "pricing");
  });
});

describe("Eyebrow", () => {
  it("is navy on light, because small orange text fails AA on white", () => {
    render(<Eyebrow>Why now</Eyebrow>);
    expect(screen.getByText("Why now")).toHaveClass("text-navy");
  });

  it("is orange on dark, where it clears AA at 6.66:1", () => {
    render(<Eyebrow tone="dark">Why now</Eyebrow>);
    expect(screen.getByText("Why now")).toHaveClass("text-primary");
  });
});

describe("SectionHeading", () => {
  it("renders a level-2 heading with its lead and eyebrow", () => {
    render(<SectionHeading eyebrow="Step one" title="List your business" lead="Takes minutes." />);
    expect(screen.getByRole("heading", { level: 2, name: "List your business" })).toBeInTheDocument();
    expect(screen.getByText("Step one")).toBeInTheDocument();
    expect(screen.getByText("Takes minutes.")).toBeInTheDocument();
  });

  it("omits the eyebrow and lead when not given", () => {
    const { container } = render(<SectionHeading title="Solo" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});

describe("Reveal", () => {
  it("renders its children and carries the transition delay", () => {
    render(<Reveal delay={160}>content</Reveal>);
    const el = screen.getByText("content");
    expect(el).toHaveStyle({ transitionDelay: "160ms" });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Shared -- src/components/marketing`
Expected: FAIL — cannot resolve `@shared/components/marketing`.

- [ ] **Step 3: Write `types.ts`**

```ts
// Shared/src/components/marketing/types.ts

/**
 * The three marketing surfaces. `light` and `tinted` are the app's own light
 * tokens; `dark` is the `--mk-*` band, which stays dark in both themes.
 */
export type Tone = "light" | "tinted" | "dark";

export type Stat = { value: string; label: string };

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatarUrl?: string;
};
```

- [ ] **Step 4: Write `Section.tsx`**

```tsx
// Shared/src/components/marketing/Section.tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import type { Tone } from "@shared/components/marketing/types";

const TONE_CLASS: Record<Tone, string> = {
  light: "bg-background text-foreground",
  tinted: "bg-surface-subtle text-foreground",
  dark: "bg-mk-canvas text-mk-ink-muted",
};

interface SectionProps {
  tone?: Tone;
  id?: string;
  className?: string;
  /** Applied to the inner max-width container, not the full-bleed band. */
  containerClassName?: string;
  children: ReactNode;
}

/**
 * Owns every landing band's tone, vertical rhythm, max-width and gutter, so no
 * page hand-rolls padding. Full-bleed background, constrained content.
 */
export function Section({ tone = "light", id, className, containerClassName, children }: SectionProps) {
  return (
    <section id={id} className={cn("py-20 md:py-28", TONE_CLASS[tone], className)}>
      <div className={cn("mx-auto max-w-7xl px-6 lg:px-8", containerClassName)}>{children}</div>
    </section>
  );
}

export default Section;
```

- [ ] **Step 5: Write `Eyebrow.tsx`**

```tsx
// Shared/src/components/marketing/Eyebrow.tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import type { Tone } from "@shared/components/marketing/types";

interface EyebrowProps {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

/**
 * Small uppercase label above a heading.
 *
 * NOT orange on light: `--primary` on white is 2.84:1 and `--primary-dark` is
 * 3.87:1, both below AA for text this size. Orange is reserved for the dark
 * tone, where it clears AA at 6.66:1 on `--mk-canvas`.
 */
export function Eyebrow({ tone = "light", className, children }: EyebrowProps) {
  return (
    <p
      className={cn(
        "mb-3 text-xs font-semibold uppercase tracking-[0.14em]",
        tone === "dark" ? "text-primary" : "text-navy",
        className,
      )}
    >
      {children}
    </p>
  );
}

export default Eyebrow;
```

- [ ] **Step 6: Write `SectionHeading.tsx`**

```tsx
// Shared/src/components/marketing/SectionHeading.tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { Eyebrow } from "@shared/components/marketing/Eyebrow";
import type { Tone } from "@shared/components/marketing/types";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  tone?: Tone;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  tone = "light",
  align = "center",
  className,
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl text-left",
        className,
      )}
    >
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "font-display text-3xl font-bold leading-tight md:text-4xl",
          dark ? "text-white" : "text-ink-strong",
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            "mt-5 text-lg leading-relaxed",
            dark ? "text-mk-ink-muted" : "text-muted-foreground",
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

- [ ] **Step 7: Write `Reveal.tsx`**

```tsx
// Shared/src/components/marketing/Reveal.tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { useReveal } from "@shared/hooks/useReveal";

interface RevealProps {
  children: ReactNode;
  /** Stagger a list with `index * 80`. Keep the total under ~320ms. */
  delay?: number;
  className?: string;
}

/**
 * Fade + 12px rise on first scroll into view. Transform and opacity only, so
 * it can never cause layout shift. Under reduced motion `useReveal` reports
 * revealed on the first render and these classes are never applied.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const { ref, revealed } = useReveal();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
        revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Reveal;
```

- [ ] **Step 8: Write the barrel**

```ts
// Shared/src/components/marketing/index.ts
export * from "@shared/components/marketing/types";
export { Section } from "@shared/components/marketing/Section";
export { Eyebrow } from "@shared/components/marketing/Eyebrow";
export { SectionHeading } from "@shared/components/marketing/SectionHeading";
export { Reveal } from "@shared/components/marketing/Reveal";
```

- [ ] **Step 9: Run it and watch it pass**

Run: `npm test --workspace Shared -- src/components/marketing`
Expected: PASS, 8 tests.

- [ ] **Step 10: Commit**

```bash
git add Shared/src/components/marketing
git commit -m "feat(shared): marketing kit layout primitives"
```

---

## Task 4: Marketing kit — content components

**Files:**
- Create: `Shared/src/components/marketing/{IllustratedCard,SplitRow,BrowserFrame,CTABand,StatBand,Testimonials}.tsx`
- Modify: `Shared/src/components/marketing/index.ts`
- Test: `Shared/src/components/marketing/__tests__/content.test.tsx`

**Interfaces:**
- Consumes: `Tone`, `Stat`, `Testimonial`, `Section`, `Eyebrow` (Task 3); `Illustration` + `tone` (Task 2); `ActionSpec` from `@shared/components/common/types`.
- Produces:
  - `<IllustratedCard illustration title tone? className? children />`
  - `<SplitRow illustration illustrationTitle? reverse? tone? className? children />`
  - `<BrowserFrame label? className? children />` — contents are `inert` + `aria-hidden`
  - `<CTABand illustration? title lead? primary secondary? children? />`
  - `<StatBand stats tone? />` — `null` when `stats` is empty
  - `<Testimonials items tone? />` — `null` when `items` is empty

- [ ] **Step 1: Write the failing test**

```tsx
// Shared/src/components/marketing/__tests__/content.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  IllustratedCard,
  SplitRow,
  BrowserFrame,
  CTABand,
  StatBand,
  Testimonials,
} from "@shared/components/marketing";

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("IllustratedCard", () => {
  it("leads with the illustration, then the title", () => {
    const { container } = wrap(
      <IllustratedCard illustration="empty-search" title="Hard to find">
        body copy
      </IllustratedCard>,
    );
    const card = container.querySelector("article")!;
    expect(card.firstElementChild?.querySelector("svg")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Hard to find" })).toBeInTheDocument();
    expect(screen.getByText("body copy")).toBeInTheDocument();
  });
});

describe("SplitRow", () => {
  it("reverses the column order without reordering the DOM", () => {
    const { container } = wrap(
      <SplitRow illustration="first-run" reverse>
        copy
      </SplitRow>,
    );
    // Copy stays first in the DOM for screen readers; CSS does the swapping.
    expect(container.querySelector(".md\\:order-2")).toBeTruthy();
  });
});

describe("BrowserFrame", () => {
  it("marks its contents inert and hidden, because previews are not real links", () => {
    const { container } = wrap(
      <BrowserFrame>
        <a href="/somewhere">Not clickable</a>
      </BrowserFrame>,
    );
    const stage = container.querySelector("[data-preview-stage]")!;
    expect(stage).toHaveAttribute("aria-hidden", "true");
    expect(stage).toHaveAttribute("inert");
  });
});

describe("StatBand", () => {
  it("renders nothing when there are no stats", () => {
    const { container } = wrap(<StatBand stats={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each stat when they exist", () => {
    wrap(<StatBand stats={[{ value: "20+", label: "Markets" }]} />);
    expect(screen.getByText("20+")).toBeInTheDocument();
    expect(screen.getByText("Markets")).toBeInTheDocument();
  });
});

describe("Testimonials", () => {
  it("renders nothing when there are none", () => {
    const { container } = wrap(<Testimonials items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a quote with its attribution", () => {
    wrap(<Testimonials items={[{ quote: "It worked.", name: "Ada", role: "Founder" }]} />);
    expect(screen.getByText(/It worked\./)).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
  });
});

describe("CTABand", () => {
  it("renders both actions as links", () => {
    wrap(
      <CTABand
        title="Ready?"
        primary={{ label: "List your business", to: "/directory/create" }}
        secondary={{ label: "See membership", to: "/#pricing" }}
      />,
    );
    expect(screen.getByRole("link", { name: "List your business" })).toHaveAttribute(
      "href",
      "/directory/create",
    );
    expect(screen.getByRole("link", { name: "See membership" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Shared -- src/components/marketing/__tests__/content.test.tsx`
Expected: FAIL — none of the six components are exported.

- [ ] **Step 3: Write `IllustratedCard.tsx`**

```tsx
// Shared/src/components/marketing/IllustratedCard.tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { Illustration, type IllustrationName } from "@shared/components/common/Illustration";
import type { Tone } from "@shared/components/marketing/types";

interface IllustratedCardProps {
  illustration: IllustrationName;
  title: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

/**
 * The illustration-first card primitive. The graphic is the card's first
 * element and sits in a tinted well, so a section built from these can never
 * degrade into a wall of text.
 */
export function IllustratedCard({
  illustration,
  title,
  tone = "light",
  className,
  children,
}: IllustratedCardProps) {
  const dark = tone === "dark";
  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-xl border p-8 transition-all",
        dark
          ? "border-mk-border bg-mk-surface hover:border-primary/40 hover:bg-mk-raised"
          : "border-border bg-card shadow-soft hover:border-primary/40 hover:shadow-medium",
        className,
      )}
    >
      <div
        className={cn(
          "mb-6 flex h-32 items-center justify-center rounded-lg",
          dark ? "bg-mk-raised" : "bg-surface-subtle",
        )}
      >
        <Illustration name={illustration} tone={dark ? "dark" : "auto"} className="h-24" />
      </div>
      <h3
        className={cn(
          "mb-3 font-display text-xl font-semibold",
          dark ? "text-white" : "text-ink-strong",
        )}
      >
        {title}
      </h3>
      <div className={cn("leading-relaxed", dark ? "text-mk-ink-muted" : "text-muted-foreground")}>
        {children}
      </div>
    </article>
  );
}

export default IllustratedCard;
```

- [ ] **Step 4: Write `SplitRow.tsx`**

```tsx
// Shared/src/components/marketing/SplitRow.tsx
import type { ReactNode } from "react";
import { cn } from "@shared/lib/utils";
import { Illustration, type IllustrationName } from "@shared/components/common/Illustration";
import type { Tone } from "@shared/components/marketing/types";

interface SplitRowProps {
  illustration: IllustrationName;
  /** Set when the graphic carries meaning the copy doesn't already state. */
  illustrationTitle?: string;
  /** Puts the illustration on the left at md+. DOM order never changes. */
  reverse?: boolean;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}

/**
 * Illustration one side, copy the other. `reverse` swaps them with grid order
 * only — copy always precedes the graphic in the DOM, so screen readers and
 * mobile both get the meaningful content first.
 */
export function SplitRow({
  illustration,
  illustrationTitle,
  reverse = false,
  tone = "light",
  className,
  children,
}: SplitRowProps) {
  const dark = tone === "dark";
  return (
    <div className={cn("grid items-center gap-10 md:grid-cols-2 md:gap-16", className)}>
      <div className={reverse ? "md:order-2" : undefined}>{children}</div>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl p-8",
          dark ? "bg-mk-surface" : "bg-surface-subtle",
          reverse ? "md:order-1" : undefined,
        )}
      >
        <Illustration
          name={illustration}
          title={illustrationTitle}
          tone={dark ? "dark" : "auto"}
          className="h-44 w-full max-w-sm md:h-56"
        />
      </div>
    </div>
  );
}

export default SplitRow;
```

- [ ] **Step 5: Write `BrowserFrame.tsx`**

```tsx
// Shared/src/components/marketing/BrowserFrame.tsx
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@shared/lib/utils";

interface BrowserFrameProps {
  /** Fake address-bar text, e.g. "cresciva.com/directory". */
  label?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A browser shell around real product components rendered with static sample
 * data.
 *
 * The stage is INERT and aria-hidden on purpose: the sample rows do not
 * resolve to real routes, so letting a keyboard or screen-reader user activate
 * them would land on a 404. The section's own CTA is the real link.
 *
 * `inert` is set imperatively because React 18's JSX types don't include it.
 */
export function BrowserFrame({ label = "cresciva.com", className, children }: BrowserFrameProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stageRef.current?.setAttribute("inert", "");
  }, []);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-elevated",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </span>
        <span className="ml-2 truncate rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
          {label}
        </span>
      </div>
      <div
        ref={stageRef}
        data-preview-stage
        aria-hidden="true"
        className="pointer-events-none select-none bg-background p-5 sm:p-6"
      >
        {children}
      </div>
    </div>
  );
}

export default BrowserFrame;
```

- [ ] **Step 6: Write `StatBand.tsx` and `Testimonials.tsx`**

```tsx
// Shared/src/components/marketing/StatBand.tsx
import { cn } from "@shared/lib/utils";
import type { Stat, Tone } from "@shared/components/marketing/types";

interface StatBandProps {
  stats: Stat[];
  tone?: Tone;
  className?: string;
}

/**
 * Renders `null` on an empty array. The homepage ships with no stats — the
 * section map is composed to look complete without them, and inventing
 * numbers for a funding platform is not an option.
 */
export function StatBand({ stats, tone = "light", className }: StatBandProps) {
  if (stats.length === 0) return null;
  const dark = tone === "dark";

  return (
    <dl className={cn("grid grid-cols-2 gap-8 lg:grid-cols-4", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span
              className={cn(
                "block font-display text-4xl font-bold md:text-5xl",
                dark ? "text-primary" : "text-primary-dark",
              )}
            >
              {stat.value}
            </span>
            <span
              className={cn(
                "mt-2 block text-sm",
                dark ? "text-mk-ink-muted" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {stat.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default StatBand;
```

```tsx
// Shared/src/components/marketing/Testimonials.tsx
import { cn } from "@shared/lib/utils";
import type { Testimonial, Tone } from "@shared/components/marketing/types";

interface TestimonialsProps {
  items: Testimonial[];
  tone?: Tone;
  className?: string;
}

/** Renders `null` on an empty array — no invented quotes ever ship. */
export function Testimonials({ items, tone = "light", className }: TestimonialsProps) {
  if (items.length === 0) return null;
  const dark = tone === "dark";

  return (
    <div className={cn("grid gap-6 md:grid-cols-3", className)}>
      {items.map((item) => (
        <figure
          key={`${item.name}-${item.role}`}
          className={cn(
            "flex h-full flex-col rounded-xl border p-7",
            dark ? "border-mk-border bg-mk-surface" : "border-border bg-card shadow-soft",
          )}
        >
          <blockquote
            className={cn(
              "flex-1 leading-relaxed",
              dark ? "text-mk-ink-muted" : "text-foreground/80",
            )}
          >
            “{item.quote}”
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3">
            {item.avatarUrl ? (
              <img src={item.avatarUrl} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy font-display text-sm font-bold text-primary-foreground">
                {item.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span>
              <span className={cn("block text-sm font-semibold", dark ? "text-white" : "text-ink-strong")}>
                {item.name}
              </span>
              <span className={cn("block text-xs", dark ? "text-mk-ink-muted" : "text-muted-foreground")}>
                {item.role}
              </span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export default Testimonials;
```

- [ ] **Step 7: Write `CTABand.tsx`**

```tsx
// Shared/src/components/marketing/CTABand.tsx
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Illustration, type IllustrationName } from "@shared/components/common/Illustration";
import type { ActionSpec } from "@shared/components/common/types";

interface CTABandProps {
  illustration?: IllustrationName;
  title: string;
  lead?: string;
  primary: ActionSpec;
  secondary?: ActionSpec;
  /** Slot beneath the actions — the homepage puts the newsletter form here. */
  children?: ReactNode;
  className?: string;
}

function Action({ spec, variant }: { spec: ActionSpec; variant: "hero" | "onDark" }) {
  if (spec.to) {
    return (
      <Button asChild variant={variant} size="lg">
        <Link to={spec.to}>{spec.label}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} size="lg" onClick={spec.onClick}>
      {spec.label}
    </Button>
  );
}

/** The page's single dark band. Uses `--mk-*`, which is dark in both themes. */
export function CTABand({
  illustration,
  title,
  lead,
  primary,
  secondary,
  children,
  className,
}: CTABandProps) {
  return (
    <div
      className={cn(
        "grid items-center gap-10 rounded-2xl border border-mk-border bg-mk-surface p-8 md:p-12 lg:grid-cols-[1.2fr_1fr]",
        className,
      )}
    >
      <div>
        <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">
          {title}
        </h2>
        {lead && <p className="mt-4 max-w-xl text-lg leading-relaxed text-mk-ink-muted">{lead}</p>}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Action spec={primary} variant="hero" />
          {secondary && <Action spec={secondary} variant="onDark" />}
        </div>

        {children && <div className="mt-8 max-w-sm">{children}</div>}
      </div>

      {illustration && (
        <Illustration name={illustration} tone="dark" className="mx-auto h-40 w-full max-w-xs md:h-56" />
      )}
    </div>
  );
}

export default CTABand;
```

- [ ] **Step 8: Extend the barrel**

Append to `Shared/src/components/marketing/index.ts`:

```ts
export { IllustratedCard } from "@shared/components/marketing/IllustratedCard";
export { SplitRow } from "@shared/components/marketing/SplitRow";
export { BrowserFrame } from "@shared/components/marketing/BrowserFrame";
export { CTABand } from "@shared/components/marketing/CTABand";
export { StatBand } from "@shared/components/marketing/StatBand";
export { Testimonials } from "@shared/components/marketing/Testimonials";
```

- [ ] **Step 9: Run it and watch it pass**

Run: `npm test --workspace Shared -- src/components/marketing`
Expected: PASS, 16 tests across both files.

- [ ] **Step 10: Commit**

```bash
git add Shared/src/components/marketing
git commit -m "feat(shared): marketing kit content components"
```

---

## Task 5: Illustrations, batch A — hero, problem, viewer band

**Files:**
- Create: `Shared/src/components/illustrations/{HeroGrowth,ProblemInvisible,ProblemScattered,ProblemTime,ProfileIncomplete}.tsx`
- Modify: `Shared/src/components/illustrations/index.ts`
- Test: `Shared/src/components/illustrations/__tests__/registry.test.tsx`

**Interfaces:**
- Produces registry names: `hero-growth`, `problem-invisible`, `problem-scattered`, `problem-time`, `profile-incomplete`.

- [ ] **Step 1: Write the failing test**

```tsx
// Shared/src/components/illustrations/__tests__/registry.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { illustrationRegistry } from "@shared/components/illustrations";

const NAMES = Object.keys(illustrationRegistry) as (keyof typeof illustrationRegistry)[];

describe("illustration registry", () => {
  it("registers every landing illustration", () => {
    for (const name of [
      "hero-growth",
      "problem-invisible",
      "problem-scattered",
      "problem-time",
      "profile-incomplete",
    ]) {
      expect(illustrationRegistry).toHaveProperty(name);
    }
  });

  it.each(NAMES)("%s is a decorative svg with a viewBox", (name) => {
    const Svg = illustrationRegistry[name];
    const { container } = render(<Svg />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("viewBox");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("width");
  });

  it.each(NAMES)("%s uses design tokens, never literal hex", (name) => {
    const Svg = illustrationRegistry[name];
    const { container } = render(<Svg />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Shared -- src/components/illustrations`
Expected: FAIL — the five new names are missing from the registry.

- [ ] **Step 3: Write the five SVGs**

```tsx
// Shared/src/components/illustrations/HeroGrowth.tsx
/** Rising bar chart behind a storefront and an orange arc — the hero anchor. */
const HeroGrowth = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 320 240"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="176" cy="112" r="92" fill="hsl(var(--primary))" opacity="0.08" stroke="none" />
    <rect x="44" y="150" width="34" height="54" rx="3" fill="hsl(var(--surface-muted))" />
    <rect x="44" y="150" width="34" height="54" rx="3" />
    <rect x="94" y="120" width="34" height="84" rx="3" fill="hsl(var(--surface-muted))" />
    <rect x="94" y="120" width="34" height="84" rx="3" />
    <rect x="144" y="86" width="34" height="118" rx="3" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <rect x="144" y="86" width="34" height="118" rx="3" />
    <rect x="194" y="54" width="34" height="150" rx="3" fill="hsl(var(--surface-muted))" />
    <rect x="194" y="54" width="34" height="150" rx="3" />
    <path d="M40 204 h240" />
    <path d="M54 118 C104 96 150 70 214 34" />
    <path d="M196 30 h22 v22" />
    <circle cx="256" cy="72" r="20" fill="hsl(var(--surface-muted))" />
    <circle cx="256" cy="72" r="20" />
    <path d="M249 72 l5 6 l10 -12" />
  </svg>
);

export default HeroGrowth;
```

```tsx
// Shared/src/components/illustrations/ProblemInvisible.tsx
/** A shop hidden behind a dashed veil — nobody can find you. */
const ProblemInvisible = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="64" y="66" width="112" height="82" rx="4" fill="hsl(var(--surface-muted))" />
    <path d="M56 66 L68 42 H172 L184 66" />
    <path d="M56 66 h128" />
    <rect x="64" y="66" width="112" height="82" rx="4" />
    <rect x="88" y="98" width="36" height="50" rx="3" />
    <rect x="136" y="98" width="26" height="26" rx="3" />
    <path d="M28 34 v112" strokeDasharray="7 9" opacity="0.7" />
    <path d="M212 34 v112" strokeDasharray="7 9" opacity="0.7" />
    <circle cx="196" cy="46" r="17" fill="hsl(var(--primary))" opacity="0.15" stroke="none" />
    <circle cx="196" cy="46" r="17" />
    <path d="M208 58 l14 14" />
    <path d="M188 46 h16" />
  </svg>
);

export default ProblemInvisible;
```

```tsx
// Shared/src/components/illustrations/ProblemScattered.tsx
/** Funding calls strewn across disconnected cards — nothing joins up. */
const ProblemScattered = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="20" y="26" width="66" height="44" rx="4" fill="hsl(var(--surface-muted))" transform="rotate(-7 53 48)" />
    <rect x="20" y="26" width="66" height="44" rx="4" transform="rotate(-7 53 48)" />
    <path d="M31 41 h34 M31 52 h24" transform="rotate(-7 53 48)" />
    <rect x="140" y="18" width="66" height="44" rx="4" fill="hsl(var(--surface-muted))" transform="rotate(9 173 40)" />
    <rect x="140" y="18" width="66" height="44" rx="4" transform="rotate(9 173 40)" />
    <path d="M151 33 h34 M151 44 h20" transform="rotate(9 173 40)" />
    <rect x="34" y="112" width="66" height="44" rx="4" fill="hsl(var(--surface-muted))" transform="rotate(6 67 134)" />
    <rect x="34" y="112" width="66" height="44" rx="4" transform="rotate(6 67 134)" />
    <path d="M45 127 h34 M45 138 h26" transform="rotate(6 67 134)" />
    <rect x="146" y="104" width="66" height="44" rx="4" fill="hsl(var(--primary))" opacity="0.14" stroke="none" transform="rotate(-5 179 126)" />
    <rect x="146" y="104" width="66" height="44" rx="4" transform="rotate(-5 179 126)" />
    <path d="M157 119 h34 M157 130 h18" transform="rotate(-5 179 126)" />
    <circle cx="120" cy="88" r="13" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <circle cx="120" cy="88" r="13" />
    <path d="M120 82 v7 M120 94 v.5" />
  </svg>
);

export default ProblemScattered;
```

```tsx
// Shared/src/components/illustrations/ProblemTime.tsx
/** An hourglass beside a stalled progress track — hours lost hunting. */
const ProblemTime = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M74 30 h64 M74 150 h64" />
    <path d="M82 30 v16 c0 16 24 26 24 44 c0 18 -24 28 -24 44 v16" fill="hsl(var(--surface-muted))" />
    <path d="M130 30 v16 c0 16 -24 26 -24 44 c0 18 24 28 24 44 v16" fill="hsl(var(--surface-muted))" />
    <path d="M92 132 c0 -10 28 -10 28 0 v14 h-28 z" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <path d="M106 90 v22" strokeDasharray="3 6" />
    <rect x="158" y="52" width="58" height="10" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="158" y="52" width="58" height="10" rx="5" />
    <rect x="158" y="52" width="20" height="10" rx="5" fill="hsl(var(--primary))" stroke="none" />
    <rect x="158" y="84" width="58" height="10" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="158" y="84" width="58" height="10" rx="5" />
    <rect x="158" y="84" width="12" height="10" rx="5" fill="hsl(var(--primary))" stroke="none" />
    <rect x="158" y="116" width="58" height="10" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="158" y="116" width="58" height="10" rx="5" />
  </svg>
);

export default ProblemTime;
```

```tsx
// Shared/src/components/illustrations/ProfileIncomplete.tsx
/** A half-filled profile card — the signed-in-without-a-listing nudge. */
const ProfileIncomplete = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="40" y="30" width="160" height="120" rx="8" fill="hsl(var(--surface-muted))" />
    <rect x="40" y="30" width="160" height="120" rx="8" />
    <circle cx="76" cy="66" r="16" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <circle cx="76" cy="66" r="16" />
    <path d="M70 64 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0" />
    <path d="M66 78 c3 -6 17 -6 20 0" />
    <path d="M104 58 h64 M104 72 h40" />
    <rect x="64" y="100" width="112" height="9" rx="4.5" fill="hsl(var(--background))" />
    <rect x="64" y="100" width="112" height="9" rx="4.5" />
    <rect x="64" y="100" width="62" height="9" rx="4.5" fill="hsl(var(--primary))" stroke="none" />
    <path d="M64 126 h50" strokeDasharray="6 7" />
    <path d="M126 126 h50" strokeDasharray="6 7" opacity="0.5" />
  </svg>
);

export default ProfileIncomplete;
```

- [ ] **Step 4: Register them**

In `Shared/src/components/illustrations/index.ts`, add the imports after the existing ones, extend the `IllustrationName` union, and add the registry entries:

```ts
import HeroGrowth from "./HeroGrowth";
import ProblemInvisible from "./ProblemInvisible";
import ProblemScattered from "./ProblemScattered";
import ProblemTime from "./ProblemTime";
import ProfileIncomplete from "./ProfileIncomplete";
```

Union additions:

```ts
  | "hero-growth"
  | "problem-invisible"
  | "problem-scattered"
  | "problem-time"
  | "profile-incomplete"
```

Registry additions:

```ts
  "hero-growth": HeroGrowth,
  "problem-invisible": ProblemInvisible,
  "problem-scattered": ProblemScattered,
  "problem-time": ProblemTime,
  "profile-incomplete": ProfileIncomplete,
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test --workspace Shared -- src/components/illustrations`
Expected: PASS — 12 registry entries, all token-only.

- [ ] **Step 6: Commit**

```bash
git add Shared/src/components/illustrations
git commit -m "feat(shared): hero, problem and profile illustrations"
```

---

## Task 6: Illustrations, batch B — steps, reassurance, locked, empty, CTA

**Files:**
- Create: `Shared/src/components/illustrations/{StepList,StepDiscovered,StepFunding,ReassuranceDoes,ReassuranceDoesnt,LockedVault,EmptyInsights,CtaLaunch}.tsx`
- Modify: `Shared/src/components/illustrations/index.ts`
- Modify: `Shared/src/components/illustrations/__tests__/registry.test.tsx`

**Interfaces:**
- Produces registry names: `step-list`, `step-discovered`, `step-funding`, `reassurance-does`, `reassurance-doesnt`, `locked-vault`, `empty-insights`, `cta-launch`.

- [ ] **Step 1: Extend the failing test**

In `registry.test.tsx`, replace the name list in the first assertion with all twelve, and add a dark-surface check:

```tsx
  it("registers every landing illustration", () => {
    for (const name of [
      "hero-growth",
      "problem-invisible",
      "problem-scattered",
      "problem-time",
      "profile-incomplete",
      "step-list",
      "step-discovered",
      "step-funding",
      "reassurance-does",
      "reassurance-doesnt",
      "locked-vault",
      "empty-insights",
      "cta-launch",
    ]) {
      expect(illustrationRegistry).toHaveProperty(name);
    }
  });

  it("cta-launch fills against the dark band, not the light surface", () => {
    const { container } = render(<illustrationRegistry["cta-launch"] />);
    // It sits on --mk-canvas, where --surface-muted would be near-white.
    expect(container.innerHTML).not.toContain("--surface-muted");
    expect(container.innerHTML).toContain("--mk-raised");
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Shared -- src/components/illustrations`
Expected: FAIL — the eight new names are missing.

- [ ] **Step 3: Write the eight SVGs**

```tsx
// Shared/src/components/illustrations/StepList.tsx
/** A form being filled in — step one, list your business. */
const StepList = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="52" y="22" width="136" height="140" rx="8" fill="hsl(var(--surface-muted))" />
    <rect x="52" y="22" width="136" height="140" rx="8" />
    <path d="M74 46 h44" />
    <rect x="74" y="60" width="92" height="14" rx="4" fill="hsl(var(--background))" />
    <rect x="74" y="60" width="92" height="14" rx="4" />
    <path d="M74 92 h30" />
    <rect x="74" y="102" width="92" height="14" rx="4" fill="hsl(var(--background))" />
    <rect x="74" y="102" width="92" height="14" rx="4" />
    <rect x="74" y="130" width="56" height="18" rx="6" fill="hsl(var(--primary))" stroke="none" />
    <rect x="74" y="130" width="56" height="18" rx="6" />
    <path d="M166 116 l24 -26 l14 13 l-24 26 l-18 4 z" fill="hsl(var(--primary))" opacity="0.15" />
    <path d="M166 116 l24 -26 l14 13 l-24 26 l-18 4 z" />
    <path d="M186 96 l14 13" />
  </svg>
);

export default StepList;
```

```tsx
// Shared/src/components/illustrations/StepDiscovered.tsx
/** A profile card surfacing in search results — step two, get discovered. */
const StepDiscovered = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="30" y="26" width="150" height="20" rx="10" fill="hsl(var(--surface-muted))" />
    <rect x="30" y="26" width="150" height="20" rx="10" />
    <circle cx="46" cy="36" r="5" />
    <path d="M50 40 l7 7" />
    <path d="M66 36 h60" />
    <rect x="30" y="62" width="150" height="40" rx="6" fill="hsl(var(--primary))" opacity="0.14" stroke="none" />
    <rect x="30" y="62" width="150" height="40" rx="6" />
    <rect x="42" y="72" width="20" height="20" rx="5" fill="hsl(var(--primary))" stroke="none" />
    <path d="M74 76 h72 M74 90 h44" />
    <rect x="30" y="116" width="150" height="40" rx="6" fill="hsl(var(--surface-muted))" />
    <rect x="30" y="116" width="150" height="40" rx="6" />
    <rect x="42" y="126" width="20" height="20" rx="5" />
    <path d="M74 130 h60 M74 144 h36" />
    <circle cx="196" cy="82" r="18" fill="hsl(var(--surface-muted))" />
    <circle cx="196" cy="82" r="18" />
    <path d="M189 82 l5 6 l10 -13" />
  </svg>
);

export default StepDiscovered;
```

```tsx
// Shared/src/components/illustrations/StepFunding.tsx
/** A radar sweep picking up funding calls — step three. */
const StepFunding = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="110" cy="92" r="70" fill="hsl(var(--surface-muted))" />
    <circle cx="110" cy="92" r="70" />
    <circle cx="110" cy="92" r="46" />
    <circle cx="110" cy="92" r="22" />
    <path d="M110 92 L110 22 A70 70 0 0 1 172 58 Z" fill="hsl(var(--primary))" opacity="0.2" stroke="none" />
    <path d="M110 92 L110 22" />
    <path d="M110 92 L172 58" />
    <circle cx="142" cy="52" r="5" fill="hsl(var(--primary))" stroke="none" />
    <circle cx="142" cy="52" r="5" />
    <circle cx="82" cy="126" r="4" />
    <circle cx="150" cy="118" r="4" />
    <circle cx="66" cy="66" r="4" />
    <rect x="186" y="60" width="42" height="14" rx="7" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <rect x="186" y="60" width="42" height="14" rx="7" />
    <rect x="186" y="88" width="42" height="14" rx="7" fill="hsl(var(--surface-muted))" />
    <rect x="186" y="88" width="42" height="14" rx="7" />
  </svg>
);

export default StepFunding;
```

```tsx
// Shared/src/components/illustrations/ReassuranceDoes.tsx
/** A signpost pointing outward — what Cresciva does. */
const ReassuranceDoes = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M118 26 v134" />
    <path d="M96 152 h44" />
    <path d="M40 44 h74 v26 h-74 l-14 -13 z" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <path d="M40 44 h74 v26 h-74 l-14 -13 z" />
    <path d="M122 84 h74 l14 13 l-14 13 h-74 z" fill="hsl(var(--surface-muted))" />
    <path d="M122 84 h74 l14 13 l-14 13 h-74 z" />
    <path d="M56 118 h58 v24 h-58 l-14 -12 z" fill="hsl(var(--surface-muted))" />
    <path d="M56 118 h58 v24 h-58 l-14 -12 z" />
    <path d="M138 92 l6 8 l14 -16" />
  </svg>
);

export default ReassuranceDoes;
```

```tsx
// Shared/src/components/illustrations/ReassuranceDoesnt.tsx
/** A closed boundary line — what Cresciva doesn't do. Neutral, never alarming. */
const ReassuranceDoesnt = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="36" y="40" width="168" height="100" rx="10" fill="hsl(var(--surface-muted))" />
    <rect x="36" y="40" width="168" height="100" rx="10" strokeDasharray="8 8" />
    <path d="M64 74 h50 M64 94 h34" />
    <path d="M136 66 h44 M136 86 h30 M136 106 h38" opacity="0.55" />
    <circle cx="56" cy="74" r="3" fill="currentColor" stroke="none" />
    <circle cx="56" cy="94" r="3" fill="currentColor" stroke="none" />
    <circle cx="128" cy="66" r="3" fill="currentColor" stroke="none" opacity="0.55" />
    <circle cx="128" cy="86" r="3" fill="currentColor" stroke="none" opacity="0.55" />
    <circle cx="128" cy="106" r="3" fill="currentColor" stroke="none" opacity="0.55" />
    <path d="M120 32 v116" strokeDasharray="5 7" />
  </svg>
);

export default ReassuranceDoesnt;
```

```tsx
// Shared/src/components/illustrations/LockedVault.tsx
/** A stack of cards behind a padlock — the honest members-only teaser. */
const LockedVault = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="46" y="30" width="148" height="30" rx="6" fill="hsl(var(--surface-muted))" opacity="0.5" />
    <rect x="46" y="30" width="148" height="30" rx="6" opacity="0.5" />
    <rect x="34" y="68" width="172" height="34" rx="6" fill="hsl(var(--surface-muted))" opacity="0.75" />
    <rect x="34" y="68" width="172" height="34" rx="6" opacity="0.75" />
    <path d="M50 85 h58" opacity="0.75" />
    <rect x="34" y="112" width="172" height="42" rx="6" fill="hsl(var(--surface-muted))" />
    <rect x="34" y="112" width="172" height="42" rx="6" />
    <path d="M50 128 h74 M50 142 h48" />
    <rect x="96" y="70" width="48" height="40" rx="7" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <rect x="96" y="70" width="48" height="40" rx="7" />
    <path d="M106 70 v-11 a14 14 0 0 1 28 0 v11" />
    <circle cx="120" cy="88" r="4" />
    <path d="M120 92 v7" />
  </svg>
);

export default LockedVault;
```

```tsx
// Shared/src/components/illustrations/EmptyInsights.tsx
/** An empty article shelf — no posts published yet. */
const EmptyInsights = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="34" y="34" width="60" height="76" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="34" y="34" width="60" height="76" rx="5" strokeDasharray="7 7" />
    <rect x="90" y="34" width="60" height="76" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="90" y="34" width="60" height="76" rx="5" strokeDasharray="7 7" />
    <rect x="146" y="34" width="60" height="76" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="146" y="34" width="60" height="76" rx="5" strokeDasharray="7 7" />
    <path d="M26 124 h188" />
    <path d="M26 124 v10 M214 124 v10" />
    <circle cx="120" cy="72" r="19" fill="hsl(var(--primary))" opacity="0.14" stroke="none" />
    <circle cx="120" cy="72" r="19" />
    <path d="M112 72 h16" />
    <path d="M62 152 h116" opacity="0.4" strokeDasharray="4 8" />
  </svg>
);

export default EmptyInsights;
```

```tsx
// Shared/src/components/illustrations/CtaLaunch.tsx
/**
 * Rocket over an arc — the closing CTA.
 *
 * THE ONE DARK-SURFACE ILLUSTRATION. It sits on `--mk-canvas`, where
 * `--surface-muted` would read as near-white, so its fills use `--mk-raised`.
 * Always render it through `<Illustration tone="dark" />`.
 */
const CtaLaunch = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M20 148 C64 148 92 120 120 84 C148 48 176 26 220 26" opacity="0.45" strokeDasharray="6 8" />
    <path
      d="M120 26 c20 16 30 40 30 62 l-14 16 h-32 l-14 -16 c0 -22 10 -46 30 -62 z"
      fill="hsl(var(--mk-raised))"
    />
    <path d="M120 26 c20 16 30 40 30 62 l-14 16 h-32 l-14 -16 c0 -22 10 -46 30 -62 z" />
    <circle cx="120" cy="70" r="11" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <circle cx="120" cy="70" r="11" />
    <path d="M90 90 l-20 22 l24 -4 z" fill="hsl(var(--mk-raised))" />
    <path d="M90 90 l-20 22 l24 -4 z" />
    <path d="M150 90 l20 22 l-24 -4 z" fill="hsl(var(--mk-raised))" />
    <path d="M150 90 l20 22 l-24 -4 z" />
    <path d="M110 118 c4 12 6 20 10 28 c4 -8 6 -16 10 -28" fill="hsl(var(--primary))" stroke="none" />
    <path d="M110 118 c4 12 6 20 10 28 c4 -8 6 -16 10 -28" />
    <circle cx="42" cy="46" r="3" fill="currentColor" stroke="none" opacity="0.6" />
    <circle cx="196" cy="126" r="3" fill="currentColor" stroke="none" opacity="0.6" />
    <circle cx="64" cy="96" r="2" fill="currentColor" stroke="none" opacity="0.5" />
  </svg>
);

export default CtaLaunch;
```

- [ ] **Step 4: Register them**

Add the eight imports, extend the union with the eight names, and add the eight registry entries, matching Task 5's pattern:

```ts
  "step-list": StepList,
  "step-discovered": StepDiscovered,
  "step-funding": StepFunding,
  "reassurance-does": ReassuranceDoes,
  "reassurance-doesnt": ReassuranceDoesnt,
  "locked-vault": LockedVault,
  "empty-insights": EmptyInsights,
  "cta-launch": CtaLaunch,
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test --workspace Shared -- src/components/illustrations`
Expected: PASS — 20 registry entries, all token-only, `cta-launch` on `--mk-raised`.

- [ ] **Step 6: Commit**

```bash
git add Shared/src/components/illustrations
git commit -m "feat(shared): step, reassurance, locked and CTA illustrations"
```

---

---

## Task 7: Content files

**Files:**
- Create: `Frontend/src/content/homepage.ts`, `Frontend/src/content/faqs.ts`
- Test: `Frontend/src/content/__tests__/content.test.ts`

**Interfaces:**
- Consumes: `Stat`, `Testimonial` (Task 3); `DirectoryCardRow` from `@/hooks/queries/directory`; `Opportunity` from `@/lib/fundingSchema`.
- Produces:
  - `STATS: Stat[]`, `TESTIMONIALS: Testimonial[]`, `SAMPLE_PROFILES: DirectoryCardRow[]`, `SAMPLE_OPPORTUNITY: Opportunity`, `REASSURANCE_DOES: string[]`, `REASSURANCE_DOESNT: string[]`, `DISCLAIMER_POINTS: DisclaimerPoint[]`, `DISCLAIMER_SUMMARY: string`
  - `type Faq = { id: string; question: string; answer: string; homepage: boolean }`, `FAQS: Faq[]`, `HOMEPAGE_FAQS: Faq[]`

- [ ] **Step 1: Write the failing test**

```ts
// Frontend/src/content/__tests__/content.test.ts
import { describe, it, expect } from "vitest";
import { FAQS, HOMEPAGE_FAQS } from "@/content/faqs";
import {
  STATS,
  TESTIMONIALS,
  SAMPLE_PROFILES,
  SAMPLE_OPPORTUNITY,
  DISCLAIMER_POINTS,
  REASSURANCE_DOES,
  REASSURANCE_DOESNT,
} from "@/content/homepage";

describe("faqs", () => {
  it("keeps every answer — trimming the homepage must not delete content", () => {
    expect(FAQS).toHaveLength(9);
  });

  it("shows exactly five on the homepage", () => {
    expect(HOMEPAGE_FAQS).toHaveLength(5);
    expect(HOMEPAGE_FAQS.every((f) => f.homepage)).toBe(true);
  });

  it("has unique ids so accordion keys never collide", () => {
    expect(new Set(FAQS.map((f) => f.id)).size).toBe(FAQS.length);
  });
});

describe("homepage content", () => {
  it("ships no invented social proof", () => {
    expect(STATS).toEqual([]);
    expect(TESTIMONIALS).toEqual([]);
  });

  it("carries all five disclaimer points", () => {
    expect(DISCLAIMER_POINTS).toHaveLength(5);
    expect(DISCLAIMER_POINTS.every((p) => p.title && p.description)).toBe(true);
  });

  it("gives both reassurance columns equal weight", () => {
    expect(REASSURANCE_DOES).toHaveLength(3);
    expect(REASSURANCE_DOESNT).toHaveLength(3);
  });

  it("has sample data for the previews", () => {
    expect(SAMPLE_PROFILES.length).toBeGreaterThanOrEqual(2);
    expect(new Set(SAMPLE_PROFILES.map((p) => p.id)).size).toBe(SAMPLE_PROFILES.length);
    expect(SAMPLE_OPPORTUNITY.title).toBeTruthy();
    expect(SAMPLE_OPPORTUNITY.funder).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Frontend -- src/content`
Expected: FAIL — `@/content/faqs` does not resolve.

- [ ] **Step 3: Write `faqs.ts`**

```ts
// Frontend/src/content/faqs.ts

/**
 * The single source for every FAQ. `homepage: true` marks the five that block
 * a purchase decision — those five render on `/`, all nine render on `/faq`.
 * Trimming the homepage must never delete an answer.
 */
export type Faq = {
  id: string;
  question: string;
  answer: string;
  homepage: boolean;
};

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
    id: "what-is-radar",
    question: "What is the Funding Radar?",
    answer:
      "The Funding Radar is our AI-powered page that aggregates relevant grants, competitions, accelerators, pitch events, and development finance opportunities for African SMEs. Enter keywords describing your business and get a curated list.",
    homepage: true,
  },
  {
    id: "access-radar",
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
    id: "speed",
    question: "How fast is access after I pay?",
    answer:
      "Card payments are automatic — access is usually unlocked in under a minute once the payment is confirmed. Bank transfers and mobile-money payments handled by our concierge are activated within 12 hours.",
    homepage: true,
  },
  {
    id: "monthly",
    question: "Is there a monthly plan?",
    answer:
      "We offer an annual membership only. This keeps the community focused, committed, and easier to serve deeply throughout the year.",
    homepage: false,
  },
  {
    id: "renewal",
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

export const HOMEPAGE_FAQS: Faq[] = FAQS.filter((faq) => faq.homepage);
```

- [ ] **Step 4: Write `homepage.ts`**

```ts
// Frontend/src/content/homepage.ts
import type { Stat, Testimonial } from "@shared/components/marketing";
import type { DirectoryCardRow } from "@/hooks/queries/directory";
import type { Opportunity } from "@/lib/fundingSchema";

/**
 * Every piece of homepage content the business owns, in one file.
 *
 * Empty arrays are a deliberate state, not an oversight: `StatBand` and
 * `Testimonials` render `null` when empty, and the section map is composed to
 * look complete without them. Fill these in when real figures exist — do not
 * ship placeholder numbers or invented quotes on a funding platform.
 */

export const STATS: Stat[] = [];

export const TESTIMONIALS: Testimonial[] = [];

/**
 * Sample rows for the directory preview. These are illustrative businesses,
 * NOT real listings, and the `BrowserFrame` renders them inert — the slugs
 * deliberately do not resolve to real `/directory/:slug` routes.
 */
export const SAMPLE_PROFILES: DirectoryCardRow[] = [
  {
    id: "sample-1",
    slug: "sample-solar",
    business_name: "Kilima Solar",
    founder_name: "Amara Njeri",
    logo_url: null,
    country: "Kenya",
    sector: "Clean Energy",
    short_description:
      "Pay-as-you-go solar kits for off-grid households and small shops across the Rift Valley.",
    featured: true,
    created_at: "2026-01-12T09:00:00.000Z",
  },
  {
    id: "sample-2",
    slug: "sample-agro",
    business_name: "Sahel Agro Works",
    founder_name: "Ibrahim Diallo",
    logo_url: null,
    country: "Senegal",
    sector: "Agriculture",
    short_description:
      "Cold-chain storage and aggregation for smallholder vegetable farmers supplying Dakar markets.",
    featured: false,
    created_at: "2026-02-03T09:00:00.000Z",
  },
  {
    id: "sample-3",
    slug: "sample-logistics",
    business_name: "Ndu Logistics",
    founder_name: "Chinelo Okafor",
    logo_url: null,
    country: "Nigeria",
    sector: "Logistics",
    short_description:
      "Last-mile delivery for online retailers in Lagos and Port Harcourt, with same-day coverage.",
    featured: false,
    created_at: "2026-02-20T09:00:00.000Z",
  },
];

/** One illustrative funding call for the preview. Not a live opportunity. */
export const SAMPLE_OPPORTUNITY: Opportunity = {
  title: "Africa Agri-Processing Growth Fund",
  funder: "Continental Development Facility",
  type: "Grant",
  summary:
    "Working-capital grants for SMEs processing locally grown produce, with technical assistance over an 18-month period.",
  amount: "$25,000 – $150,000",
  opens: "Rolling",
  deadline: "Quarterly review",
  eligibility: "Registered SMEs operating in an African market for 2+ years",
  url: null,
  tags: ["Agriculture", "Processing", "Working capital"],
  sdg_focus: [],
  past_recipients: [],
  application_tips: [],
};

/** Reassurance section. Both columns are the same length on purpose — neither is subordinate. */
export const REASSURANCE_DOES: string[] = [
  "Puts your business in front of buyers, partners and funders",
  "Tracks live funding calls across African markets",
  "Curates them to your sector and stage",
];

export const REASSURANCE_DOESNT: string[] = [
  "Provide grants or loans directly",
  "Write or submit applications for you",
  "Guarantee that you win any funding",
];

export type DisclaimerPoint = { title: string; description: string };

/** The five points, verbatim from the retired landing/Disclaimer.tsx. Do not soften. */
export const DISCLAIMER_POINTS: DisclaimerPoint[] = [
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

export const DISCLAIMER_SUMMARY =
  "We are your supportive partner in the scaling journey, providing visibility through the directory and curated capital intelligence. The work of building and funding your business remains yours.";
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test --workspace Frontend -- src/content`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add Frontend/src/content
git commit -m "feat(frontend): homepage and FAQ content files"
```

---

## Task 8: `useViewerState`

**Files:**
- Create: `Frontend/src/hooks/useViewerState.ts`
- Test: `Frontend/src/hooks/__tests__/useViewerState.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useSubscription` from `@/lib/subscription`, `useMyProfile` from `@/hooks/queries/dashboard`.
- Produces:
  - `type ViewerKind = "anonymous" | "no-profile" | "no-membership" | "member"`
  - `useViewerState(): ViewerKind`
  - `VIEWER_CTA: Record<ViewerKind, { primary: ActionSpec; secondary: ActionSpec }>`

- [ ] **Step 1: Write the failing test**

```tsx
// Frontend/src/hooks/__tests__/useViewerState.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useViewerState, VIEWER_CTA } from "@/hooks/useViewerState";

const auth = vi.hoisted(() => ({ user: null as unknown, loading: false }));
const sub = vi.hoisted(() => ({ status: "inactive" as string, active: false }));
const profile = vi.hoisted(() => ({ data: null as unknown, isPending: false }));

vi.mock("@shared/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/lib/subscription", () => ({ useSubscription: () => sub }));
vi.mock("@/hooks/queries/dashboard", () => ({ useMyProfile: () => profile }));

const signedIn = { id: "u1", email: "f@example.com" };

describe("useViewerState", () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
    sub.status = "inactive";
    sub.active = false;
    profile.data = null;
    profile.isPending = false;
  });

  it("is anonymous when signed out", () => {
    expect(renderHook(() => useViewerState()).result.current).toBe("anonymous");
  });

  it("is anonymous while auth is still loading", () => {
    auth.loading = true;
    auth.user = signedIn;
    expect(renderHook(() => useViewerState()).result.current).toBe("anonymous");
  });

  it("is no-profile for a signed-in user without a listing", () => {
    auth.user = signedIn;
    expect(renderHook(() => useViewerState()).result.current).toBe("no-profile");
  });

  it("is no-membership once they have a listing but no subscription", () => {
    auth.user = signedIn;
    profile.data = { id: "p1" };
    expect(renderHook(() => useViewerState()).result.current).toBe("no-membership");
  });

  it("is member on an active subscription", () => {
    auth.user = signedIn;
    sub.status = "active";
    sub.active = true;
    expect(renderHook(() => useViewerState()).result.current).toBe("member");
  });

  it("is member on an active subscription even without a listing", () => {
    auth.user = signedIn;
    sub.status = "active";
    sub.active = true;
    profile.data = null;
    expect(renderHook(() => useViewerState()).result.current).toBe("member");
  });

  // TRUST-CRITICAL: a failed subscription read must never look like "no membership".
  it("falls back to anonymous when the subscription read errors", () => {
    auth.user = signedIn;
    profile.data = { id: "p1" };
    sub.status = "error";
    expect(renderHook(() => useViewerState()).result.current).toBe("anonymous");
  });

  it("falls back to anonymous while the subscription is still loading", () => {
    auth.user = signedIn;
    sub.status = "loading";
    expect(renderHook(() => useViewerState()).result.current).toBe("anonymous");
  });

  it("gives every state a distinct primary call to action", () => {
    const labels = Object.values(VIEWER_CTA).map((cta) => cta.primary.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Frontend -- src/hooks/__tests__/useViewerState.test.tsx`
Expected: FAIL — `@/hooks/useViewerState` does not resolve.

- [ ] **Step 3: Implement the hook**

```ts
// Frontend/src/hooks/useViewerState.ts
import { useAuth } from "@shared/hooks/useAuth";
import { useSubscription } from "@/lib/subscription";
import { useMyProfile } from "@/hooks/queries/dashboard";
import type { ActionSpec } from "@shared/components/common/types";

export type ViewerKind = "anonymous" | "no-profile" | "no-membership" | "member";

/**
 * Who is looking at the landing page. PRESENTATION ONLY — no guard, gate, or
 * access decision reads this. The database remains the boundary.
 *
 * TRUST-CRITICAL: `useSubscription` throws on a failed read and surfaces
 * `status: "error"`. That case, and the loading case, resolve to "anonymous"
 * so a paying member on a flaky connection is never shown an upgrade prompt.
 * The landing page must also stay readable without waiting on the network,
 * which is the second reason loading maps to the signed-out copy rather than
 * to a spinner.
 */
export function useViewerState(): ViewerKind {
  const { user, loading } = useAuth();
  const subscription = useSubscription();
  const profile = useMyProfile();

  if (loading || !user) return "anonymous";
  if (subscription.status === "error" || subscription.status === "loading") return "anonymous";
  if (subscription.active) return "member";
  if (profile.isPending) return "anonymous";
  return profile.data ? "no-membership" : "no-profile";
}

/** The CTA pair each viewer sees. One place to change the copy. */
export const VIEWER_CTA: Record<ViewerKind, { primary: ActionSpec; secondary: ActionSpec }> = {
  anonymous: {
    primary: { label: "List your business — free", to: "/auth?next=/directory/create" },
    secondary: { label: "See how funding works", to: "/funding" },
  },
  "no-profile": {
    primary: { label: "Finish your listing", to: "/directory/create" },
    secondary: { label: "Browse the directory", to: "/directory" },
  },
  "no-membership": {
    primary: { label: "Unlock the Funding Radar", to: "/#pricing" },
    secondary: { label: "Go to dashboard", to: "/dashboard" },
  },
  member: {
    primary: { label: "Go to dashboard", to: "/dashboard" },
    secondary: { label: "Browse the directory", to: "/directory" },
  },
};
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test --workspace Frontend -- src/hooks/__tests__/useViewerState.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add Frontend/src/hooks/useViewerState.ts Frontend/src/hooks/__tests__/useViewerState.test.tsx
git commit -m "feat(frontend): viewer-adaptive landing state"
```

---

## Task 9: `/disclaimer` and `/faq` routes

**Files:**
- Create: `Frontend/src/pages/Disclaimer.tsx`, `Frontend/src/pages/FAQ.tsx`
- Modify: `Frontend/src/App.tsx`, `Frontend/src/components/common/AppFooter.tsx`
- Test: `Frontend/src/pages/__tests__/legalPages.test.tsx`

**Interfaces:**
- Consumes: `DISCLAIMER_POINTS`, `DISCLAIMER_SUMMARY`, `FAQS` (Task 7); `PageHeader`, `SEO` from `@shared/components/common`.
- Produces: routes `/disclaimer` and `/faq`; a `Disclaimer` link in the footer's Legal column.

- [ ] **Step 1: Write the failing test**

```tsx
// Frontend/src/pages/__tests__/legalPages.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Disclaimer from "@/pages/Disclaimer";
import FAQPage from "@/pages/FAQ";
import { AppFooter } from "@/components/common/AppFooter";
import { DISCLAIMER_POINTS } from "@/content/homepage";
import { FAQS } from "@/content/faqs";

vi.mock("@/components/NewsletterSignup", () => ({ default: () => <div /> }));

const wrap = (ui: React.ReactNode) =>
  render(
    <HelmetProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </HelmetProvider>,
  );

describe("/disclaimer", () => {
  it("carries all five points verbatim", () => {
    wrap(<Disclaimer />);
    for (const point of DISCLAIMER_POINTS) {
      expect(screen.getByText(point.title)).toBeInTheDocument();
      expect(screen.getByText(point.description)).toBeInTheDocument();
    }
  });
});

describe("/faq", () => {
  it("renders every question, not just the homepage five", () => {
    wrap(<FAQPage />);
    for (const faq of FAQS) {
      expect(screen.getByText(faq.question)).toBeInTheDocument();
    }
  });
});

describe("footer", () => {
  it("links to the disclaimer from the Legal column", () => {
    wrap(<AppFooter />);
    expect(screen.getByRole("link", { name: "Disclaimer" })).toHaveAttribute("href", "/disclaimer");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Frontend -- src/pages/__tests__/legalPages.test.tsx`
Expected: FAIL — `@/pages/Disclaimer` does not resolve.

- [ ] **Step 3: Check how `SEO` and `PageHeader` are used, then write `Disclaimer.tsx`**

Run first: `sed -n '1,40p' Frontend/src/pages/Privacy.tsx` — mirror its shell exactly.

```tsx
// Frontend/src/pages/Disclaimer.tsx
import { Link } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { DISCLAIMER_POINTS, DISCLAIMER_SUMMARY } from "@/content/homepage";

/**
 * The full disclosure, on a permanent, citable URL.
 *
 * This content used to be a warning block wedged in front of the homepage
 * pricing section. Moving it here makes it MORE reachable, not less: it is
 * linked from the footer, the pricing fine print, and the homepage
 * reassurance section. Nothing has been softened or shortened.
 */
const Disclaimer = () => (
  <>
    <SEO
      title="Disclaimer"
      description="What Cresciva does and does not do: we are not a funding organisation, we do not write applications, and we do not guarantee funding outcomes."
    />
    <PageHeader
      title="Disclaimer"
      description="Please read and understand these points before joining The Cresciva Collective."
    />

    <div className="mx-auto max-w-3xl px-6 pb-24 lg:px-8">
      <ol className="space-y-8">
        {DISCLAIMER_POINTS.map((point, index) => (
          <li key={point.title} className="flex gap-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-navy">
              {index + 1}
            </span>
            <div>
              <h2 className="mb-2 font-display text-lg font-semibold text-ink-strong">
                {point.title}
              </h2>
              <p className="leading-relaxed text-muted-foreground">{point.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-xl border border-border bg-surface-subtle p-6">
        <h2 className="mb-2 font-display text-lg font-semibold text-ink-strong">In summary</h2>
        <p className="leading-relaxed text-muted-foreground">{DISCLAIMER_SUMMARY}</p>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Questions about any of this?{" "}
        <Link to="/contact" className="font-semibold text-navy underline-offset-4 hover:underline">
          Get in touch
        </Link>
        .
      </p>
    </div>
  </>
);

export default Disclaimer;
```

- [ ] **Step 4: Write `FAQ.tsx`**

```tsx
// Frontend/src/pages/FAQ.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@shared/components/ui/accordion";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { FAQS } from "@/content/faqs";

/** Every question, from the same source the homepage's five are filtered from. */
const FAQPage = () => (
  <>
    <SEO
      title="Frequently Asked Questions"
      description="How the free Pan-African SME Directory, the Funding Radar, membership, payment and renewals work."
    />
    <PageHeader
      title="Frequently Asked Questions"
      description="Everything you need to know about The Cresciva Collective."
    />

    <div className="mx-auto max-w-3xl px-6 pb-24 lg:px-8">
      <Accordion type="single" collapsible className="space-y-4">
        {FAQS.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className="rounded-xl border border-border bg-card px-6 shadow-soft data-[state=open]:border-primary/40 data-[state=open]:shadow-medium"
          >
            <AccordionTrigger className="py-5 text-left font-semibold text-foreground hover:text-navy hover:no-underline [&[data-state=open]]:text-navy">
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
        <a
          href="mailto:hello@cresciva.com"
          className="font-semibold text-navy underline-offset-4 transition-colors hover:text-navy-light hover:underline"
        >
          Reach out to us
        </a>
      </p>
    </div>
  </>
);

export default FAQPage;
```

- [ ] **Step 5: Wire the routes and the footer link**

In `Frontend/src/App.tsx`, add to the lazy marketing block:

```ts
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const FAQPage = lazy(() => import("./pages/FAQ"));
```

and add the routes beside `/terms`:

```tsx
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/faq" element={<FAQPage />} />
```

In `Frontend/src/components/common/AppFooter.tsx`, extend the Legal column and add FAQ to Resources:

```ts
  {
    heading: "Resources",
    links: [
      { label: "Resource Library", to: "/resources" },
      { label: "Blog", to: "/blog" },
      { label: "FAQ", to: "/faq" },
    ],
  },
```

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

- [ ] **Step 6: Run it and watch it pass**

Run: `npm test --workspace Frontend -- src/pages/__tests__/legalPages.test.tsx`
Expected: PASS, 3 tests. If `SEO` needs no `HelmetProvider` in this codebase, drop the wrapper.

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/pages/Disclaimer.tsx Frontend/src/pages/FAQ.tsx Frontend/src/App.tsx \
  Frontend/src/components/common/AppFooter.tsx Frontend/src/pages/__tests__/legalPages.test.tsx
git commit -m "feat(frontend): /disclaimer and /faq routes"
```

---

## Task 10: Hero and Problem

**Files:**
- Modify: `Frontend/src/components/landing/Hero.tsx`, `Frontend/src/components/landing/Problem.tsx`
- Create: `Frontend/src/components/landing/ViewerBand.tsx`
- Test: `Frontend/src/components/landing/__tests__/hero.test.tsx`

**Interfaces:**
- Consumes: `Section`, `SectionHeading`, `Eyebrow`, `IllustratedCard`, `Reveal` (Tasks 3–4); `useViewerState`, `VIEWER_CTA` (Task 8); illustrations (Tasks 5–6).
- Produces: `<Hero />`, `<Problem />`, `<ViewerBand />` (renders `null` unless the viewer is `no-profile`).

- [ ] **Step 1: Write the failing test**

```tsx
// Frontend/src/components/landing/__tests__/hero.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import ViewerBand from "@/components/landing/ViewerBand";

const viewer = vi.hoisted(() => ({ kind: "anonymous" as string }));
vi.mock("@/hooks/useViewerState", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useViewerState")>(
    "@/hooks/useViewerState",
  );
  return { ...actual, useViewerState: () => viewer.kind };
});

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Hero", () => {
  beforeEach(() => {
    viewer.kind = "anonymous";
  });

  it("leads with the headline and both CTAs for a stranger", () => {
    wrap(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Scale Your Business/i);
    expect(screen.getByRole("link", { name: "List your business — free" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See how funding works" })).toBeInTheDocument();
  });

  it("adapts the CTA for a member", () => {
    viewer.kind = "member";
    wrap(<Hero />);
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "List your business — free" })).not.toBeInTheDocument();
  });

  it("carries an illustration", () => {
    const { container } = wrap(<Hero />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("Problem", () => {
  it("renders three illustrated cards, illustration first", () => {
    const { container } = wrap(<Problem />);
    const cards = container.querySelectorAll("article");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.firstElementChild?.querySelector("svg")).toBeTruthy();
    }
  });
});

describe("ViewerBand", () => {
  it("renders nothing for a stranger", () => {
    viewer.kind = "anonymous";
    const { container } = wrap(<ViewerBand />);
    expect(container).toBeEmptyDOMElement();
  });

  it("nudges a signed-in user with no listing", () => {
    viewer.kind = "no-profile";
    wrap(<ViewerBand />);
    expect(screen.getByRole("link", { name: "Finish your listing" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Frontend -- src/components/landing/__tests__/hero.test.tsx`
Expected: FAIL — `@/components/landing/ViewerBand` does not resolve; Hero has no adaptive CTA.

- [ ] **Step 3: Rewrite `Hero.tsx`**

```tsx
// Frontend/src/components/landing/Hero.tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Illustration } from "@shared/components/common/Illustration";
import { useViewerState, VIEWER_CTA } from "@/hooks/useViewerState";

/**
 * Split hero: copy left, illustration right. On mobile the illustration drops
 * BELOW the actions so the headline, subhead and both CTAs stay above the fold
 * at 375px — the previous `xl:text-7xl` scale is what pushed them under it.
 */
const Hero = () => {
  const viewer = useViewerState();
  const { primary, secondary } = VIEWER_CTA[viewer];

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Single soft orange glow behind the artwork. No gradient text. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-[36rem] w-[36rem] translate-x-1/4 -translate-y-1/4 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary-dark">
            Pan-African SME Ecosystem
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-ink-strong md:text-5xl lg:text-6xl">
            Scale Your Business <span className="text-primary-dark">With Intent.</span>
            <br />
            Access Capital <span className="text-primary-dark">With Clarity.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Get listed on the Pan-African SME Directory and unlock AI-curated funding
            intelligence built for African founders ready to scale.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
              <Link to={primary.to!}>
                {primary.label}
                <ArrowRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="navyOutline" size="xl" className="w-full sm:w-auto">
              <Link to={secondary.to!}>{secondary.label}</Link>
            </Button>
          </div>

          <p className="mt-7 text-sm text-muted-foreground">
            Directory is free. Funding Intelligence unlocks with annual membership.
          </p>
        </div>

        <Illustration
          name="hero-growth"
          className="order-last mx-auto h-56 w-full max-w-md sm:h-72 lg:h-auto lg:max-w-none"
        />
      </div>
    </section>
  );
};

export default Hero;
```

- [ ] **Step 4: Restyle `Problem.tsx`**

```tsx
// Frontend/src/components/landing/Problem.tsx
import {
  Section,
  SectionHeading,
  IllustratedCard,
  Reveal,
} from "@shared/components/marketing";
import type { IllustrationName } from "@shared/components/common/Illustration";

const problems: { illustration: IllustrationName; title: string; description: string }[] = [
  {
    illustration: "problem-scattered",
    title: "Funding Feels Out of Reach",
    description:
      "Grants, competitions and capital calls exist for African SMEs, but they are scattered across websites, newsletters and WhatsApp groups. You spend hours hunting instead of building.",
  },
  {
    illustration: "problem-time",
    title: "Growth Without a Framework",
    description:
      "You are generating revenue, but scaling feels like guesswork. Without proven growth frameworks tailored to African realities, momentum stalls before it compounds.",
  },
  {
    illustration: "problem-invisible",
    title: "No Shared Growth Infrastructure",
    description:
      "Serious SMEs across the continent are solving the same problems in isolation. There is no shared, trusted place that pairs funding intelligence with growth playbooks built for us.",
  },
];

const Problem = () => (
  <Section id="problem" tone="light">
    <SectionHeading
      eyebrow="The gap"
      title={
        <>
          Ambition Is Not the Problem. <span className="text-primary-dark">Access Is.</span>
        </>
      }
      lead="African SMEs already have the drive. What they need is access to funding and proven growth frameworks that help them scale."
    />

    <div className="mt-16 grid gap-8 md:grid-cols-3">
      {problems.map((problem, index) => (
        <Reveal key={problem.title} delay={index * 80} className="h-full">
          <IllustratedCard illustration={problem.illustration} title={problem.title}>
            {problem.description}
          </IllustratedCard>
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

export default Problem;
```

- [ ] **Step 5: Write `ViewerBand.tsx`**

```tsx
// Frontend/src/components/landing/ViewerBand.tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Illustration } from "@shared/components/common/Illustration";
import { useViewerState, VIEWER_CTA } from "@/hooks/useViewerState";

/**
 * A nudge for the one viewer with unfinished business: signed in, no listing.
 * Every other state — including a failed subscription read, which resolves to
 * "anonymous" — renders nothing.
 */
const ViewerBand = () => {
  const viewer = useViewerState();
  if (viewer !== "no-profile") return null;

  const { primary } = VIEWER_CTA["no-profile"];

  return (
    <div className="bg-surface-subtle">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-8 sm:flex-row lg:px-8">
        <Illustration name="profile-incomplete" className="h-20 shrink-0" />
        <div className="flex-1 text-center sm:text-left">
          <p className="font-display text-lg font-semibold text-ink-strong">
            Your listing isn't live yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Finish your profile and become discoverable to buyers and partners across the
            continent. It takes a few minutes.
          </p>
        </div>
        <Button asChild variant="default" size="lg" className="shrink-0">
          <Link to={primary.to!}>
            {primary.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ViewerBand;
```

- [ ] **Step 6: Run it and watch it pass**

Run: `npm test --workspace Frontend -- src/components/landing/__tests__/hero.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 7: Commit**

```bash
git add Frontend/src/components/landing/Hero.tsx Frontend/src/components/landing/Problem.tsx \
  Frontend/src/components/landing/ViewerBand.tsx \
  Frontend/src/components/landing/__tests__/hero.test.tsx
git commit -m "feat(frontend): illustration-first hero, problem and viewer band"
```

---

## Task 11: How it works, and the two product previews

**Files:**
- Create: `Frontend/src/components/landing/{HowItWorks,DirectoryPreview,FundingPreview}.tsx`
- Delete: `Frontend/src/components/landing/Solution.tsx`
- Test: `Frontend/src/components/landing/__tests__/previews.test.tsx`

**Interfaces:**
- Consumes: `Section`, `SectionHeading`, `SplitRow`, `BrowserFrame`, `Reveal`; `SAMPLE_PROFILES`, `SAMPLE_OPPORTUNITY` (Task 7); `DirectoryCard`, `OpportunityCard`.
- Produces: `<HowItWorks />`, `<DirectoryPreview />`, `<FundingPreview />`.

- [ ] **Step 1: Write the failing test**

```tsx
// Frontend/src/components/landing/__tests__/previews.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HowItWorks from "@/components/landing/HowItWorks";
import DirectoryPreview from "@/components/landing/DirectoryPreview";
import FundingPreview from "@/components/landing/FundingPreview";
import { SAMPLE_PROFILES } from "@/content/homepage";

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("HowItWorks", () => {
  it("renders three steps, each with an illustration", () => {
    const { container } = wrap(<HowItWorks />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });
});

describe("DirectoryPreview", () => {
  it("shows the sample businesses", () => {
    wrap(<DirectoryPreview />);
    expect(screen.getByText(SAMPLE_PROFILES[0].business_name)).toBeInTheDocument();
  });

  it("keeps the preview inert — sample slugs are not real routes", () => {
    const { container } = wrap(<DirectoryPreview />);
    const stage = container.querySelector("[data-preview-stage]")!;
    expect(stage).toHaveAttribute("aria-hidden", "true");
  });

  it("offers one real link out", () => {
    wrap(<DirectoryPreview />);
    expect(screen.getByRole("link", { name: /browse the directory/i })).toHaveAttribute(
      "href",
      "/directory",
    );
  });
});

describe("FundingPreview", () => {
  it("shows one legible opportunity", () => {
    wrap(<FundingPreview />);
    expect(screen.getByText("Africa Agri-Processing Growth Fund")).toBeInTheDocument();
  });

  it("states the members-only limit honestly, with no fake blurred cards", () => {
    wrap(<FundingPreview />);
    expect(screen.getByText(/members see the full curated list/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Frontend -- src/components/landing/__tests__/previews.test.tsx`
Expected: FAIL — none of the three modules resolve.

- [ ] **Step 3: Write `HowItWorks.tsx`**

```tsx
// Frontend/src/components/landing/HowItWorks.tsx
import { Check } from "lucide-react";
import { Section, SectionHeading, SplitRow, Reveal } from "@shared/components/marketing";
import type { IllustrationName } from "@shared/components/common/Illustration";

/**
 * Replaces Solution.tsx. The two-pillar framing ("here are two products")
 * becomes a sequence ("here is what happens") — the directory bullets fold
 * into steps 1 and 2, the funding bullets into step 3. No content is lost.
 */
const steps: {
  illustration: IllustrationName;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}[] = [
  {
    illustration: "step-list",
    eyebrow: "Step one",
    title: "List your business",
    description:
      "Create a public profile in minutes — what you do, where you operate, and how to reach you. Free, forever.",
    points: [
      "Free to create a profile",
      "Showcase your business, contact and social links",
    ],
  },
  {
    illustration: "step-discovered",
    eyebrow: "Step two",
    title: "Get discovered",
    description:
      "Your profile is public and searchable, so buyers, partners and collaborators across the continent can find you by name, sector or country.",
    points: [
      "Public and searchable by name, sector, country",
      "Discover potential suppliers and partners",
    ],
  },
  {
    illustration: "step-funding",
    eyebrow: "Step three",
    title: "Unlock funding intelligence",
    description:
      "Members get the Funding Radar: grants, competitions, accelerators and development finance calls, curated to your sector and stage.",
    points: [
      "AI-curated funding opportunities",
      "Grants, competitions, accelerators & more",
      "Access included with annual membership",
    ],
  },
];

const HowItWorks = () => (
  <Section id="solution" tone="tinted">
    <SectionHeading
      eyebrow="How it works"
      title="Two Tools. One Growth Engine."
      lead="Get visible on the free Pan-African SME Directory, and unlock AI-curated funding intelligence when you're ready to scale."
    />

    <div className="mt-16 space-y-16 md:space-y-24">
      {steps.map((step, index) => (
        <Reveal key={step.title}>
          <SplitRow illustration={step.illustration} reverse={index % 2 === 1}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-navy">
              {step.eyebrow}
            </p>
            <h3 className="mb-4 font-display text-2xl font-bold text-ink-strong md:text-3xl">
              {step.title}
            </h3>
            <p className="mb-6 leading-relaxed text-muted-foreground">{step.description}</p>
            <ul className="space-y-3">
              {step.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" />
                  <span className="text-sm text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </SplitRow>
        </Reveal>
      ))}
    </div>
  </Section>
);

export default HowItWorks;
```

- [ ] **Step 4: Write `DirectoryPreview.tsx`**

```tsx
// Frontend/src/components/landing/DirectoryPreview.tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, SectionHeading, BrowserFrame, Reveal } from "@shared/components/marketing";
import { DirectoryCard } from "@/components/directory/DirectoryCard";
import { SAMPLE_PROFILES } from "@/content/homepage";

/**
 * The directory shown with the REAL card component and static sample rows.
 *
 * Static rather than live-queried on purpose: the homepage must not depend on
 * a network round-trip or degrade when the query fails. `BrowserFrame` makes
 * the stage inert because the sample slugs don't resolve — the CTA below is
 * the only real link.
 */
const DirectoryPreview = () => (
  <Section tone="light">
    <SectionHeading
      eyebrow="The directory"
      title="Real businesses, already listed"
      lead="A public, searchable profile that puts your business in front of buyers, partners and funders across the continent."
    />

    <Reveal className="mt-14">
      <BrowserFrame label="cresciva.com/directory">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_PROFILES.map((profile) => (
            <DirectoryCard key={profile.id} profile={profile} />
          ))}
        </div>
      </BrowserFrame>
    </Reveal>

    <div className="mt-10 text-center">
      <Button asChild variant="default" size="lg">
        <Link to="/directory">
          Browse the directory
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">
        Illustrative listings. Browse the directory for live profiles.
      </p>
    </div>
  </Section>
);

export default DirectoryPreview;
```

- [ ] **Step 5: Write `FundingPreview.tsx`**

```tsx
// Frontend/src/components/landing/FundingPreview.tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Section, SectionHeading, Reveal } from "@shared/components/marketing";
import { Illustration } from "@shared/components/common/Illustration";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { SAMPLE_OPPORTUNITY } from "@/content/homepage";

/**
 * One fully legible opportunity, then an honest locked state.
 *
 * Deliberately NOT blurred placeholder cards: a blur implies real content
 * exists behind it at that exact shape and count, which is a claim this page
 * can't support. An explicit locked panel makes the same point without it.
 */
const FundingPreview = () => (
  <Section tone="tinted">
    <SectionHeading
      eyebrow="The Funding Radar"
      title="Live funding calls, curated to you"
      lead="Grants, competitions, accelerators and development finance — filtered to your sector and stage, so you stop hunting across newsletters and group chats."
    />

    <div className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <Reveal>
        <OpportunityCard opportunity={SAMPLE_OPPORTUNITY} open={false} onToggle={() => {}} sample />
      </Reveal>

      <Reveal delay={120}>
        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Illustration name="locked-vault" className="mb-6 h-28" />
          <h3 className="font-display text-lg font-semibold text-ink-strong">
            Members see the full curated list
          </h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Membership unlocks the whole Funding Radar, refreshed and filtered to your business.
          </p>
          <Button asChild variant="default" className="mt-6">
            <Link to="/#pricing">
              See membership
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Reveal>
    </div>
  </Section>
);

export default FundingPreview;
```

- [ ] **Step 6: Delete `Solution.tsx` and update anything importing it**

```bash
git rm Frontend/src/components/landing/Solution.tsx
grep -rn "landing/Solution" Frontend/src Shared/src || echo "no remaining references"
```

Update — do not delete — any test that referenced it.

- [ ] **Step 7: Run it and watch it pass**

Run: `npm test --workspace Frontend -- src/components/landing`
Expected: PASS, 6 tests in `previews.test.tsx` plus Task 10's.

- [ ] **Step 8: Commit**

```bash
git add -A Frontend/src/components/landing
git commit -m "feat(frontend): how-it-works and honest product previews"
```

---

## Task 12: Reassurance, Insights, Closing CTA

**Files:**
- Create: `Frontend/src/components/landing/{Reassurance,Insights,ClosingCTA}.tsx`
- Modify: `Frontend/src/hooks/queries/blog.ts` (add `useLatestPosts`)
- Test: `Frontend/src/components/landing/__tests__/Insights.test.tsx`, `.../reassurance.test.tsx`

**Interfaces:**
- Consumes: `REASSURANCE_DOES`, `REASSURANCE_DOESNT` (Task 7); `CTABand`, `Section`, `SectionHeading`, `Reveal`; `BlogCard`, `ErrorState`, `CardSkeleton`.
- Produces: `useLatestPosts(limit?: number): UseQueryResult<BlogCardRow[]>`; the three components.

- [ ] **Step 1: Write the failing tests**

```tsx
// Frontend/src/components/landing/__tests__/reassurance.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Reassurance from "@/components/landing/Reassurance";
import ClosingCTA from "@/components/landing/ClosingCTA";
import { REASSURANCE_DOES, REASSURANCE_DOESNT } from "@/content/homepage";

vi.mock("@/components/NewsletterSignup", () => ({ default: () => <div /> }));

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Reassurance", () => {
  it("renders both columns in full", () => {
    wrap(<Reassurance />);
    for (const line of [...REASSURANCE_DOES, ...REASSURANCE_DOESNT]) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it("is neutral — no alarm colour anywhere in the 'doesn't' column", () => {
    const { container } = wrap(<Reassurance />);
    expect(container.innerHTML).not.toMatch(/destructive|text-red|bg-amber|text-warning/);
  });

  it("links to the full disclaimer as plain text, not a button", () => {
    wrap(<Reassurance />);
    const link = screen.getByRole("link", { name: /read the full disclaimer/i });
    expect(link).toHaveAttribute("href", "/disclaimer");
    expect(link.className).not.toMatch(/bg-primary/);
  });
});

describe("ClosingCTA", () => {
  it("offers both actions", () => {
    wrap(<ClosingCTA />);
    expect(screen.getByRole("link", { name: /list your business/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see membership/i })).toBeInTheDocument();
  });
});
```

```tsx
// Frontend/src/components/landing/__tests__/Insights.test.tsx
// Separate file: vi.mock hoists per-file, and this one stubs the blog query.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Insights from "@/components/landing/Insights";

const query = vi.hoisted(() => ({
  data: [] as unknown[],
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}));
vi.mock("@/hooks/queries/blog", () => ({ useLatestPosts: () => query }));

const wrap = () => render(<MemoryRouter><Insights /></MemoryRouter>);

const post = {
  id: "b1",
  title: "How to read a grant call",
  slug: "grant-call",
  excerpt: "What funders actually mean.",
  cover_image_url: null,
  category: "Funding",
  tags: [],
  read_time_min: 6,
  author_name: "Cresciva",
  published_at: "2026-07-01T00:00:00.000Z",
  featured: false,
};

describe("Insights", () => {
  beforeEach(() => {
    query.data = [];
    query.isPending = false;
    query.isError = false;
    query.refetch.mockClear();
  });

  it("shows skeletons while loading", () => {
    query.isPending = true;
    wrap();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("offers a retry on error instead of hiding the section", () => {
    query.isError = true;
    wrap();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("shows an illustrated empty state when nothing is published", () => {
    const { container } = wrap();
    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it("renders the posts when they load", () => {
    query.data = [post];
    wrap();
    expect(screen.getByText("How to read a grant call")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test --workspace Frontend -- src/components/landing/__tests__/Insights.test.tsx src/components/landing/__tests__/reassurance.test.tsx`
Expected: FAIL — the three modules and `useLatestPosts` don't exist.

- [ ] **Step 3: Add `useLatestPosts` to `Frontend/src/hooks/queries/blog.ts`**

Append, and extend `blogKeys` with `latest`:

```ts
  latest: (limit: number) => ["blog", "latest", limit] as const,
```

```ts
/** The N most recent published posts — the homepage insights teaser. */
export function useLatestPosts(limit = 3) {
  return useQuery<BlogCardRow[]>({
    queryKey: blogKeys.latest(limit),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(CARD_COLUMNS)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as BlogCardRow[];
    },
  });
}
```

- [ ] **Step 4: Write `Reassurance.tsx`**

```tsx
// Frontend/src/components/landing/Reassurance.tsx
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { Section, SectionHeading, Reveal } from "@shared/components/marketing";
import { Illustration } from "@shared/components/common/Illustration";
import { REASSURANCE_DOES, REASSURANCE_DOESNT } from "@/content/homepage";

/**
 * Replaces the old warning block, and sits AFTER Pricing — it answers doubt at
 * the decision point instead of manufacturing it beforehand.
 *
 * BINDING: the "doesn't" column is neutral. No red, no amber, no
 * alert-triangle, no --destructive token. Both columns carry identical weight
 * and width; neither is subordinate. The disclaimer link is plain text with an
 * arrow, never a button — it offers detail, it does not demand acknowledgement.
 */
const Reassurance = () => (
  <Section tone="light">
    <SectionHeading
      eyebrow="Straight answers"
      title="What Cresciva is — and isn't"
      lead="We would rather you knew exactly what you're buying before you buy it."
    />

    <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-2">
      <Reveal className="h-full">
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-8 shadow-soft">
          <Illustration name="reassurance-does" className="mb-6 h-24 self-start" />
          <h3 className="mb-5 font-display text-xl font-semibold text-ink-strong">
            What Cresciva does
          </h3>
          <ul className="space-y-4">
            {REASSURANCE_DOES.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" />
                <span className="text-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal delay={100} className="h-full">
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-8 shadow-soft">
          <Illustration name="reassurance-doesnt" className="mb-6 h-24 self-start" />
          <h3 className="mb-5 font-display text-xl font-semibold text-ink-strong">
            What it doesn't
          </h3>
          <ul className="space-y-4">
            {REASSURANCE_DOESNT.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground"
                />
                <span className="text-muted-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>

    <p className="mt-10 text-center">
      <Link
        to="/disclaimer"
        className="inline-flex items-center gap-1 text-sm font-semibold text-navy underline-offset-4 hover:underline"
      >
        Read the full disclaimer
        <ArrowRight className="h-4 w-4" />
      </Link>
    </p>
  </Section>
);

export default Reassurance;
```

- [ ] **Step 5: Write `Insights.tsx`**

```tsx
// Frontend/src/components/landing/Insights.tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading, Reveal } from "@shared/components/marketing";
import { ErrorState } from "@shared/components/common/ErrorState";
import { EmptyState } from "@shared/components/common/EmptyState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { BlogCard } from "@/components/blog/BlogCard";
import { useLatestPosts } from "@/hooks/queries/blog";

/**
 * The page's one data-bound section, and therefore the one with real states.
 *
 * An error offers a RETRY rather than rendering null: a failed fetch is a real
 * event, and silently hiding the section makes it look like there is no blog.
 */
const Insights = () => {
  const { data, isPending, isError, refetch } = useLatestPosts(3);
  const posts = data ?? [];

  return (
    <Section tone="light">
      <SectionHeading
        eyebrow="Insights"
        title="Notes on funding and growth"
        lead="Practical writing for African founders — how funders think, and what actually moves a business forward."
      />

      <div className="mt-14">
        {isPending ? (
          <div role="status" aria-busy="true" className="grid gap-6 md:grid-cols-3">
            <span className="sr-only">Loading posts…</span>
            <CardSkeleton media />
            <CardSkeleton media />
            <CardSkeleton media />
          </div>
        ) : isError ? (
          <ErrorState
            title="We couldn't load the latest posts"
            message="Check your connection and try again — the blog itself is still there."
            onRetry={() => refetch()}
          />
        ) : posts.length === 0 ? (
          <EmptyState
            illustration="empty-insights"
            title="No posts yet"
            description="We're writing the first ones now. The blog is where new funding and growth notes land."
            action={{ label: "Visit the blog", to: "/blog" }}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {posts.map((post, index) => (
              <Reveal key={post.id} delay={index * 80} className="h-full">
                <BlogCard post={post} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {posts.length > 0 && (
        <p className="mt-10 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm font-semibold text-navy underline-offset-4 hover:underline"
          >
            Read the blog
            <ArrowRight className="h-4 w-4" />
          </Link>
        </p>
      )}
    </Section>
  );
};

export default Insights;
```

- [ ] **Step 6: Write `ClosingCTA.tsx`**

```tsx
// Frontend/src/components/landing/ClosingCTA.tsx
import { Section, CTABand } from "@shared/components/marketing";
import NewsletterSignup from "@/components/NewsletterSignup";
import { useViewerState, VIEWER_CTA } from "@/hooks/useViewerState";

/** The page's single dark band — it lands because nothing before it was dark. */
const ClosingCTA = () => {
  const viewer = useViewerState();
  const { primary } = VIEWER_CTA[viewer];

  return (
    <Section tone="dark" className="py-16 md:py-20">
      <CTABand
        illustration="cta-launch"
        title="Get found. Get funded."
        lead="List your business free on the Pan-African SME Directory, and unlock curated funding intelligence when you're ready."
        primary={primary}
        secondary={{ label: "See membership", to: "/#pricing" }}
      >
        <p className="mb-3 text-sm font-semibold text-white">Funding notes, every month</p>
        <NewsletterSignup source="landing-cta" variant="inline" />
      </CTABand>
    </Section>
  );
};

export default ClosingCTA;
```

- [ ] **Step 7: Run them and watch them pass**

Run: `npm test --workspace Frontend -- src/components/landing`
Expected: PASS — 4 Insights tests, 4 reassurance tests, plus Tasks 10–11.

- [ ] **Step 8: Commit**

```bash
git add Frontend/src/components/landing Frontend/src/hooks/queries/blog.ts
git commit -m "feat(frontend): reassurance, insights states and closing CTA"
```

---

## Task 13: Compose the page, restyle Pricing and FAQ, retire the old block

**Files:**
- Modify: `Frontend/src/pages/Index.tsx`, `Frontend/src/components/landing/{Pricing,FAQ}.tsx`
- Delete: `Frontend/src/components/landing/Disclaimer.tsx`
- Test: `Frontend/src/pages/__tests__/Index.test.tsx`

**Interfaces:**
- Consumes: every landing section from Tasks 10–12; `HOMEPAGE_FAQS` (Task 7).
- Produces: the twelve-section homepage.

- [ ] **Step 1: Write the failing test**

```tsx
// Frontend/src/pages/__tests__/Index.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "@/pages/Index";
import { HOMEPAGE_FAQS } from "@/content/faqs";

const auth = vi.hoisted(() => ({ user: null as unknown, loading: false }));
vi.mock("@shared/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/useViewerState", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useViewerState")>(
    "@/hooks/useViewerState",
  );
  return { ...actual, useViewerState: () => "anonymous" };
});
vi.mock("@/hooks/queries/blog", () => ({
  useLatestPosts: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/components/NewsletterSignup", () => ({ default: () => <div /> }));
vi.mock("@/components/billing/CheckoutButton", () => ({
  CheckoutButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

const wrap = () => render(<MemoryRouter><Index /></MemoryRouter>);

describe("landing page", () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
  });

  it("renders exactly one h1", () => {
    wrap();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("keeps the pricing and faq anchors other pages link to", () => {
    const { container } = wrap();
    expect(container.querySelector("#pricing")).toBeTruthy();
    expect(container.querySelector("#faq")).toBeTruthy();
  });

  it("shows five FAQs and a link to the rest", () => {
    wrap();
    for (const faq of HOMEPAGE_FAQS) {
      expect(screen.getByText(faq.question)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /see all questions/i })).toHaveAttribute("href", "/faq");
  });

  it("no longer carries the pre-pricing warning block", () => {
    wrap();
    expect(screen.queryByText("Important Disclaimer")).not.toBeInTheDocument();
  });

  it("links to the disclaimer from the reassurance section", () => {
    wrap();
    expect(screen.getByRole("link", { name: /read the full disclaimer/i })).toBeInTheDocument();
  });

  it("ships no invented stats or testimonials", () => {
    const { container } = wrap();
    expect(container.querySelector("figure")).toBeNull();
    expect(container.querySelector("dl")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test --workspace Frontend -- src/pages/__tests__/Index.test.tsx`
Expected: FAIL — Index still renders the old six-section page.

- [ ] **Step 3: Rewrite `Index.tsx`**

```tsx
// Frontend/src/pages/Index.tsx
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { DEFAULT_AUTHED_ROUTE } from "@shared/lib/routes";
import { SEO } from "@shared/components/common/SEO";
import Hero from "@/components/landing/Hero";
import ViewerBand from "@/components/landing/ViewerBand";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import DirectoryPreview from "@/components/landing/DirectoryPreview";
import FundingPreview from "@/components/landing/FundingPreview";
import Pricing from "@/components/landing/Pricing";
import Reassurance from "@/components/landing/Reassurance";
import Insights from "@/components/landing/Insights";
import FAQ from "@/components/landing/FAQ";
import ClosingCTA from "@/components/landing/ClosingCTA";

/**
 * The twelve-section landing page.
 *
 * Tone alternates light / tinted down the page, with exactly one dark band at
 * the end — it lands precisely because nothing before it was dark.
 *
 * Reassurance sits AFTER Pricing on purpose: it answers doubt at the decision
 * point rather than manufacturing it beforehand.
 */
const Index = () => {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  // Returning members land on their dashboard, not the marketing page.
  // Escape hatch: /?home=1 keeps them here — and the sections adapt to them.
  if (!loading && user && params.get("home") !== "1") {
    return <Navigate to={DEFAULT_AUTHED_ROUTE} replace />;
  }

  return (
    <div className="overflow-x-hidden">
      <SEO
        title="Pan-African SME Directory & Funding Intelligence"
        description="List your business on the Pan-African SME directory and find real, current funding opportunities — grants, accelerators, and fellowships curated for African founders."
      />
      <Hero />
      <ViewerBand />
      <Problem />
      <HowItWorks />
      <DirectoryPreview />
      <FundingPreview />
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

- [ ] **Step 4: Rewrite `FAQ.tsx` to read the content file**

Replace the hardcoded array and the section shell:

```tsx
// Frontend/src/components/landing/FAQ.tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@shared/components/ui/accordion";
import { Section, SectionHeading } from "@shared/components/marketing";
import { HOMEPAGE_FAQS } from "@/content/faqs";

/**
 * The five questions that block a purchase decision. The other four are
 * positioning, not blockers — they live on /faq, from the same source file.
 * No answer was deleted; the page just stopped being a wall.
 */
const FAQ = () => (
  <Section id="faq" tone="tinted" containerClassName="max-w-4xl">
    <SectionHeading
      eyebrow="Questions"
      title="Frequently Asked Questions"
      lead="Everything you need to know before joining The Cresciva Collective."
    />

    <Accordion type="single" collapsible className="mt-14 space-y-4">
      {HOMEPAGE_FAQS.map((faq) => (
        <AccordionItem
          key={faq.id}
          value={faq.id}
          className="rounded-xl border border-border bg-card px-6 shadow-soft data-[state=open]:border-primary/40 data-[state=open]:shadow-medium"
        >
          <AccordionTrigger className="py-5 text-left font-semibold text-foreground hover:text-navy hover:no-underline [&[data-state=open]]:text-navy">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>

    <div className="mt-10 text-center">
      <Link
        to="/faq"
        className="inline-flex items-center gap-1 text-sm font-semibold text-navy underline-offset-4 hover:underline"
      >
        See all questions
        <ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-4 text-muted-foreground">
        Still have questions?{" "}
        <a
          href="mailto:hello@cresciva.com"
          className="font-semibold text-navy underline-offset-4 transition-colors hover:text-navy-light hover:underline"
        >
          Reach out to us
        </a>
      </p>
    </div>
  </Section>
);

export default FAQ;
```

- [ ] **Step 5: Restyle `Pricing.tsx` with the kit and add the disclaimer link**

Keep every existing behaviour — `CheckoutButton`, `CurrencyToggle`, `MEMBERSHIP_FEATURES`, the WhatsApp concierge link, `id="pricing"`. Two changes only:

Replace the outer `<section id="pricing" className="bg-secondary py-24">` + inner container with the kit:

```tsx
    <Section id="pricing" tone="light">
      <SectionHeading
        eyebrow="Membership"
        title={<>Invest in Your <span className="text-primary-dark">Growth Journey</span></>}
        lead="One annual membership, complete access. Simple, transparent, built for African founders ready to scale."
      />
```

(closing `</Section>` replaces the two closing `</div></section>` tags), and add the disclaimer link to the fine print at the bottom:

```tsx
      <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
        Access is activated automatically once payment is confirmed — usually under a minute.
        Paying by transfer or mobile money? We activate within 12 hours. Membership does not
        auto-renew.{" "}
        <Link to="/disclaimer" className="font-semibold text-navy underline-offset-4 hover:underline">
          Read the full disclaimer
        </Link>
        .
      </p>
```

Add the imports: `import { Section, SectionHeading } from "@shared/components/marketing";`

- [ ] **Step 6: Delete the old warning block**

```bash
git rm Frontend/src/components/landing/Disclaimer.tsx
grep -rn "landing/Disclaimer" Frontend/src Shared/src || echo "no remaining references"
```

- [ ] **Step 7: Run it and watch it pass**

Run: `npm test --workspace Frontend -- src/pages/__tests__/Index.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 8: Commit**

```bash
git add -A Frontend/src
git commit -m "feat(frontend): compose the twelve-section landing page"
```

---

## Task 14: Full verification

**Files:** none created — this task only runs checks and fixes what they surface.

- [ ] **Step 1: Type-check and lint**

Run: `npm run lint && npm run build`
Expected: no errors. Tailwind must resolve `bg-mk-canvas`, `text-mk-ink-muted`, `bg-mk-surface`, `bg-mk-raised`, `border-mk-border` — a missing class silently renders transparent, so grep the built CSS:

```bash
grep -c "mk-canvas\|--mk-canvas" Frontend/dist/assets/*.css
```

- [ ] **Step 2: Run every workspace's tests**

Run: `npm test`
Expected: the whole suite green, including the pre-existing tests.

- [ ] **Step 3: Confirm nothing references the deleted modules**

```bash
grep -rn "landing/Solution\|landing/Disclaimer" Frontend Shared --include=*.ts --include=*.tsx
```

Expected: no output.

- [ ] **Step 4: Confirm the contrast guard still passes and covers the new pairs**

Run: `npm test --workspace Shared -- src/styles/__tests__/tokens.test.ts`
Expected: PASS. No new token pairs were introduced — the plan reuses `--mk-*` and the existing light tokens — so no new cases are required. If a section introduced a pair not in the table, add it here.

- [ ] **Step 5: Manual pass**

Run: `npm run dev` and check at 375px, 768px, 1440px:

1. Hero headline, subhead and both CTAs visible at 375px without scrolling.
2. Tone rhythm reads light → tinted → light → tinted, with exactly one dark band before the footer.
3. Every section leads with a visual.
4. Keyboard: tab from the top — focus ring visible in every tone; the directory preview's sample cards are **skipped entirely** (inert); `/faq` and `/disclaimer` reachable from the footer.
5. Reveal: sections fade and rise once on first scroll, never replay on scroll back.
6. With `prefers-reduced-motion: reduce` set in the OS, every section is visible immediately with no transform.
7. `/?home=1` while signed in without a profile shows the `ViewerBand` nudge and the "Finish your listing" hero CTA.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: verification pass on the illustration-first landing page"
```
