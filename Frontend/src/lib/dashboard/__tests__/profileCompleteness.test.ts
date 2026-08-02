import { describe, it, expect } from "vitest";
import { computeCompleteness } from "../profileCompleteness";
import type { Profile } from "../types";

function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    user_id: "u1",
    business_name: "",
    country: "",
    sector: "",
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
    keywords: null,
    status: "active",
    featured: false,
    view_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  } as Profile;
}

describe("computeCompleteness", () => {
  it("null profile → 0% with all items missing", () => {
    const r = computeCompleteness(null);
    expect(r.percent).toBe(0);
    expect(r.missing).toHaveLength(10);
  });

  it("weights sum to 100 for a fully complete profile", () => {
    const full = makeProfile({
      business_name: "Acme",
      country: "Nigeria",
      sector: "AgriTech",
      short_description: "Short",
      long_description: "A long story about the business.",
      logo_url: "https://x/logo.png",
      founder_name: "Ada",
      founder_photo_url: "https://x/ada.png",
      website: "https://acme.co",
      email: "a@acme.co",
      instagram: "@acme",
      keywords: ["agri", "farm", "seed"],
    });
    const r = computeCompleteness(full);
    expect(r.percent).toBe(100);
    expect(r.missing).toHaveLength(0);
  });

  it("required basics only → 15", () => {
    const r = computeCompleteness(
      makeProfile({ business_name: "Acme", country: "Ghana", sector: "Fintech" }),
    );
    expect(r.percent).toBe(15);
  });

  it("basics incomplete (missing sector) → basics does not count", () => {
    const r = computeCompleteness(makeProfile({ business_name: "Acme", country: "Ghana" }));
    expect(r.percent).toBe(0);
  });

  it("contact any-of: whatsapp alone satisfies contact weight", () => {
    const r = computeCompleteness(makeProfile({ whatsapp: "+234..." }));
    expect(r.percent).toBe(10);
  });

  it("social any-of: linkedin alone satisfies social weight", () => {
    const r = computeCompleteness(makeProfile({ linkedin: "in/ada" }));
    expect(r.percent).toBe(5);
  });

  it("keywords need at least 3 non-empty entries", () => {
    expect(computeCompleteness(makeProfile({ keywords: ["a", "b"] })).percent).toBe(0);
    expect(computeCompleteness(makeProfile({ keywords: ["a", "b", "c"] })).percent).toBe(5);
    expect(computeCompleteness(makeProfile({ keywords: ["a", " ", "b", "c"] })).percent).toBe(5);
  });

  it("whitespace-only fields do not count", () => {
    const r = computeCompleteness(makeProfile({ short_description: "   " }));
    expect(r.percent).toBe(0);
  });

  it("missing items are sorted by weight desc and deep-link into the form", () => {
    const r = computeCompleteness(makeProfile({ business_name: "Acme", country: "GH", sector: "Ag" }));
    expect(r.missing[0].weight).toBeGreaterThanOrEqual(r.missing[1].weight);
    expect(r.missing.every((m) => m.href.startsWith("/directory/create#"))).toBe(true);
  });
});
