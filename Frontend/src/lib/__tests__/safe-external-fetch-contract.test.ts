import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourcePath = resolve(
  process.cwd(),
  "../supabase/functions/_shared/safeExternalFetch.ts",
);
const source = existsSync(sourcePath) ? readFileSync(sourcePath, "utf8") : "";

describe("safeExternalFetch source contract", () => {
  it("exists and permits only HTTP(S)", () => {
    expect(source).toContain("safeExternalFetch");
    expect(source).toContain('url.protocol !== "http:"');
    expect(source).toContain('url.protocol !== "https:"');
  });

  it("blocks localhost, RFC1918, link-local and cloud metadata targets", () => {
    for (const marker of [
      "localhost",
      "127.0.0.0/8",
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16",
      "169.254.0.0/16",
      "169.254.169.254",
      "::1",
      "fc00::/7",
      "fe80::/10",
      "Deno.resolveDns",
    ]) {
      expect(source).toContain(marker);
    }
  });

  it("validates redirects manually and caps them at five", () => {
    expect(source).toContain("DEFAULT_MAX_REDIRECTS = 5");
    expect(source).toContain('redirect: "manual"');
    expect(source).toContain("validateExternalUrl");
  });

  it("defaults to ten seconds and a two MiB response body cap", () => {
    expect(source).toContain("DEFAULT_TIMEOUT_MS = 10_000");
    expect(source).toContain("DEFAULT_MAX_BYTES = 2 * 1024 * 1024");
    expect(source).toContain("body_too_large");
  });

  it("allows only HTML, plain text and JSON evidence", () => {
    expect(source).toContain("text/html");
    expect(source).toContain("text/plain");
    expect(source).toContain("application/json");
    expect(source).toContain("unsupported_content_type");
  });
});
