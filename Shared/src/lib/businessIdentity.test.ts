import { describe, expect, it } from "vitest";
import {
  scoreBusinessIdentity,
  selectBusinessIdentity,
  type BusinessIdentityInput,
  type ScoredBusinessIdentityCandidate,
} from "./businessIdentity";

const input: BusinessIdentityInput = {
  businessName: "Top100 Africa Future Leaders",
  countryHint: "Nigeria",
};

function candidate(
  over: Partial<ScoredBusinessIdentityCandidate> = {},
): ScoredBusinessIdentityCandidate {
  return {
    id: "c1",
    canonicalName: "Top100 Africa Future Leaders",
    website: "https://top100afl.com",
    country: "Nigeria",
    sourceUrls: ["https://top100afl.com/about"],
    ...over,
  };
}

describe("scoreBusinessIdentity", () => {
  it("rewards exact name and website-domain evidence", () => {
    const score = scoreBusinessIdentity(
      { ...input, website: "https://top100afl.com" },
      candidate(),
    );
    expect(score).toBeGreaterThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("penalizes a conflicting country hint", () => {
    const matching = scoreBusinessIdentity(input, candidate());
    const conflicting = scoreBusinessIdentity(input, candidate({ country: "Kenya" }));
    expect(conflicting).toBeLessThan(matching);
    expect(matching - conflicting).toBeGreaterThanOrEqual(30);
  });

  it("caps candidates without source evidence below the auto-propose threshold", () => {
    expect(scoreBusinessIdentity(input, candidate({ sourceUrls: [] }))).toBeLessThan(60);
  });
});

describe("selectBusinessIdentity", () => {
  it("does not auto-select two similarly strong candidates", () => {
    const result = selectBusinessIdentity(input, [
      candidate({ id: "a" }),
      candidate({ id: "b", website: "https://top100africa.example" }),
    ]);
    expect(result.state).toBe("ambiguous");
    expect(result.candidate).toBeUndefined();
  });

  it("returns not_found when all candidates are below 60", () => {
    const result = selectBusinessIdentity(input, [
      candidate({ canonicalName: "Different Company", country: "Kenya", sourceUrls: [] }),
    ]);
    expect(result.state).toBe("not_found");
  });

  it("auto-proposes only one candidate at >=85 with a >=15 point lead", () => {
    const result = selectBusinessIdentity(
      { ...input, website: "https://top100afl.com" },
      [
        candidate({ id: "winner" }),
        candidate({
          id: "runner-up",
          canonicalName: "Top 100 African Future Leader Network",
          website: "https://different.example",
          country: "Ghana",
        }),
      ],
    );
    expect(result.state).toBe("resolved");
    expect(result.candidate?.id).toBe("winner");
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.margin).toBeGreaterThanOrEqual(15);
  });
});
