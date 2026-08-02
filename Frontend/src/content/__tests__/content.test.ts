import { describe, it, expect } from "vitest";
import { FAQS, HOMEPAGE_FAQS } from "@/content/faqs";
import {
  STATS,
  TESTIMONIALS,
  SAMPLE_PROFILES,
  SAMPLE_OPPORTUNITY,
  DISCLAIMER_POINTS,
  REASSURANCE_DOES,
  REASSURANCE_DOESNT,
} from "@/content/homepage";

describe("faqs", () => {
  it("keeps every answer — trimming the homepage must not delete content", () => {
    expect(FAQS).toHaveLength(9);
  });

  it("shows exactly five on the homepage", () => {
    expect(HOMEPAGE_FAQS).toHaveLength(5);
    expect(HOMEPAGE_FAQS.every((f) => f.homepage)).toBe(true);
  });

  it("has unique ids so accordion keys never collide", () => {
    expect(new Set(FAQS.map((f) => f.id)).size).toBe(FAQS.length);
  });
});

describe("homepage content", () => {
  it("ships no invented social proof", () => {
    expect(STATS).toEqual([]);
    expect(TESTIMONIALS).toEqual([]);
  });

  it("carries all five disclaimer points", () => {
    expect(DISCLAIMER_POINTS).toHaveLength(5);
    expect(DISCLAIMER_POINTS.every((p) => p.title && p.description)).toBe(true);
  });

  it("gives both reassurance columns equal weight", () => {
    expect(REASSURANCE_DOES).toHaveLength(3);
    expect(REASSURANCE_DOESNT).toHaveLength(3);
  });

  it("has sample data for the previews", () => {
    expect(SAMPLE_PROFILES.length).toBeGreaterThanOrEqual(2);
    expect(new Set(SAMPLE_PROFILES.map((p) => p.id)).size).toBe(SAMPLE_PROFILES.length);
    expect(SAMPLE_OPPORTUNITY.title).toBeTruthy();
    expect(SAMPLE_OPPORTUNITY.funder).toBeTruthy();
  });
});
