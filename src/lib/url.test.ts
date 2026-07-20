import { describe, it, expect } from "vitest";
import { sanitizeUrl, socialUrl, waLink } from "@/lib/url";

describe("sanitizeUrl", () => {
  it("adds https:// to a bare domain", () => {
    expect(sanitizeUrl("example.com")).toBe("https://example.com/");
  });

  it("passes through http and https URLs", () => {
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
    expect(sanitizeUrl("https://example.com/path?x=1")).toBe("https://example.com/path?x=1");
  });

  it("rejects javascript:", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects data: and ftp:", () => {
    expect(sanitizeUrl("data:text/html,<script>")).toBeNull();
    expect(sanitizeUrl("ftp://files.example.com")).toBeNull();
  });

  it("returns null for empty / nullish", () => {
    expect(sanitizeUrl("")).toBeNull();
    expect(sanitizeUrl("   ")).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl(undefined)).toBeNull();
  });
});

describe("socialUrl", () => {
  it("maps an instagram handle to a profile URL, stripping @", () => {
    expect(socialUrl("instagram", "@founder")).toBe("https://instagram.com/founder");
  });

  it("maps a twitter handle to x.com", () => {
    expect(socialUrl("twitter", "founder")).toBe("https://x.com/founder");
  });

  it("passes through an existing URL", () => {
    expect(socialUrl("instagram", "https://instagram.com/founder")).toBe(
      "https://instagram.com/founder",
    );
  });

  it("returns null for empty", () => {
    expect(socialUrl("twitter", "")).toBeNull();
    expect(socialUrl("twitter", "@")).toBeNull();
  });
});

describe("waLink", () => {
  it("strips non-digits", () => {
    expect(waLink("+234 (0) 801-234-5678")).toBe("https://wa.me/23408012345678");
  });

  it("appends prefilled text when given", () => {
    expect(waLink("2348012345678", "hi there")).toBe(
      "https://wa.me/2348012345678?text=hi%20there",
    );
  });

  it("returns null when no digits", () => {
    expect(waLink("abc")).toBeNull();
    expect(waLink(null)).toBeNull();
  });
});
