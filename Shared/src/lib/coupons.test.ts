import { describe, expect, it } from "vitest";
import { couponStatus, normalizeCouponCode, couponCardSvg } from "./coupons";

describe("coupon presentation", () => {
  it("accepts copied lower-case codes and trims whitespace", () => {
    expect(normalizeCouponCode("  cres-abcd-1234  ")).toBe("CRES-ABCD-1234");
  });
  it("shows revoked, expired, and used codes as unavailable", () => {
    const coupon = { active: true, expires_at: "2026-11-05T12:00:00Z", max_redemptions: 1, redemption_count: 0 };
    const now = new Date("2026-11-04T12:00:00Z");
    expect(couponStatus(coupon, now)).toBe("Available");
    expect(couponStatus({ ...coupon, active: false }, now)).toBe("Revoked");
    expect(couponStatus(coupon, new Date(coupon.expires_at))).toBe("Expired");
    expect(couponStatus({ ...coupon, redemption_count: 1 }, now)).toBe("Used up");
    expect(couponStatus({ ...coupon, max_redemptions: null, redemption_count: 10000 }, now)).toBe("Available");
  });
  it("exports a branded card with escaped content and an unambiguous deadline", () => {
    const svg = couponCardSvg({ code: "CRES-ABCD-1234", expires_at: "2026-11-05T12:00:00Z", max_redemptions: null }, "https://cresciva.com/dashboard/account/membership?a=1&b=2");
    expect(svg).toContain("Cresciva");
    expect(svg).toContain("7 days");
    expect(svg).toContain("CRES-ABCD-1234");
    expect(svg).toContain("5 Nov 2026");
    expect(svg).toContain("12:00 UTC");
    expect(svg).toContain("&amp;b=2");
    expect(svg).toContain("Once per account");
  });
});
