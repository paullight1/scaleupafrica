import { describe, expect, it } from "vitest";
import { matchesAudience, validateAudienceFilter } from "./audience";

describe("validateAudienceFilter", () => {
  it("normalizes an all-subscribers audience so stale segment values cannot leak into delivery", () => {
    expect(validateAudienceFilter({
      mode: "all",
      sources: ["landing-cta"],
      joinedAfter: "2026-08-01",
      joinedBefore: "2026-08-24",
    })).toEqual({ mode: "all", sources: [], joinedAfter: null, joinedBefore: null });
  });

  it("deduplicates sources and preserves inclusive segment dates", () => {
    expect(validateAudienceFilter({
      mode: "segment",
      sources: ["landing-cta", "footer", "landing-cta"],
      joinedAfter: "2026-08-01",
      joinedBefore: "2026-08-24",
    })).toEqual({
      mode: "segment",
      sources: ["landing-cta", "footer"],
      joinedAfter: "2026-08-01",
      joinedBefore: "2026-08-24",
    });
  });

  it("rejects an inverted date range", () => {
    expect(() => validateAudienceFilter({
      mode: "segment",
      sources: [],
      joinedAfter: "2026-08-24",
      joinedBefore: "2026-08-01",
    })).toThrow("Joined after must be on or before joined before");
  });
});

describe("matchesAudience", () => {
  const subscriber = {
    status: "subscribed",
    source: "landing-cta",
    subscribedAt: "2026-08-10T12:00:00.000Z",
  } as const;

  it("matches source values with inclusive date boundaries", () => {
    const filter = validateAudienceFilter({
      mode: "segment",
      sources: ["landing-cta", "footer"],
      joinedAfter: "2026-08-10",
      joinedBefore: "2026-08-10",
    });

    expect(matchesAudience(subscriber, filter)).toBe(true);
  });

  it("never includes an unsubscribed recipient", () => {
    expect(matchesAudience(
      { ...subscriber, status: "unsubscribed" },
      validateAudienceFilter({ mode: "all" }),
    )).toBe(false);
  });
});
