import { describe, it, expect } from "vitest";
import { countNewThisWeek, isNewThisWeek } from "../feed";
import type { FundingOpportunity } from "../types";

const NOW = new Date("2026-07-20T12:00:00Z").getTime();

function opp(created_at: string): FundingOpportunity {
  return {
    id: created_at,
    title: "t",
    funder: "f",
    type: null,
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
    created_at,
    updated_at: created_at,
  } as FundingOpportunity;
}

describe("isNewThisWeek", () => {
  it("true within 7 days", () => {
    expect(isNewThisWeek(opp("2026-07-15T12:00:00Z"), NOW)).toBe(true);
  });
  it("false at 8 days", () => {
    expect(isNewThisWeek(opp("2026-07-12T00:00:00Z"), NOW)).toBe(false);
  });
  it("false for an unparseable date", () => {
    expect(isNewThisWeek(opp("not-a-date"), NOW)).toBe(false);
  });
});

describe("countNewThisWeek", () => {
  it("counts only recent items", () => {
    const feed = [
      opp("2026-07-19T12:00:00Z"),
      opp("2026-07-18T12:00:00Z"),
      opp("2026-06-01T12:00:00Z"),
    ];
    expect(countNewThisWeek(feed, NOW)).toBe(2);
  });
});
