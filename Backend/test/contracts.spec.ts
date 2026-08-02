import { describe, it, expect } from "vitest";
import {
  ProfileUpsertSchema,
  ProfileListQuerySchema,
  FundingSearchSchema,
} from "../src/contracts";

describe("ProfileUpsertSchema", () => {
  const base = { business_name: "Acme", country: "Nigeria", sector: "Fintech" };

  it("accepts a minimal valid payload", () => {
    const parsed = ProfileUpsertSchema.parse(base);
    expect(parsed.business_name).toBe("Acme");
    expect(parsed.show_email).toBe(true);
  });

  it("is strict — rejects forbidden fields (user_id/status/featured/slug)", () => {
    expect(() => ProfileUpsertSchema.parse({ ...base, user_id: "x" })).toThrow();
    expect(() => ProfileUpsertSchema.parse({ ...base, status: "flagged" })).toThrow();
    expect(() => ProfileUpsertSchema.parse({ ...base, featured: true })).toThrow();
    expect(() => ProfileUpsertSchema.parse({ ...base, slug: "hacked" })).toThrow();
  });

  it("sanitizes website + prepends https", () => {
    const parsed = ProfileUpsertSchema.parse({ ...base, website: "example.com" });
    expect(parsed.website).toBe("https://example.com/");
  });

  it("rejects a javascript: website", () => {
    expect(() => ProfileUpsertSchema.parse({ ...base, website: "javascript:alert(1)" })).toThrow();
  });

  it("dedupes + lowercases keywords", () => {
    const parsed = ProfileUpsertSchema.parse({ ...base, keywords: ["Agri", "agri", "Tech"] });
    expect(parsed.keywords).toEqual(["agri", "tech"]);
  });

  it("requires a business name", () => {
    expect(() => ProfileUpsertSchema.parse({ country: "Nigeria", sector: "Fintech" })).toThrow();
  });
});

describe("ProfileListQuerySchema", () => {
  it("applies defaults and coerces page numbers", () => {
    const q = ProfileListQuerySchema.parse({ page: "2", pageSize: "10" });
    expect(q.page).toBe(2);
    expect(q.pageSize).toBe(10);
    expect(q.sort).toBe("featured");
  });
  it("caps pageSize at 60", () => {
    expect(() => ProfileListQuerySchema.parse({ pageSize: "500" })).toThrow();
  });
});

describe("FundingSearchSchema", () => {
  it("defaults keywords to empty and clamps to 200 chars", () => {
    expect(FundingSearchSchema.parse({}).keywords).toBe("");
    expect(() => FundingSearchSchema.parse({ keywords: "x".repeat(201) })).toThrow();
  });
  it("is strict", () => {
    expect(() => FundingSearchSchema.parse({ keywords: "ok", extra: 1 })).toThrow();
  });
});
