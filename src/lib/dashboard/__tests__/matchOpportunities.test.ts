import { describe, it, expect } from "vitest";
import { matchOpportunities, scoreOpportunity } from "../matchOpportunities";
import type { FundingOpportunity, Profile } from "../types";

function profile(over: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    user_id: "u1",
    business_name: "Acme",
    country: "Nigeria",
    sector: "AgriTech & Food",
    short_description: null,
    long_description: null,
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
    keywords: ["agriculture", "seed", "export"],
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
    title: "Grant",
    funder: "Fund",
    type: "grant",
    summary: null,
    amount: null,
    opens: null,
    deadline: null,
    eligibility: null,
    url: null,
    tags: [],
    country_focus: [],
    status: "published",
    featured: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  } as FundingOpportunity;
}

describe("scoreOpportunity", () => {
  it("+3 for a direct country match", () => {
    expect(scoreOpportunity(profile(), opp({ country_focus: ["Nigeria"] }))).toBeGreaterThanOrEqual(3);
  });

  it("+3 when country_focus is empty (open to all)", () => {
    expect(scoreOpportunity(profile(), opp({ country_focus: [] }))).toBeGreaterThanOrEqual(3);
  });

  it("+3 for pan-African focus regardless of country", () => {
    const s = scoreOpportunity(profile({ country: "Kenya" }), opp({ country_focus: ["Africa"] }));
    expect(s).toBeGreaterThanOrEqual(3);
  });

  it("no country points when focus excludes the country", () => {
    // country mismatch, no tag/sector match, not featured → 0
    expect(scoreOpportunity(profile({ keywords: [], sector: "Retail" }), opp({ country_focus: ["Ghana"], tags: ["fintech"] }))).toBe(0);
  });

  it("keyword∩tags overlap caps at +6", () => {
    const p = profile({ country: "Kenya", keywords: ["a", "b", "c", "d"], sector: "Zzz" });
    const o = opp({ country_focus: ["Ghana"], tags: ["a", "b", "c", "d"] });
    // 4 overlaps ×2 = 8, capped 6; no country, no sector, no featured
    expect(scoreOpportunity(p, o)).toBe(6);
  });

  it("+2 for sector word overlap with tags/title/summary", () => {
    const p = profile({ country: "Kenya", keywords: [], sector: "Fintech" });
    const o = opp({ country_focus: ["Ghana"], tags: [], title: "Fintech accelerator" });
    expect(scoreOpportunity(p, o)).toBe(2);
  });

  it("+1 for featured", () => {
    const p = profile({ country: "Kenya", keywords: [], sector: "Zzz" });
    const o = opp({ country_focus: ["Ghana"], featured: true });
    expect(scoreOpportunity(p, o)).toBe(1);
  });
});

describe("matchOpportunities", () => {
  it("excludes zero-score opportunities", () => {
    const p = profile({ country: "Kenya", keywords: [], sector: "Zzz" });
    const o = opp({ country_focus: ["Ghana"], tags: ["fintech"] });
    expect(matchOpportunities(p, [o])).toHaveLength(0);
  });

  it("null profile → empty", () => {
    expect(matchOpportunities(null, [opp()])).toEqual([]);
  });

  it("sorts by score desc, tiebreak created_at desc", () => {
    const p = profile();
    const high = opp({ id: "high", country_focus: ["Nigeria"], tags: ["agriculture", "seed"] });
    const lowA = opp({ id: "lowA", country_focus: ["Nigeria"], created_at: "2026-02-01T00:00:00Z" });
    const lowB = opp({ id: "lowB", country_focus: ["Nigeria"], created_at: "2026-03-01T00:00:00Z" });
    const out = matchOpportunities(p, [lowA, high, lowB]);
    expect(out[0].id).toBe("high");
    // lowB is newer than lowA → comes first on tie
    expect(out.map((o) => o.id).slice(1)).toEqual(["lowB", "lowA"]);
  });
});
