export type ContentStatus = "draft" | "published" | "archived";

export interface ContentPermissions {
  canEdit: boolean;
  canSaveDraft: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canDuplicate: boolean;
  canDelete: boolean;
}

export function contentPermissions({
  isAdmin,
  isEditor,
  status,
}: {
  isAdmin: boolean;
  isEditor: boolean;
  status: ContentStatus;
}): ContentPermissions {
  if (isAdmin) {
    return {
      canEdit: true,
      canSaveDraft: status !== "published",
      canPublish: status !== "published",
      canUnpublish: status === "published",
      canArchive: status !== "archived",
      canRestore: status === "archived",
      canDuplicate: true,
      canDelete: true,
    };
  }

  const canWorkOnDraft = isEditor && status === "draft";
  return {
    canEdit: canWorkOnDraft,
    canSaveDraft: canWorkOnDraft,
    canPublish: false,
    canUnpublish: false,
    canArchive: false,
    canRestore: false,
    canDuplicate: false,
    canDelete: false,
  };
}
