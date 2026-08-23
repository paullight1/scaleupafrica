import { describe, expect, it } from "vitest";
import { resolveFeedVerificationStatus } from "./feedTrust";

const FRESH = "2026-08-22T12:00:00Z";
const NOW = new Date("2026-08-23T00:00:00Z");

describe("resolveFeedVerificationStatus", () => {
  it("never upgrades a stored unverified row from URL and timestamp alone", () => {
    expect(resolveFeedVerificationStatus("unverified", "https://funder.example/program", FRESH, NOW)).toBe("unverified");
  });

  it("never upgrades a stored stale row to verified", () => {
    expect(resolveFeedVerificationStatus("stale", "https://funder.example/program", FRESH, NOW)).toBe("stale");
  });

  it("keeps stored verified only while source evidence is still valid and fresh", () => {
    expect(resolveFeedVerificationStatus("verified", "https://funder.example/program", FRESH, NOW)).toBe("verified");
    expect(resolveFeedVerificationStatus("verified", null, FRESH, NOW)).toBe("unverified");
    expect(resolveFeedVerificationStatus("verified", "https://funder.example/program", "2026-01-01T00:00:00Z", NOW)).toBe("stale");
  });

  it("treats unknown stored trust as unverified", () => {
    expect(resolveFeedVerificationStatus("something-else", "https://funder.example/program", FRESH, NOW)).toBe("unverified");
  });
});
