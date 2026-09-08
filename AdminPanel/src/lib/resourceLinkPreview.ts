import type { ResourceLinkMetadata } from "@shared/lib/resourceLinks";
import { supabase } from "@shared/integrations/supabase/client";

type PreviewResponse = { metadata?: ResourceLinkMetadata; error?: string };

function previewError(code?: string, status?: number): Error {
  if (status === 401 || code === "unauthorized") return new Error("Your session has expired. Sign in again to fetch link details.");
  if (status === 403 || code === "forbidden") return new Error("Only staff can fetch link details.");
  if (status === 404 || code === "NOT_FOUND") return new Error("Link previews are not configured on this server. You can still save this link and edit its details manually.");
  if (code === "invalid_url" || code === "blocked_host") return new Error("Enter a public http or https link to fetch its details.");
  if (code === "source_requires_access") return new Error("This document requires sign-in or sharing permission, so its details cannot be fetched automatically. Keep your existing details or edit them manually; the resource link can still be saved.");
  if (code === "http_status") return new Error("The source did not allow a preview. Check that the document is publicly viewable, or enter its details manually.");
  if (code === "timeout") return new Error("The source took too long to respond. Try again, or enter the details manually.");
  return new Error("Couldn't read link details automatically. You can still save the link and edit its title, description, and cover manually.");
}

export async function fetchResourceLinkPreview(url: string): Promise<ResourceLinkMetadata> {
  if (import.meta.env.DEV) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw previewError("unauthorized");
    const response = await fetch("/admin/__resource-link-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ url }),
    });
    const data = await response.json().catch(() => ({})) as PreviewResponse;
    if (!response.ok || !data.metadata) throw previewError(data.error, response.status);
    return data.metadata;
  }

  const { data, error } = await supabase.functions.invoke<PreviewResponse>(
    "resource-link-preview", { body: { url } },
  );
  if (error || !data?.metadata) {
    const response = error?.context instanceof Response ? error.context : null;
    const details = response ? await response.clone().json().catch(() => ({})) as PreviewResponse : data;
    throw previewError(details?.error, response?.status);
  }
  return data.metadata;
}
