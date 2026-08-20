import { describe, it, expect } from "vitest";
import { slugify, withCollisionSuffix } from "../src/profiles/slug";
import { escapeLike } from "../src/profiles/profiles.service";
import { sanitizeExternalUrl, clamp } from "../src/funding/sanitize";
import { SubscriptionsService } from "../src/subscriptions/subscriptions.service";
import { normalizeKeywords, parseOpportunities } from "../src/contracts";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Kọlá & Sons Ltd")).toMatch(/^[a-z0-9-]+$/);
  });
  it("strips diacritics", () => {
    expect(slugify("Café Déjà")).toBe("cafe-deja");
  });
  it("reserves 'create'", () => {
    expect(slugify("create")).toBe("business");
  });
  it("falls back to 'business' for empty", () => {
    expect(slugify("!!!")).toBe("business");
  });
  it("collision suffix widens with attempts", () => {
    const id = "abcdef12-3456-7890-abcd-ef1234567890";
    expect(withCollisionSuffix("acme", id, 0)).toBe("acme-abcd");
    expect(withCollisionSuffix("acme", id, 1).length).toBeGreaterThan(
      withCollisionSuffix("acme", id, 0).length,
    );
  });
});

describe("escapeLike", () => {
  it("escapes ilike wildcards", () => {
    expect(escapeLike("50%_off\\x")).toBe("50\\%\\_off\\\\x");
  });
});

describe("sanitizeExternalUrl", () => {
  it("keeps https", () => {
    expect(sanitizeExternalUrl("https://example.com")).toBe("https://example.com/");
  });
  it("rejects javascript:", () => {
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
  });
  it("rejects data: and garbage", () => {
    expect(sanitizeExternalUrl("data:text/html,x")).toBeNull();
    expect(sanitizeExternalUrl("not a url")).toBeNull();
  });
  it("clamp caps length", () => {
    expect(clamp("abcdef", 3)).toBe("abc");
    expect(clamp(123, 3)).toBe("");
  });
});

describe("SubscriptionsService.isActive", () => {
  const svc = new SubscriptionsService({} as never);
  const now = new Date("2026-07-20T00:00:00Z");
  it("false when no row", () => expect(svc.isActive(null, now)).toBe(false));
  it("false when has_access false", () =>
    expect(svc.isActive({ hasAccess: false, expiresAt: null }, now)).toBe(false));
  it("true when access + null expiry", () =>
    expect(svc.isActive({ hasAccess: true, expiresAt: null }, now)).toBe(true));
  it("true when access + future expiry", () =>
    expect(svc.isActive({ hasAccess: true, expiresAt: "2026-08-20T00:00:00Z" }, now)).toBe(true));
  it("false when access + past expiry", () =>
    expect(svc.isActive({ hasAccess: true, expiresAt: "2026-06-20T00:00:00Z" }, now)).toBe(false));
});

describe("shared funding helpers", () => {
  it("normalizeKeywords is order/case-insensitive", () => {
    expect(normalizeKeywords("FinTech, Nigeria")).toBe(normalizeKeywords("nigeria fintech"));
  });
  it("parseOpportunities drops invalid items and sanitizes urls", () => {
    const out = parseOpportunities({
      opportunities: [
        { title: "Grant A", funder: "Funder", url: "https://ok.example" },
        { title: "", funder: "bad" },
        { title: "Grant B", funder: "F2", url: "javascript:alert(1)" },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0].url).toBe("https://ok.example/");
    expect(out[1].url).toBeNull();
  });
  it("throws on a payload with no shape", () => {
    expect(() => parseOpportunities(42 as unknown)).toThrow();
  });
});
