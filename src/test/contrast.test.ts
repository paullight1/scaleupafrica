import { describe, it, expect } from "vitest";

/**
 * WCAG contrast guard. Token values are the canonical HSL triplets from
 * docs/plans/00-FOUNDATION.md §1.1 (as amended §8.1). If anyone edits a token
 * below its AA/1.4.11 threshold, this test fails the build.
 */

// Canonical token HSL triplets [h, s%, l%] (light mode unless noted).
const TOKENS = {
  background: [0, 0, 100],
  foreground: [210, 29, 27],
  inkStrong: [217, 47, 20],
  mutedForeground: [210, 27, 44],
  primary: [11, 100, 68],
  primaryHover: [12, 100, 61],
  primaryDark: [11, 78, 52],
  navy: [217, 47, 20],
  ring: [11, 78, 52],
  destructiveStrong: [356, 65, 42],
  successStrong: [170, 100, 25],
  white: [0, 0, 100],
} as const;

function hslToRgb([h, s, l]: readonly [number, number, number] | number[]): [number, number, number] {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function relLum(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number[], b: number[]): number {
  const l1 = relLum(hslToRgb(a));
  const l2 = relLum(hslToRgb(b));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const CASES: Array<[string, number[], number[], number]> = [
  ["body text on white", TOKENS.foreground, TOKENS.background, 4.5],
  ["headings on white", TOKENS.inkStrong, TOKENS.background, 7],
  ["muted text on white", TOKENS.mutedForeground, TOKENS.background, 4.5],
  ["white on navy", TOKENS.white, TOKENS.navy, 4.5],
  ["orange text on navy", TOKENS.primary, TOKENS.navy, 4.5],
  ["navy label on orange", TOKENS.inkStrong, TOKENS.primary, 4.5],
  ["navy label on orange hover", TOKENS.inkStrong, TOKENS.primaryHover, 4.5],
  ["primary-dark icon on white (1.4.11)", TOKENS.primaryDark, TOKENS.background, 3],
  ["focus ring on white (1.4.11)", TOKENS.ring, TOKENS.background, 3],
  ["destructive-strong on white", TOKENS.destructiveStrong, TOKENS.background, 4.5],
  ["white on destructive-strong", TOKENS.white, TOKENS.destructiveStrong, 4.5],
  ["success-strong on white", TOKENS.successStrong, TOKENS.background, 4.5],
];

describe("WCAG contrast of design tokens", () => {
  it.each(CASES)("%s meets its threshold", (_label, fg, bg, threshold) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(threshold);
  });
});
