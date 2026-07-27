import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { contrastRatio } from "@shared/lib/color";

// NOTE: deliberately not `new URL("../index.css", import.meta.url)`. Under
// this workspace's jsdom test environment, jsdom's global `URL` resolves
// relative URLs against `http://localhost:3000` rather than the file:// base
// passed in, so that pattern throws "The URL must be of scheme file". Using
// node:path against the de-URL'd dirname sidesteps jsdom's URL entirely.
const CSS = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../index.css"),
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
