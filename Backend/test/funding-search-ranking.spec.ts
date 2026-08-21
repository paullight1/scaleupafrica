import { describe, expect, it } from "vitest";
import {
  dedupeFundingSearchResults,
  rankFundingSearch,
  scoreFundingSearch,
} from "../src/funding/search-ranking";

const base = {
  title: "General SME Fund",
  funder: "Example Fund",
  type: "Grant",
  summary: "Support for African businesses.",
  eligibility: "African SMEs",
  tags: [] as string[],
  countryFocus: [] as string[],
  url: "https://example.org/general",
};

describe("funding search ranking", () => {
  it("prioritizes tag/country/title relevance", () => {
    const strong = {
      ...base,
      title: "Nigeria Climate Agritech Fund",
      tags: ["climate", "agritech"],
      countryFocus: ["Nigeria"],
      url: "https://example.org/strong",
    };
    const weak = { ...base, url: "https://example.org/weak" };
    expect(scoreFundingSearch("Nigeria climate agritech", strong)).toBeGreaterThan(
      scoreFundingSearch("Nigeria climate agritech", weak),
    );
    expect(rankFundingSearch("Nigeria climate agritech", [weak, strong])[0]).toBe(strong);
  });

  it("drops zero-overlap results", () => {
    expect(
      rankFundingSearch("health kenya", [
        { ...base, title: "Fashion Retail Prize", tags: ["fashion"], countryFocus: ["Ghana"] },
      ]),
    ).toEqual([]);
  });

  it("lets verified records win a URL collision", () => {
    const verified = [{ ...base, title: "Verified", url: "https://example.org/p?utm_source=x" }];
    const ai = [{ ...base, title: "AI", url: "https://example.org/p" }];
    expect(dedupeFundingSearchResults(verified, ai)).toEqual(verified);
  });
});
