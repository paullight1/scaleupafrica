import { describe, it, expect } from "vitest";
import { publicProfilePath, publicProfileUrl } from "../profileUrl";

describe("publicProfilePath", () => {
  it("prefers slug when present", () => {
    expect(publicProfilePath({ slug: "acme-co", id: "uuid-1" })).toBe("/directory/acme-co");
  });

  it("falls back to id when slug is null", () => {
    expect(publicProfilePath({ slug: null, id: "uuid-1" })).toBe("/directory/uuid-1");
  });

  it("falls back to id when slug is empty/whitespace", () => {
    expect(publicProfilePath({ slug: "   ", id: "uuid-1" })).toBe("/directory/uuid-1");
  });

  it("falls back to id when slug is undefined", () => {
    expect(publicProfilePath({ id: "uuid-1" })).toBe("/directory/uuid-1");
  });
});

describe("publicProfileUrl", () => {
  it("prefixes the origin", () => {
    expect(publicProfileUrl({ slug: "acme", id: "x" }, "https://scaleup.africa")).toBe(
      "https://scaleup.africa/directory/acme",
    );
  });
});
