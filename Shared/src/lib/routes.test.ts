import { describe, it, expect } from "vitest";
import {
  sanitizeNext,
  authPathWithNext,
  DEFAULT_AUTHED_ROUTE,
} from "@shared/lib/routes";

describe("sanitizeNext", () => {
  it("accepts a rooted path with query", () => {
    expect(sanitizeNext("/funding?x=1")).toBe("/funding?x=1");
  });

  it("accepts a path containing hyphens", () => {
    expect(sanitizeNext("/blog/my-post-slug")).toBe("/blog/my-post-slug");
  });

  it("rejects an absolute URL", () => {
    expect(sanitizeNext("https://evil.com")).toBe(DEFAULT_AUTHED_ROUTE);
  });

  it("rejects a protocol-relative URL", () => {
    expect(sanitizeNext("//evil.com")).toBe(DEFAULT_AUTHED_ROUTE);
  });

  it("rejects a backslash-normalised URL", () => {
    expect(sanitizeNext("/\\evil.com")).toBe(DEFAULT_AUTHED_ROUTE);
  });

  it("rejects a javascript: scheme", () => {
    expect(sanitizeNext("javascript:alert(1)")).toBe(DEFAULT_AUTHED_ROUTE);
  });

  it("rejects null / empty and returns the fallback", () => {
    expect(sanitizeNext(null)).toBe(DEFAULT_AUTHED_ROUTE);
    expect(sanitizeNext("")).toBe(DEFAULT_AUTHED_ROUTE);
  });

  it("honours a custom fallback", () => {
    expect(sanitizeNext(null, "/directory")).toBe("/directory");
  });
});

describe("authPathWithNext", () => {
  it("encodes pathname + search into the next param", () => {
    expect(
      authPathWithNext({ pathname: "/directory/create", search: "" })
    ).toBe("/auth?next=%2Fdirectory%2Fcreate");
  });

  it("preserves the search string", () => {
    expect(
      authPathWithNext({ pathname: "/funding", search: "?preview=1" })
    ).toBe("/auth?next=%2Ffunding%3Fpreview%3D1");
  });
});
