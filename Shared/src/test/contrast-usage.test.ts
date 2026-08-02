import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { collectSources } from "./roots";

/**
 * Usage-level guard for A11Y-1 (WCAG 1.4.3). The `text-primary` token is orange
 * (#FF7A59, ~2.5:1 on white/tint) — it is ONLY legible as text on a navy/dark
 * surface. This scan fails the build if a bare `text-primary` utility reappears
 * on a light surface, which is exactly the regression the dashboard fixes closed
 * (DashboardNav/DashboardMobileNav/OpportunityRow/NextBestActions/ProfilePreviewCard).
 *
 * Sweeps Shared, Frontend and AdminPanel — the UI kit lives in Shared, so scanning
 * a single app would leave most of the surface unchecked.
 *
 * Matched: the bare utility `text-primary` (incl. `text-primary/NN`).
 * Not matched: `text-primary-dark|-foreground|-hover` (passing tokens) and any
 * `dark:`-variant chain (e.g. `dark:text-primary`, `dark:hover:text-primary`) —
 * those only apply in dark mode, where orange-on-dark passes.
 *
 * ALLOWLIST = files where the token is verifiably on a navy/dark background, a
 * brand logotype (no contrast requirement), or a stock shadcn component. Note the
 * dashboard components are intentionally NOT allowlisted, so any regression there
 * trips this test.
 */

// The full `text-primary` utility incl. any leading variant chain (e.g. `md:hover:`),
// stopping before `-dark/-foreground/-hover` (negative lookahead on `[-\w]`).
const TEXT_PRIMARY_UTILITY = /(?:[a-z0-9[\]=.%/*_-]+:)*text-primary(?![-\w])/gi;

/** A usage is a real (light-surface) offender only if no `dark:` variant gates it. */
function lightOffenders(line: string): string[] {
  return (line.match(TEXT_PRIMARY_UTILITY) ?? []).filter((tok) => !tok.includes("dark:"));
}

const ALLOWLIST: Array<[string, string]> = [
  ["Shared/components/ui/radio-group.tsx", "stock shadcn radio indicator (non-text)"],
  // Both gate the orange behind `tone === "dark"`, i.e. the --mk-* marketing
  // bands. tokens.test.ts verifies orange there: 6.66:1 on --mk-canvas,
  // 5.89:1 on --mk-surface. The light branch of each uses navy/primary-dark.
  ["Shared/components/marketing/Eyebrow.tsx", "dark-tone branch only, on --mk-canvas"],
  ["Shared/components/marketing/StatBand.tsx", "dark-tone branch only, on --mk-canvas"],
  ["Frontend/components/common/AppHeader.tsx", "brand logotype full-stop on dark header"],
  ["Frontend/components/common/AppFooter.tsx", "brand logotype full-stop on dark footer"],
  ["Frontend/components/common/AuthShell.tsx", "brand logotype full-stop"],
  ["Frontend/pages/Funding.tsx", "on the bg-navy funding header"],
  ["Frontend/pages/About.tsx", "on the bg-navy stats band"],
  ["Frontend/pages/Directory.tsx", "on the bg-navy directory header"],
  ["Frontend/pages/dashboard/DashboardProfile.tsx", "icon inside the bg-navy 'You're live' status box"],
];

// The admin panel is a separate internal surface with its own dark layout.
const ALLOWLIST_DIRS = ["AdminPanel/"];

const isAllowed = (rel: string) =>
  ALLOWLIST.some(([p]) => rel === p) || ALLOWLIST_DIRS.some((d) => rel.startsWith(d));

describe("A11Y-1: no orange `text-primary` as text on light surfaces", () => {
  const files = collectSources();

  it("sweeps every app root", () => {
    // Guards the sweep itself: a bad path would silently scan nothing and pass.
    for (const app of ["Shared/", "Frontend/", "AdminPanel/"]) {
      expect(files.some(([rel]) => rel.startsWith(app)), `no files collected from ${app}`).toBe(true);
    }
  });

  it("has zero bare `text-primary` outside allowlisted navy/dark contexts", () => {
    const offenders: string[] = [];
    for (const [rel, abs] of files) {
      if (isAllowed(rel)) continue;
      readFileSync(abs, "utf8").split("\n").forEach((line, i) => {
        if (lightOffenders(line).length > 0) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(
      offenders,
      `Bare orange \`text-primary\` on a (presumed) light surface — use text-ink-strong / text-navy, ` +
        `or text-primary-dark for large/non-text, or allowlist a verified navy/dark usage:\n${offenders.join("\n")}`,
    ).toHaveLength(0);
  });
});
