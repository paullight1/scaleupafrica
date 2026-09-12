import { parseResourceLinkMetadata } from "../../../Shared/src/lib/resourceLinks.ts";
import { safeExternalFetch } from "./safeExternalFetch.ts";

type FetchResult =
  | { ok: true; url: string; body: string }
  | { ok: false; error: string; status?: number | null };

export type MetadataFetcher = (url: string) => Promise<FetchResult>;

export type ResourceLinkFetchResult =
  | { ok: true; metadata: ReturnType<typeof parseResourceLinkMetadata> }
  | { ok: false; error: string; status?: number | null };

export async function fetchResourceLinkMetadata(
  url: string,
  fetcher: MetadataFetcher = safeExternalFetch,
): Promise<ResourceLinkFetchResult> {
  const fetched = await fetcher(url);
  if (fetched.ok === false) return { ok: false, error: fetched.status === 401 || fetched.status === 403 ? "source_requires_access" : fetched.error };
  return {
    ok: true,
    metadata: parseResourceLinkMetadata(fetched.body, fetched.url),
  };
}
