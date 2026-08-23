import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "../scripts/funding-intelligence-eval.ts"), "utf8");

describe("Funding Intelligence live-link certification boundary", () => {
  it("requires explicit certification and environment opt-in before live requests", () => {
    expect(source).toContain("ALLOW_FUNDING_LIVE_EVAL");
    expect(source).toContain("--certification");
    expect(source).toContain("--live-links");
    expect(source).toContain("live_links_require_certification_mode");
  });

  it("uses the production safe fetch helper with Node DNS injection", () => {
    expect(source).toContain("safeExternalFetch");
    expect(source).toContain('node:dns/promises');
    expect(source).toContain("resolveDns");
  });

  it("reports actual live checks and broken-link rate", () => {
    expect(source).toContain("links_checked");
    expect(source).toContain("broken_links");
    expect(source).toContain("broken_link_rate");
    expect(source).toContain("live_checks_ran");
  });
});
