import { describe, it, expect } from "vitest";
import {
  profileSchema,
  profileFormDefaults,
  normalizeProfileInput,
} from "@/lib/validation/profile";

function fieldError(result: ReturnType<typeof profileSchema.safeParse>, path: string) {
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path.join(".") === path)?.message;
}

describe("profileSchema", () => {
  it("surfaces a named message for a missing business name (not bare 'Required')", () => {
    const r = profileSchema.safeParse({ ...profileFormDefaults, business_name: "" });
    expect(r.success).toBe(false);
    expect(fieldError(r, "business_name")).toBe("Business name is required");
  });

  it("names country and sector errors", () => {
    const r = profileSchema.safeParse({
      ...profileFormDefaults,
      business_name: "Acme",
      country: "",
      sector: "",
    });
    expect(fieldError(r, "country")).toBe("Choose a country");
    expect(fieldError(r, "sector")).toBe("Choose a sector");
  });

  it("rejects an invalid website with a helpful message", () => {
    const r = profileSchema.safeParse({
      ...profileFormDefaults,
      business_name: "Acme",
      country: "Nigeria",
      sector: "Retail & E-commerce",
      website: "javascript:alert(1)",
    });
    expect(fieldError(r, "website")).toMatch(/valid web address/i);
  });

  it("allows empty optionals", () => {
    const r = profileSchema.safeParse({
      ...profileFormDefaults,
      business_name: "Acme",
      country: "Nigeria",
      sector: "Retail & E-commerce",
    });
    expect(r.success).toBe(true);
  });

  it("caps keywords at 10", () => {
    const r = profileSchema.safeParse({
      ...profileFormDefaults,
      business_name: "Acme",
      country: "Nigeria",
      sector: "Retail & E-commerce",
      keywords: Array.from({ length: 11 }, (_, i) => `kw${i}`),
    });
    expect(fieldError(r, "keywords")).toBe("Up to 10 keywords");
  });
});

describe("normalizeProfileInput", () => {
  it("normalizes a bare website to its https form", () => {
    const out = normalizeProfileInput({ ...profileFormDefaults, website: "example.com" });
    expect(out.website).toBe("https://example.com/");
  });

  it("lowercases, trims, and dedupes keywords", () => {
    const out = normalizeProfileInput({
      ...profileFormDefaults,
      keywords: [" Shea Butter ", "shea butter", "Export"],
    });
    expect(out.keywords).toEqual(["shea butter", "export"]);
  });

  it("maps empty optional fields to null", () => {
    const out = normalizeProfileInput({ ...profileFormDefaults, business_name: "Acme" });
    expect(out.email).toBeNull();
    expect(out.website).toBeNull();
  });
});
