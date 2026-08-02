import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Every app source root the design-system guards must sweep.
 *
 * These rules (banned tokens, contrast) are properties of the design system, so
 * they have to hold everywhere the system is used — not just in whichever app
 * happens to host the test. Paths are reported as `<App>/<path-under-src>` so a
 * failure names the app it came from and allowlists stay unambiguous.
 */
export const ROOTS: Array<[app: string, dir: string]> = [
  ["Shared", resolve(__dirname, "..")],
  ["Frontend", resolve(__dirname, "../../../Frontend/src")],
  ["AdminPanel", resolve(__dirname, "../../../AdminPanel/src")],
];

export const isTestFile = (p: string) =>
  p.includes("__tests__") || /\.(test|spec)\.[tj]sx?$/.test(p) || p.includes("test/");

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx?|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

/** All non-test source files across every root, as [relPath, absPath] pairs. */
export function collectSources(): Array<[rel: string, abs: string]> {
  const out: Array<[string, string]> = [];
  for (const [app, dir] of ROOTS) {
    for (const abs of walk(dir)) {
      const rel = `${app}/${abs.slice(dir.length + 1)}`;
      if (!isTestFile(rel)) out.push([rel, abs]);
    }
  }
  return out;
}
