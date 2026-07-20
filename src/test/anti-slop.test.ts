import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Fails the build if any anti-slop / dead-token pattern reappears in the app
 * source (see docs/plans/01 §6, §11.2). Header.tsx and Footer.tsx are excluded
 * — plan 02 deletes them, so they're intentionally skipped in the sweep.
 */

const SRC = resolve(__dirname, "..");

// Files/dirs excluded from the scan.
const EXCLUDE_PATHS = [
  "components/landing/Header.tsx",
  "components/landing/Footer.tsx",
];
const isTestFile = (p: string) =>
  p.includes("__tests__") || /\.(test|spec)\.[tj]sx?$/.test(p) || p.includes(`${"test"}/`);

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

function collect(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collect(full, acc);
    } else if (/\.(tsx?|css)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const files = collect(SRC).filter((f) => {
  const rel = f.slice(SRC.length + 1);
  if (isTestFile(rel)) return false;
  return !EXCLUDE_PATHS.some((ex) => rel.endsWith(ex));
});

describe("anti-slop source scan", () => {
  it.each(BANNED)("has zero occurrences of %s", (_label, re) => {
    const offenders = files.filter((f) => re.test(readFileSync(f, "utf8")));
    expect(offenders, `Found in:\n${offenders.join("\n")}`).toHaveLength(0);
  });
});
