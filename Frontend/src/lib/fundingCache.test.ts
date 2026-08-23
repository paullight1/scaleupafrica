import { describe, it, expect, beforeEach } from "vitest";
import { readFundingCache, writeFundingCache, clearFundingCache, CACHE_TTL_MS, type FundingCacheEntry } from "@/lib/fundingCache";

const USER = "user-1";
const CACHE_KEY = "sua:funding:v2:user-1";

const entry: FundingCacheEntry = {
  keywordsRaw: "agritech nigeria",
  keywordsNormalized: "agritech nigeria",
  opportunities: [],
  generatedAt: new Date().toISOString(),
};

describe("fundingCache", () => {
  beforeEach(() => localStorage.clear());

  it("ignores legacy v1 funding caches so pre-provenance trust cannot survive an upgrade", () => {
    localStorage.setItem(
      "sua:funding:v1:user-1",
      JSON.stringify({
        keywordsRaw: "agritech nigeria",
        keywordsNormalized: "agritech nigeria",
        generatedAt: new Date().toISOString(),
        opportunities: [{
          title: "Legacy Grant",
          funder: "Legacy",
          url: "https://legacy.example",
          verification_status: "verified",
          application_status: "open",
        }],
      }),
    );
    expect(readFundingCache(USER)).toBeNull();
  });

  it("re-validates untrusted stored opportunities on read", () => {
    localStorage.setItem(
      CACHE_KEY,
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
    expect(got?.opportunities[0].url).toBeNull();
  });

  it("forces unknown/legacy provenance to AI-assisted unverified unknown status", () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        keywordsRaw: "agritech nigeria",
        keywordsNormalized: "agritech nigeria",
        generatedAt: new Date().toISOString(),
        opportunities: [{
          title: "Old Candidate",
          funder: "Funder",
          url: "https://example.org/program",
          verification_status: "verified",
          application_status: "open",
        }],
      }),
    );
    const [opportunity] = readFundingCache(USER)?.opportunities ?? [];
    expect(opportunity.discovery_source).toBe("ai_assisted");
    expect(opportunity.verification_status).toBe("unverified");
    expect(opportunity.application_status).toBe("unknown");
  });

  it("downgrades stale verified-feed trust and suppresses cached OPEN status", () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        keywordsRaw: "agritech nigeria",
        keywordsNormalized: "agritech nigeria",
        generatedAt: new Date().toISOString(),
        opportunities: [{
          title: "Verified Candidate",
          funder: "Funder",
          url: "https://example.org/program",
          discovery_source: "verified_feed",
          verification_status: "verified",
          source_checked_at: "2026-01-01T00:00:00Z",
          application_status: "open",
          status_checked_at: new Date().toISOString(),
          status_evidence_url: "https://example.org/program",
        }],
      }),
    );
    const [opportunity] = readFundingCache(USER)?.opportunities ?? [];
    expect(opportunity.verification_status).toBe("stale");
    expect(opportunity.application_status).toBe("unknown");
  });

  it("returns null for a missing entry", () => {
    expect(readFundingCache(USER)).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    localStorage.setItem(CACHE_KEY, "{not json");
    expect(readFundingCache(USER)).toBeNull();
  });

  it("expires entries older than the TTL and clears the key (CACHE-TTL)", () => {
    const stale = new Date(Date.now() - CACHE_TTL_MS - 60_000).toISOString();
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...entry, generatedAt: stale }),
    );
    expect(readFundingCache(USER)).toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it("returns a fresh (within-TTL) entry", () => {
    const fresh = new Date(Date.now() - 60_000).toISOString();
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...entry, generatedAt: fresh }),
    );
    expect(readFundingCache(USER)).not.toBeNull();
  });

  it("clear removes the entry", () => {
    writeFundingCache(USER, entry);
    expect(readFundingCache(USER)).not.toBeNull();
    clearFundingCache(USER);
    expect(readFundingCache(USER)).toBeNull();
  });

  it("clear with no id wipes current and legacy funding entries", () => {
    writeFundingCache("a", entry);
    writeFundingCache("b", entry);
    localStorage.setItem("sua:funding:v1:legacy", JSON.stringify(entry));
    clearFundingCache();
    expect(readFundingCache("a")).toBeNull();
    expect(readFundingCache("b")).toBeNull();
    expect(localStorage.getItem("sua:funding:v1:legacy")).toBeNull();
  });
});
