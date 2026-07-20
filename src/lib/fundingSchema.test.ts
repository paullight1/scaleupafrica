import { describe, it, expect } from "vitest";
import { sanitizeExternalUrl, parseOpportunities, normalizeKeywords } from "@/lib/fundingSchema";

describe("sanitizeExternalUrl", () => {
  it("allows https and http", () => {
    expect(sanitizeExternalUrl("https://x.com")).toBe("https://x.com/");
    expect(sanitizeExternalUrl("http://x.com")).toBe("http://x.com/");
  });

  it("blocks javascript: (any casing)", () => {
    expect(sanitizeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeExternalUrl("JaVaScRiPt:alert(1)")).toBeNull();
  });

  it("blocks data:, vbscript:, protocol-relative, garbage, non-string", () => {
    expect(sanitizeExternalUrl("data:text/html,<script>")).toBeNull();
    expect(sanitizeExternalUrl("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeExternalUrl("//evil.com")).toBeNull();
    expect(sanitizeExternalUrl("foo")).toBeNull();
    expect(sanitizeExternalUrl(null)).toBeNull();
    expect(sanitizeExternalUrl({})).toBeNull();
  });
});

const validItem = (over: Record<string, unknown> = {}) => ({
  title: "Grant X",
  funder: "Funder Y",
  url: "https://funder.example",
  ...over,
});

describe("parseOpportunities", () => {
  it("item with javascript: url survives with url null", () => {
    const [op] = parseOpportunities({ opportunities: [validItem({ url: "javascript:alert(1)" })] });
    expect(op.title).toBe("Grant X");
    expect(op.url).toBeNull();
  });

  it("drops an item missing title while siblings survive", () => {
    const out = parseOpportunities({
      opportunities: [validItem(), { funder: "No title" }, validItem({ title: "Grant Z" })],
    });
    expect(out).toHaveLength(2);
    expect(out.map((o) => o.title)).toEqual(["Grant X", "Grant Z"]);
  });

  it("caps at 30 items", () => {
    const many = Array.from({ length: 35 }, (_, i) => validItem({ title: `Grant ${i}` }));
    expect(parseOpportunities({ opportunities: many })).toHaveLength(30);
  });

  it("accepts a bare array too", () => {
    expect(parseOpportunities([validItem()])).toHaveLength(1);
  });

  it("empty array is a valid (no-match) result", () => {
    expect(parseOpportunities([])).toEqual([]);
    expect(parseOpportunities({ opportunities: [] })).toEqual([]);
  });

  it("rejects a non-object / missing-array payload", () => {
    expect(() => parseOpportunities(42)).toThrow();
    expect(() => parseOpportunities(null)).toThrow();
    expect(() => parseOpportunities({})).toThrow();
  });
});

describe("normalizeKeywords", () => {
  it("is case-, order-, and punctuation-insensitive", () => {
    expect(normalizeKeywords("  FinTech,  Nigeria ")).toBe("fintech nigeria");
    expect(normalizeKeywords("nigeria fintech")).toBe("fintech nigeria");
    expect(normalizeKeywords("FinTech, Nigeria")).toBe(normalizeKeywords("nigeria FINTECH"));
  });

  it("caps at 200 chars", () => {
    expect(normalizeKeywords("a".repeat(300)).length).toBeLessThanOrEqual(200);
  });
});
