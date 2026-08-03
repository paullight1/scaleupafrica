import { describe, it, expect } from "vitest";
import { adminUrl, isAdminPath, siteUrl, ADMIN_BASE } from "./crossApp";

// No VITE_SITE_URL / VITE_ADMIN_URL under test — the same-origin production
// shape, where both helpers must return rooted paths.
describe("siteUrl", () => {
  it("roots a bare path", () => {
    expect(siteUrl("auth")).toBe("/auth");
  });

  it("passes a rooted path through", () => {
    expect(siteUrl("/auth?next=%2Fadmin%2F")).toBe("/auth?next=%2Fadmin%2F");
  });

  it("defaults to the site root", () => {
    expect(siteUrl()).toBe("/");
  });
});

describe("adminUrl", () => {
  // The panel is built with base "/admin/"; a bare "/admin" 404s on both the
  // Vite dev server and a static host, so the root must keep its slash.
  it("defaults to the panel root, with its trailing slash", () => {
    expect(adminUrl()).toBe(`${ADMIN_BASE}/`);
    expect(adminUrl(ADMIN_BASE)).toBe(`${ADMIN_BASE}/`);
    expect(adminUrl("/admin/")).toBe(`${ADMIN_BASE}/`);
  });

  it("keeps a path that already carries the /admin prefix", () => {
    expect(adminUrl("/admin/users")).toBe("/admin/users");
  });

  it("prefixes a panel-relative path", () => {
    expect(adminUrl("users")).toBe("/admin/users");
    expect(adminUrl("/settings")).toBe("/admin/settings");
  });

  it("does not mistake a same-prefix sibling for the panel", () => {
    expect(adminUrl("/administration")).toBe("/admin/administration");
  });
});

describe("isAdminPath", () => {
  it("matches the panel root and its children", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/")).toBe(true);
    expect(isAdminPath("/admin/users")).toBe(true);
  });

  it("rejects public-app paths, including same-prefix siblings", () => {
    expect(isAdminPath("/dashboard")).toBe(false);
    expect(isAdminPath("/administration")).toBe(false);
    expect(isAdminPath("/")).toBe(false);
  });
});
