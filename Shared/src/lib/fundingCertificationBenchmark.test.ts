import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateFundingCertificationGate,
  type FundingCertificationObservation,
} from "./fundingCertification";

type Fixture = {
  version: string;
  adjudication: string;
  observations: FundingCertificationObservation[];
};

function loadFixture(): Fixture {
  const path = resolve(
    process.cwd(),
    "../docs/production-readiness/fixtures/funding-intelligence-certification-v1.json",
  );
  return JSON.parse(readFileSync(path, "utf8")) as Fixture;
}

describe("Funding Intelligence P0-D adjudicated benchmark", () => {
  it("is versioned, non-trivial and clears every repository threshold", () => {
    const fixture = loadFixture();
    expect(fixture.version).toBe("2026-08-22-v1");
    expect(fixture.observations.length).toBeGreaterThanOrEqual(25);

    const result = evaluateFundingCertificationGate(fixture.observations);
    expect(result.pass, result.failures.join(", ")).toBe(true);
    expect(result.metrics.currentOpenPrecision).toBeGreaterThanOrEqual(0.98);
    expect(result.metrics.confirmedDeadlineSourceCoverage).toBe(1);
    expect(result.metrics.hardEligibilityFalsePositiveRate).toBeLessThan(0.02);
    expect(result.metrics.precisionAt5).toBeGreaterThanOrEqual(0.8);
    expect(result.metrics.aiPromotedCount).toBe(0);
    expect(result.metrics.staleOpenCount).toBe(0);
    expect(result.metrics.brokenAuthoritativeLinkRate).toBeLessThanOrEqual(0.01);
  });
});