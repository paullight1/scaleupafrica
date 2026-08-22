import { describe, expect, it } from "vitest";
import {
  canonicalFundingSourceUrl,
  fundingVerificationStatus,
  hasUsableFundingSource,
} from "./fundingTrust";

const NOW = new Date("2026-08-22T00:00:00Z");

describe("canonicalFundingSourceUrl", () => {
  it("removes tracking parameters and fragments", () => {
    expect(
      canonicalFundingSourceUrl("https://example.org/apply?utm_source=email&program=green#top"),
    ).toBe("https://example.org/apply?program=green");
  });

  it("preserves meaningful query parameters", () => {
    expect(canonicalFundingSourceUrl("https://example.org/apply?program=a")).not.toBe(
      canonicalFundingSourceUrl("https://example.org/apply?program=b"),
    );
  });

  it("rejects non-http protocols", () => {
    expect(canonicalFundingSourceUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("fundingVerificationStatus", () => {
  it("requires both a usable source URL and a recent check for verified status", () => {
    expect(fundingVerificationStatus(null, "2026-08-21T00:00:00Z", NOW)).toBe("unverified");
    expect(fundingVerificationStatus("https://example.org/program", null, NOW)).toBe("unverified");
    expect(
      fundingVerificationStatus("https://example.org/program", "2026-08-21T00:00:00Z", NOW),
    ).toBe("verified");
  });

  it("marks checked evidence stale after the verification window", () => {
    expect(
      fundingVerificationStatus("https://example.org/program", "2026-08-01T00:00:00Z", NOW),
    ).toBe("stale");
  });
});

describe("hasUsableFundingSource", () => {
  it("accepts only canonicalizable http/https evidence", () => {
    expect(hasUsableFundingSource("https://example.org/program")).toBe(true);
    expect(hasUsableFundingSource("mailto:funding@example.org")).toBe(false);
    expect(hasUsableFundingSource("")).toBe(false);
  });
});
