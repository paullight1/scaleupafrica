import type { ResourceLinkMetadata } from "@shared/lib/resourceLinks";
import { supabase } from "@shared/integrations/supabase/client";

export async function fetchResourceLinkPreview(url: string): Promise<ResourceLinkMetadata> {
  const { data, error } = await supabase.functions.invoke<{
    metadata?: ResourceLinkMetadata;
  }>("resource-link-preview", { body: { url } });

  if (error || !data?.metadata) {
    throw new Error("Couldn't read link details. Check the URL and try again.");
  }
  return data.metadata;
}
