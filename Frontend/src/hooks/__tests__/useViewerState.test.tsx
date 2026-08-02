import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useViewerState, VIEWER_CTA } from "@/hooks/useViewerState";

const auth = vi.hoisted(() => ({ user: null as unknown, loading: false }));
const sub = vi.hoisted(() => ({ status: "inactive" as string, active: false }));
const profile = vi.hoisted(() => ({ data: null as unknown, isPending: false }));

vi.mock("@shared/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/lib/subscription", () => ({ useSubscription: () => sub }));
vi.mock("@/hooks/queries/dashboard", () => ({ useMyProfile: () => profile }));

const signedIn = { id: "u1", email: "f@example.com" };

describe("useViewerState", () => {
  beforeEach(() => {
    auth.user = null;
    auth.loading = false;
    sub.status = "inactive";
    sub.active = false;
    profile.data = null;
    profile.isPending = false;
  });

  it("is anonymous when signed out", () => {
    expect(renderHook(() => useViewerState()).result.current).toBe("anonymous");
  });

  it("is anonymous while auth is still loading", () => {
    auth.loading = true;
    auth.user = signedIn;
    expect(renderHook(() => useViewerState()).result.current).toBe("anonymous");
  });

  it("is no-profile for a signed-in user without a listing", () => {
    auth.user = signedIn;
    expect(renderHook(() => useViewerState()).result.current).toBe("no-profile");
  });

  it("is no-membership once they have a listing but no subscription", () => {
    auth.user = signedIn;
    profile.data = { id: "p1" };
    expect(renderHook(() => useViewerState()).result.current).toBe("no-membership");
  });

  it("is member on an active subscription", () => {
    auth.user = signedIn;
    sub.status = "active";
    sub.active = true;
    expect(renderHook(() => useViewerState()).result.current).toBe("member");
  });

  it("is member on an active subscription even without a listing", () => {
    auth.user = signedIn;
    sub.status = "active";
    sub.active = true;
    profile.data = null;
    expect(renderHook(() => useViewerState()).result.current).toBe("member");
  });

  // TRUST-CRITICAL: a failed subscription read must never look like "no membership".
  it("falls back to anonymous when the subscription read errors", () => {
    auth.user = signedIn;
    profile.data = { id: "p1" };
    sub.status = "error";
    expect(renderHook(() => useViewerState()).result.current).toBe("anonymous");
  });

  it("falls back to anonymous while the subscription is still loading", () => {
    auth.user = signedIn;
    sub.status = "loading";
    expect(renderHook(() => useViewerState()).result.current).toBe("anonymous");
  });

  it("gives every state a distinct primary call to action", () => {
    const labels = Object.values(VIEWER_CTA).map((cta) => cta.primary.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
