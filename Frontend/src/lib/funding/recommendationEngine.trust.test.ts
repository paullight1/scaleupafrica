import { describe, expect, it } from "vitest";
import { recommendOpportunity, type RecommendationOpportunity, type RecommendationProfile } from "./recommendationEngine";

const NOW = new Date("2026-08-23T00:00:00Z");
const profile: RecommendationProfile = {
  country: "Nigeria",
  sector: "Agritech",
  keywords: ["climate"],
  businessStage: "growth",
  applicationReadiness: "ready",
};
const base: RecommendationOpportunity = {
  title: "Climate Grant",
  funder: "Funder",
  type: "Grant",
  countryFocus: ["Nigeria"],
  tags: ["agritech", "climate"],
  sourceUrl: "https://funder.example/program",
  lastVerifiedAt: "2026-08-22T12:00:00Z",
  verificationStatus: "verified",
  applicationStatus: "open",
  statusCheckedAt: "2026-08-22T20:00:00Z",
  applicationUrl: "https://funder.example/apply",
  details: { business_stages: ["growth"] },
};

describe("recommendation primary trust ceiling", () => {
  it("allows a fresh verified eligible open record", () => {
    expect(recommendOpportunity(profile, base, NOW).primaryApplyEligible).toBe(true);
  });

  it("blocks primary apply when source verification is stale even if stored state still says verified", () => {
    const result = recommendOpportunity(profile, { ...base, lastVerifiedAt: "2026-08-01T00:00:00Z" }, NOW);
    expect(result.primaryApplyEligible).toBe(false);
  });

  it("blocks primary apply when verified state has no authoritative source URL", () => {
    const result = recommendOpportunity(profile, { ...base, sourceUrl: null }, NOW);
    expect(result.primaryApplyEligible).toBe(false);
  });
});
