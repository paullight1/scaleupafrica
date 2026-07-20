import { describe, it, expect } from "vitest";
import { nextBestActions } from "../nextBestAction";
import { computeCompleteness } from "../profileCompleteness";
import type { Profile } from "../types";

function profile(over: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    user_id: "u1",
    business_name: "Acme",
    country: "Nigeria",
    sector: "AgriTech",
    short_description: "s",
    long_description: "long story here",
    logo_url: "https://x/l.png",
    founder_name: "Ada",
    founder_photo_url: "https://x/a.png",
    website: "https://a.co",
    email: "a@a.co",
    phone: null,
    whatsapp: null,
    instagram: "@a",
    linkedin: null,
    twitter: null,
    keywords: ["a", "b", "c"],
    status: "active",
    featured: false,
    view_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  } as Profile;
}

const COMPLETE = computeCompleteness(profile());

describe("nextBestActions priority", () => {
  it("no profile → create profile is first", () => {
    const out = nextBestActions({
      profile: null,
      completeness: computeCompleteness(null),
      subscriptionActive: false,
      savedCount: 0,
      feedNewCount: 0,
    });
    expect(out[0].key).toBe("create-profile");
  });

  it("low completeness → complete-* is first", () => {
    const p = profile({ logo_url: null, long_description: null, website: null });
    const out = nextBestActions({
      profile: p,
      completeness: computeCompleteness(p),
      subscriptionActive: true,
      savedCount: 1,
      feedNewCount: 0,
    });
    expect(out[0].key).toMatch(/^complete-/);
  });

  it("hidden profile (but complete) → unhide is first", () => {
    const p = profile({ status: "hidden" });
    const out = nextBestActions({
      profile: p,
      completeness: computeCompleteness(p),
      subscriptionActive: true,
      savedCount: 1,
      feedNewCount: 0,
    });
    expect(out[0].key).toBe("unhide-profile");
  });

  it("free member (complete, visible) → unlock-radar first", () => {
    const out = nextBestActions({
      profile: profile(),
      completeness: COMPLETE,
      subscriptionActive: false,
      savedCount: 1,
      feedNewCount: 0,
    });
    expect(out[0].key).toBe("unlock-radar");
  });

  it("active member with new items → review-new first", () => {
    const out = nextBestActions({
      profile: profile(),
      completeness: COMPLETE,
      subscriptionActive: true,
      savedCount: 1,
      feedNewCount: 3,
    });
    expect(out[0].key).toBe("review-new");
    expect(out[0].title).toContain("3 new opportunities");
  });

  it("active member, no new, no saves → save-first first", () => {
    const out = nextBestActions({
      profile: profile(),
      completeness: COMPLETE,
      subscriptionActive: true,
      savedCount: 0,
      feedNewCount: 0,
    });
    expect(out[0].key).toBe("save-first");
  });

  it("fully satisfied → share fallback is the only action", () => {
    const out = nextBestActions({
      profile: profile(),
      completeness: COMPLETE,
      subscriptionActive: true,
      savedCount: 2,
      feedNewCount: 0,
    });
    expect(out[0].key).toBe("share-profile");
    expect(out).toHaveLength(1);
  });

  it("singular wording for a single new opportunity", () => {
    const out = nextBestActions({
      profile: profile(),
      completeness: COMPLETE,
      subscriptionActive: true,
      savedCount: 1,
      feedNewCount: 1,
    });
    expect(out[0].title).toContain("1 new opportunity ");
  });
});
