import { describe, it, expect } from "vitest";
import { isSubscriptionActive } from "@/lib/subscription";

const NOW = new Date("2026-07-20T12:00:00Z");

describe("isSubscriptionActive", () => {
  it("null row → false", () => {
    expect(isSubscriptionActive(null, NOW)).toBe(false);
  });

  it("has_access=false → false", () => {
    expect(isSubscriptionActive({ has_access: false, expires_at: null }, NOW)).toBe(false);
  });

  it("has_access=true, expires_at=null → true (lifetime/manual)", () => {
    expect(isSubscriptionActive({ has_access: true, expires_at: null }, NOW)).toBe(true);
  });

  it("future expires_at → true", () => {
    expect(isSubscriptionActive({ has_access: true, expires_at: "2026-08-01T00:00:00Z" }, NOW)).toBe(true);
  });

  it("past expires_at → false", () => {
    expect(isSubscriptionActive({ has_access: true, expires_at: "2026-07-01T00:00:00Z" }, NOW)).toBe(false);
  });

  it("boundary expires_at === now → false (strictly future required)", () => {
    expect(isSubscriptionActive({ has_access: true, expires_at: NOW.toISOString() }, NOW)).toBe(false);
  });
});
