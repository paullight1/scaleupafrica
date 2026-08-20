import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_ORIGIN, normalizeSiteOrigin } from "../../../config/site-origin.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

describe("Cresciva production origin contract", () => {
  it("normalizes overrides to scheme + host only", () => {
    expect(normalizeSiteOrigin(`${DEFAULT_SITE_ORIGIN}/`)).toBe(DEFAULT_SITE_ORIGIN);
    expect(normalizeSiteOrigin("https://preview.example.com/")) .toBe("https://preview.example.com");
  });

  it("rejects paths, query strings, fragments, and insecure remote origins", () => {
    expect(() => normalizeSiteOrigin("https://example.com/app")).toThrow(/scheme \+ host/i);
    expect(() => normalizeSiteOrigin("https://example.com/?preview=1")).toThrow(/scheme \+ host/i);
    expect(() => normalizeSiteOrigin("https://example.com/#x")).toThrow(/scheme \+ host/i);
    expect(() => normalizeSiteOrigin("http://example.com")).toThrow(/HTTPS/i);
    expect(normalizeSiteOrigin("http://localhost:8080/")).toBe("http://localhost:8080");
  });

  it("keeps the default production literal in one file only", () => {
    const consumers = [
      "Shared/src/lib/siteMeta.ts",
      "Frontend/vite.config.ts",
      "scripts/generate-sitemap.mjs",
    ];
    for (const relative of consumers) {
      const content = readFileSync(resolve(ROOT, relative), "utf8");
      expect(content, `${relative} must import the shared contract`).not.toContain(DEFAULT_SITE_ORIGIN);
      expect(content, `${relative} must reference the shared contract`).toContain("DEFAULT_SITE_ORIGIN");
    }
  });
});
