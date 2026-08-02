import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { collectSources } from "./roots";

/**
 * Fails the build if any anti-slop / dead-token pattern reappears in app source
 * (see docs/plans/01 §6, §11.2). Sweeps Shared, Frontend and AdminPanel — these
 * are design-system rules, so they hold across every app, not just the web app.
 *
 * Header.tsx and Footer.tsx are excluded — plan 02 deletes them.
 */

const EXCLUDE_PATHS = [
  "components/landing/Header.tsx",
  "components/landing/Footer.tsx",
];

const BANNED: Array<[string, RegExp]> = [
  ["text-gradient", /text-gradient/],
  ["forest color class", /\bforest\b/],
  ["gold color class", /\bgold\b/],
  ["font-serif", /font-serif/],
  ["Playfair", /Playfair/],
  ["hover:scale-105", /hover:scale-105/],
  ["whileInView", /whileInView/],
  ["Google Fonts import", /fonts\.googleapis\.com/],
  ["bg-hero-pattern", /bg-hero-pattern/],
  ["Sparkles", /Sparkles/],
];

const files = collectSources().filter(([rel]) => !EXCLUDE_PATHS.some((ex) => rel.endsWith(ex)));

describe("anti-slop source scan", () => {
  it("sweeps every app root", () => {
    // Guards the sweep itself: a bad path would silently scan nothing and pass.
    for (const app of ["Shared/", "Frontend/", "AdminPanel/"]) {
      expect(files.some(([rel]) => rel.startsWith(app)), `no files collected from ${app}`).toBe(true);
    }
  });

  it.each(BANNED)("has zero occurrences of %s", (_label, re) => {
    const offenders = files.filter(([, abs]) => re.test(readFileSync(abs, "utf8"))).map(([rel]) => rel);
    expect(offenders, `Found in:\n${offenders.join("\n")}`).toHaveLength(0);
  });
});
