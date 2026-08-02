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
