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
    // NOTE: "217 47% 20%" is a rounded approximation of #1B2A4A's true HSL
    // (H is actually ~220.85 deg for that hex). Verified independently via
    // Python's colorsys.hls_to_rgb(217/360, 0.20, 0.47) -> (27, 45, 75).
    // The brief's original expectation of [27, 42, 74] (the exact hex) does
    // not round-trip through the rounded HSL string with the standard
    // algorithm; see task-1-report.md for detail.
    expect(hslStringToRgb("217 47% 20%")).toEqual([27, 45, 75]);
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
    // 5.01 is the ratio for the exact hex pair (#1B2A4A on #FF6B2C). Computed
    // from the rounded token string "217 47% 20%" the true value is ~4.85 —
    // still comfortably above AA (4.5), which is what the token guard test
    // actually checks. See task-1-report.md for detail.
    expect(contrastRatio("217 47% 20%", "17.9 100% 58.6%")).toBeCloseTo(4.85, 1);
  });
});
