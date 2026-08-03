import { describe, it, expect } from "vitest";
import { onboardingState } from "../onboarding";
import type { Profile } from "../types";

function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    user_id: "u1",
    business_name: "Acme",
    founder_name: null,
    country: "Nigeria",
    sector: "Technology & Software",
    short_description: null,
    long_description: null,
    website: null,
    email: null,
    phone: null,
    whatsapp: null,
    instagram: null,
    linkedin: null,
    twitter: null,
    logo_url: null,
    founder_photo_url: null,
    keywords: [],
    show_email: true,
    show_phone: true,
    show_whatsapp: true,
    status: "active",
    view_count: 0,
    slug: "acme",
    featured: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  } as unknown as Profile;
}

const complete = makeProfile({
  logo_url: "https://cdn/logo.png",
  long_description: "We build things.",
  keywords: ["solar", "irrigation", "agritech"],
});

describe("onboardingState", () => {
  it("counts only the account step for a user with no profile", () => {
    const s = onboardingState(null);
    expect(s.doneCount).toBe(1);
    expect(s.complete).toBe(false);
    expect(s.next?.key).toBe("publish");
  });

  it("advances the expanded step as each one is finished", () => {
    expect(onboardingState(makeProfile()).next?.key).toBe("logo");
    expect(onboardingState(makeProfile({ logo_url: "x" })).next?.key).toBe("story");
    expect(
      onboardingState(makeProfile({ logo_url: "x", long_description: "y" })).next?.key,
    ).toBe("keywords");
  });

  it("is reachable: a free user with a full profile completes it", () => {
    // The load-bearing property. The previous checklist included "Become a
    // member", which a free user can never tick — so it sat at 6/7 forever,
    // nagging permanently and blocking Home from ever reaching its digest shape.
    const s = onboardingState(complete);
    expect(s.complete).toBe(true);
    expect(s.doneCount).toBe(s.total);
    expect(s.next).toBeNull();
  });

  it("requires three real keywords, not one", () => {
    expect(onboardingState(makeProfile({ logo_url: "x", long_description: "y", keywords: ["solar"] })).complete).toBe(false);
    // Blank entries must not count toward the three.
    expect(
      onboardingState(
        makeProfile({ logo_url: "x", long_description: "y", keywords: ["solar", "  ", ""] }),
      ).complete,
    ).toBe(false);
  });

  it("treats a whitespace-only story as unwritten", () => {
    const s = onboardingState(
      makeProfile({ logo_url: "x", long_description: "   ", keywords: ["a", "b", "c"] }),
    );
    expect(s.next?.key).toBe("story");
  });

  it("points every actionable step at the editor section that fixes it", () => {
    for (const step of onboardingState(makeProfile()).steps) {
      if (step.href) expect(step.href).toMatch(/^\/dashboard\/profile\/edit/);
    }
  });
});
