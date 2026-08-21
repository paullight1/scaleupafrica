import { describe, expect, it } from "vitest";
import {
  rankRecommendations,
  recommendOpportunity,
  type RecommendationOpportunity,
  type RecommendationProfile,
} from "./recommendationEngine";

const NOW = new Date("2026-08-21T12:00:00Z");

function profile(overrides: Partial<RecommendationProfile> = {}): RecommendationProfile {
  return {
    country: "Nigeria",
    sector: "Agritech & Food",
    keywords: ["climate", "agriculture", "export"],
    shortDescription: "We help smallholder farmers detect crop disease using AI.",
    longDescription: "Our platform improves food security and climate resilience for African farmers.",
    ...overrides,
  };
}

function opportunity(
  overrides: Partial<RecommendationOpportunity> = {},
): RecommendationOpportunity {
  return {
    id: "o1",
    title: "Climate Smart Agriculture Growth Fund",
    funder: "Example Foundation",
    type: "Grant",
    summary: "Funding for agritech companies improving food security and climate resilience.",
    eligibility: "African growth-stage agritech businesses",
    url: "https://example.org/program",
    deadline: "2026-10-01",
    tags: ["agriculture", "climate", "food security"],
    countryFocus: ["Nigeria", "Ghana"],
    featured: false,
    lastVerifiedAt: "2026-08-19T12:00:00Z",
    details: {},
    ...overrides,
  };
}

describe("recommendOpportunity", () => {
  it("treats a direct country match as eligible and explains it", () => {
    const result = recommendOpportunity(profile(), opportunity(), NOW);
    expect(result.eligibilityStatus).toBe("eligible");
    expect(result.matchScore).toBeGreaterThan(50);
    expect(result.reasons.some((r) => /Nigeria/i.test(r))).toBe(true);
  });

  it("treats pan-African focus as eligible", () => {
    const result = recommendOpportunity(
      profile({ country: "Kenya" }),
      opportunity({ countryFocus: ["Pan-African"] }),
      NOW,
    );
    expect(result.eligibilityStatus).toBe("eligible");
    expect(result.blockers).toEqual([]);
  });

  it("hard-excludes an explicit country mismatch", () => {
    const result = recommendOpportunity(
      profile({ country: "Kenya" }),
      opportunity({ countryFocus: ["Nigeria", "Ghana"] }),
      NOW,
    );
    expect(result.eligibilityStatus).toBe("ineligible");
    expect(result.matchScore).toBe(0);
    expect(result.blockers.join(" ")).toMatch(/Kenya/i);
  });

  it("does not invent a country verdict when the profile country is missing", () => {
    const result = recommendOpportunity(
      profile({ country: null }),
      opportunity({ countryFocus: ["Nigeria"] }),
      NOW,
    );
    expect(result.eligibilityStatus).toBe("insufficient_information");
    expect(result.missingInformation.join(" ")).toMatch(/country/i);
  });

  it("does not award geography points when opportunity geography is unknown", () => {
    const explicit = recommendOpportunity(profile(), opportunity(), NOW);
    const ambiguous = recommendOpportunity(profile(), opportunity({ countryFocus: [] }), NOW);
    expect(ambiguous.eligibilityStatus).toBe("possibly_eligible");
    expect(ambiguous.matchScore).toBeLessThan(explicit.matchScore);
  });

  it("scores a relevant sector/keyword opportunity above an unrelated one", () => {
    const relevant = recommendOpportunity(profile(), opportunity(), NOW);
    const unrelated = recommendOpportunity(
      profile(),
      opportunity({
        id: "o2",
        title: "Fashion Retail Competition",
        summary: "Retail showcase for fashion brands.",
        tags: ["fashion", "retail"],
        eligibility: "African consumer brands",
      }),
      NOW,
    );
    expect(relevant.matchScore).toBeGreaterThan(unrelated.matchScore);
  });

  it("always returns bounded integer scores", () => {
    const result = recommendOpportunity(profile(), opportunity(), NOW);
    expect(Number.isInteger(result.matchScore)).toBe(true);
    expect(Number.isInteger(result.confidenceScore)).toBe(true);
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(100);
  });

  it("keeps confidence separate and degrades stale/unverified records", () => {
    const recent = recommendOpportunity(profile(), opportunity(), NOW);
    const stale = recommendOpportunity(
      profile(),
      opportunity({
        lastVerifiedAt: "2026-01-01T00:00:00Z",
        url: null,
        eligibility: null,
        countryFocus: [],
      }),
      NOW,
    );
    expect(recent.matchScore).toBeGreaterThan(0);
    expect(recent.confidenceScore).toBeGreaterThan(stale.confidenceScore);
  });
});

describe("rankRecommendations", () => {
  it("excludes hard-ineligible records and ranks strong matches first", () => {
    const strong = opportunity({ id: "strong" });
    const weak = opportunity({
      id: "weak",
      title: "General SME Prize",
      summary: "A broad program for businesses.",
      tags: ["business"],
    });
    const excluded = opportunity({ id: "excluded", countryFocus: ["South Africa"] });

    const ranked = rankRecommendations(profile(), [weak, excluded, strong], NOW);
    expect(ranked.map((x) => x.opportunity.id)).toEqual(["strong", "weak"]);
    expect(ranked.every((x) => x.eligibilityStatus !== "ineligible")).toBe(true);
  });

  it("returns no recommendations without a profile", () => {
    expect(rankRecommendations(null, [opportunity()], NOW)).toEqual([]);
  });
});
