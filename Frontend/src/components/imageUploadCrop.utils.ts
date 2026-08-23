/** Derive the storage object path from a public profile-media URL. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const parts = url.split("/profile-media/");
  return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
}
