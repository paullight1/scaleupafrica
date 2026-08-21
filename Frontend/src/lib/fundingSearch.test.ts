import { describe, expect, it } from "vitest";
import {
  dedupeFundingSearchResults,
  fundingSearchReasons,
  rankFundingSearch,
  scoreFundingSearch,
} from "../../../supabase/functions/_shared/fundingSearch";

const base = {
  title: "General Growth Program",
  funder: "Example Fund",
  type: "Grant",
  summary: "Support for African companies.",
  eligibility: "African SMEs",
  tags: [] as string[],
  countryFocus: [] as string[],
  url: "https://example.org/general",
};

describe("scoreFundingSearch", () => {
  it("strongly rewards exact tags and geography", () => {
    const strong = {
      ...base,
      title: "Climate Agritech Challenge",
      tags: ["agritech", "climate"],
      countryFocus: ["Nigeria"],
    };
    const weak = { ...base, title: "Business Competition" };
    expect(scoreFundingSearch("Nigeria climate agritech", strong)).toBeGreaterThan(
      scoreFundingSearch("Nigeria climate agritech", weak),
    );
  });

  it("returns zero when there is no meaningful query overlap", () => {
    expect(
      scoreFundingSearch("healthcare kenya", {
        ...base,
        title: "Fashion Retail Prize",
        tags: ["fashion", "retail"],
        countryFocus: ["Ghana"],
        summary: "Consumer clothing brands.",
      }),
    ).toBe(0);
  });

  it("returns explainable field-level match reasons", () => {
    const reasons = fundingSearchReasons("Nigeria climate", {
      ...base,
      title: "Climate Fund",
      countryFocus: ["Nigeria"],
      tags: ["climate"],
    });
    expect(reasons.join(" ")).toMatch(/climate/i);
    expect(reasons.join(" ")).toMatch(/Nigeria/i);
  });
});

describe("rankFundingSearch", () => {
  it("excludes zero-overlap records and ranks strongest first", () => {
    const strong = {
      ...base,
      title: "Nigeria Climate Agritech Fund",
      tags: ["climate", "agritech"],
      countryFocus: ["Nigeria"],
      url: "https://example.org/strong",
    };
    const medium = {
      ...base,
      title: "Nigeria SME Fund",
      countryFocus: ["Nigeria"],
      url: "https://example.org/medium",
    };
    const irrelevant = {
      ...base,
      title: "Fashion Award",
      tags: ["fashion"],
      countryFocus: ["Ghana"],
      url: "https://example.org/irrelevant",
    };
    expect(rankFundingSearch("Nigeria climate agritech", [medium, irrelevant, strong])).toEqual([
      strong,
      medium,
    ]);
  });
});

describe("dedupeFundingSearchResults", () => {
  it("keeps the verified record when AI returns the same URL", () => {
    const verified = [{ ...base, title: "Verified title", url: "https://example.org/program?utm_source=x" }];
    const ai = [{ ...base, title: "AI title", url: "https://example.org/program" }];
    const out = dedupeFundingSearchResults(verified, ai);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Verified title");
  });

  it("falls back to title+funder identity when URLs are missing", () => {
    const verified = [{ ...base, title: "Climate Fund", funder: "ABC", url: null }];
    const ai = [{ ...base, title: " climate  fund ", funder: "abc", url: null }];
    expect(dedupeFundingSearchResults(verified, ai)).toHaveLength(1);
  });
});
