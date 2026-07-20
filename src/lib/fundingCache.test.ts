import { describe, it, expect, beforeEach } from "vitest";
import { readFundingCache, writeFundingCache, clearFundingCache, type FundingCacheEntry } from "@/lib/fundingCache";

const USER = "user-1";

const entry: FundingCacheEntry = {
  keywordsRaw: "agritech nigeria",
  keywordsNormalized: "agritech nigeria",
  opportunities: [],
  generatedAt: new Date().toISOString(),
};

describe("fundingCache", () => {
  beforeEach(() => localStorage.clear());

  it("re-validates untrusted stored opportunities on read", () => {
    // Simulate a tampered/legacy payload written directly to storage.
    localStorage.setItem(
      "sua:funding:v1:user-1",
      JSON.stringify({
        keywordsRaw: "agritech nigeria",
        keywordsNormalized: "agritech nigeria",
        generatedAt: new Date().toISOString(),
        opportunities: [{ title: "Grant", funder: "F", url: "javascript:alert(1)" }],
      }),
    );
    const got = readFundingCache(USER);
    expect(got?.keywordsRaw).toBe("agritech nigeria");
    expect(got?.opportunities).toHaveLength(1);
    expect(got?.opportunities[0].url).toBeNull(); // sanitized on read
  });

  it("returns null for a missing entry", () => {
    expect(readFundingCache(USER)).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem("sua:funding:v1:user-1", "{not json");
    expect(readFundingCache(USER)).toBeNull();
  });

  it("clear removes the entry", () => {
    writeFundingCache(USER, entry);
    expect(readFundingCache(USER)).not.toBeNull();
    clearFundingCache(USER);
    expect(readFundingCache(USER)).toBeNull();
  });

  it("clear with no id wipes all funding entries", () => {
    writeFundingCache("a", entry);
    writeFundingCache("b", entry);
    clearFundingCache();
    expect(readFundingCache("a")).toBeNull();
    expect(readFundingCache("b")).toBeNull();
  });
});
