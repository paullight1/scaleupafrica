import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Usage-level guard for A11Y-1 (WCAG 1.4.3). The `text-primary` token is orange
 * (#FF7A59, ~2.5:1 on white/tint) — it is ONLY legible as text on a navy/dark
 * surface. This scan fails the build if a bare `text-primary` utility reappears
 * on a light surface, which is exactly the regression the dashboard fixes closed
 * (DashboardNav/DashboardMobileNav/OpportunityRow/NextBestActions/ProfilePreviewCard).
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

const SRC = resolve(__dirname, "..");

// The full `text-primary` utility incl. any leading variant chain (e.g. `md:hover:`),
// stopping before `-dark/-foreground/-hover` (negative lookahead on `[-\w]`).
const TEXT_PRIMARY_UTILITY = /(?:[a-z0-9[\]=.%/*_-]+:)*text-primary(?![-\w])/gi;

/** A usage is a real (light-surface) offender only if no `dark:` variant gates it. */
function lightOffenders(line: string): string[] {
  return (line.match(TEXT_PRIMARY_UTILITY) ?? []).filter((tok) => !tok.includes("dark:"));
}

const ALLOWLIST: Array<[string, string]> = [
  ["components/ui/radio-group.tsx", "stock shadcn radio indicator (non-text)"],
  ["components/landing/Hero.tsx", "on the dark bg-hero section"],
  ["components/admin/AdminLayout.tsx", "dark admin sidebar + logotype"],
  ["components/common/AppHeader.tsx", "brand logotype full-stop on dark header"],
  ["components/common/AppFooter.tsx", "brand logotype full-stop on dark footer"],
  ["components/common/AuthShell.tsx", "brand logotype full-stop"],
  ["pages/Funding.tsx", "on the bg-navy funding header"],
  ["pages/About.tsx", "on the bg-navy stats band"],
  ["pages/Directory.tsx", "on the bg-navy directory header"],
  ["pages/dashboard/DashboardProfile.tsx", "icon inside the bg-navy 'You're live' status box"],
];

// Admin is a separate internal surface with its own dark layout — allow as a group.
const ALLOWLIST_DIRS = ["pages/admin/", "components/admin/"];

const isTestFile = (p: string) =>
  p.includes("__tests__") || /\.(test|spec)\.[tj]sx?$/.test(p) || p.includes(`${"test"}/`);

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, acc);
    else if (/\.(tsx?|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const isAllowed = (rel: string) =>
  ALLOWLIST.some(([p]) => rel === p) || ALLOWLIST_DIRS.some((d) => rel.startsWith(d));

describe("A11Y-1: no orange `text-primary` as text on light surfaces", () => {
  const files = collect(SRC).filter((f) => !isTestFile(f.slice(SRC.length + 1)));

  it("has zero bare `text-primary` outside allowlisted navy/dark contexts", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const rel = f.slice(SRC.length + 1);
      if (isAllowed(rel)) continue;
      const lines = readFileSync(f, "utf8").split("\n");
      lines.forEach((line, i) => {
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
