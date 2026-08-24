import { describe, expect, it } from "vitest";
import { contentPermissions } from "./contentPermissions";

describe("contentPermissions", () => {
  it("allows editors to work only on drafts", () => {
    expect(contentPermissions({ isAdmin: false, isEditor: true, status: "draft" })).toMatchObject({
      canEdit: true,
      canSaveDraft: true,
      canPublish: false,
      canDelete: false,
    });
    expect(contentPermissions({ isAdmin: false, isEditor: true, status: "published" }).canEdit).toBe(false);
  });

  it("gives administrators lifecycle controls", () => {
    expect(contentPermissions({ isAdmin: true, isEditor: false, status: "published" })).toMatchObject({
      canEdit: true,
      canUnpublish: true,
      canArchive: true,
      canDelete: true,
    });
  });

  it("denies identities without a content role", () => {
    expect(Object.values(contentPermissions({ isAdmin: false, isEditor: false, status: "draft" }))).not.toContain(true);
  });
});
