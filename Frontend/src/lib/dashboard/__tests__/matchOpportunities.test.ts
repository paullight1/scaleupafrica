import { describe, expect, it } from "vitest";
import {
  matchOpportunities,
  recommendFundingOpportunity,
  recommendFundingOpportunities,
  scoreOpportunity,
} from "../matchOpportunities";
import type { FundingOpportunity, Profile } from "../types";

const NOW = new Date("2026-08-21T12:00:00Z");

function profile(over: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    user_id: "u1",
    business_name: "Acme",
    country: "Nigeria",
    sector: "AgriTech & Food",
    short_description: "AI for smallholder farmers",
    long_description: "Food security and climate resilience for African agriculture",
    logo_url: null,
    founder_name: null,
    founder_photo_url: null,
    website: null,
    email: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    linkedin: null,
    twitter: null,
    keywords: ["agriculture", "climate", "export"],
    status: "active",
    featured: false,
    view_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  } as Profile;
}

function opp(over: Partial<FundingOpportunity> = {}): FundingOpportunity {
  return {
    id: "o1",
    title: "Climate agriculture grant",
    funder: "Fund",
    type: "grant",
    summary: "Funding for agritech and food-security companies",
    amount: null,
    opens: null,
    deadline: null,
    eligibility: "African agritech businesses",
    url: "https://example.org/program",
    tags: ["agriculture", "climate"],
    country_focus: ["Nigeria"],
    status: "published",
    featured: false,
    details: {},
    source: "manual",
    batch_id: null,
    last_verified_at: "2026-08-20T00:00:00Z",
    verified_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  } as FundingOpportunity;
}

describe("dashboard recommendation adapter", () => {
  it("returns a bounded 0-100 score for a direct country match", () => {
    const score = scoreOpportunity(profile(), opp());
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("exposes deterministic match reasons and confidence", () => {
    const result = recommendFundingOpportunity(profile(), opp(), NOW);
    expect(result.eligibilityStatus).toBe("eligible");
    expect(result.reasons.join(" ")).toMatch(/Nigeria/i);
    expect(result.reasons.join(" ")).toMatch(/AgriTech/i);
    expect(result.confidenceScore).toBeGreaterThan(70);
  });

  it("hard-excludes explicit country mismatch", () => {
    const p = profile({ country: "Kenya" });
    const o = opp({ country_focus: ["Nigeria", "Ghana"] });
    const result = recommendFundingOpportunity(p, o, NOW);
    expect(result.eligibilityStatus).toBe("ineligible");
    expect(result.matchScore).toBe(0);
    expect(matchOpportunities(p, [o])).toEqual([]);
  });

  it("accepts pan-African geography", () => {
    const result = recommendFundingOpportunity(
      profile({ country: "Kenya" }),
      opp({ country_focus: ["Africa"] }),
      NOW,
    );
    expect(result.eligibilityStatus).toBe("eligible");
    expect(result.matchScore).toBeGreaterThan(0);
  });
});

describe("recommendFundingOpportunities", () => {
  it("null profile returns an empty recommendation set", () => {
    expect(recommendFundingOpportunities(null, [opp()], NOW)).toEqual([]);
  });

  it("ranks a strong sector/keyword match above a generic eligible program", () => {
    const strong = opp({ id: "strong" });
    const generic = opp({
      id: "generic",
      title: "General SME award",
      summary: "A broad opportunity for established businesses",
      tags: ["business"],
      eligibility: "African SMEs",
    });
    const ranked = recommendFundingOpportunities(profile(), [generic, strong], NOW);
    expect(ranked.map((x) => x.opportunity.id)).toEqual(["strong", "generic"]);
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
  });

  it("preserves the legacy plain-row adapter order", () => {
    const strong = opp({ id: "strong" });
    const generic = opp({
      id: "generic",
      title: "General SME award",
      summary: "A broad opportunity",
      tags: [],
    });
    expect(matchOpportunities(profile(), [generic, strong]).map((o) => o.id)).toEqual([
      "strong",
      "generic",
    ]);
  });
});
