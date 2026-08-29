import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

import { fetchResourceLinkMetadata } from "../_shared/resourceLinkMetadata.ts";
import { handleResourceLinkPreview } from "../_shared/resourceLinkPreviewHandler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const response = await handleResourceLinkPreview(request, {
      authenticate: async () => {
        const { data: { user } } = await authed.auth.getUser();
        return user?.id ?? null;
      },
      isStaff: async (userId) => {
        const { data, error } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "editor"])
          .limit(1);
        if (error) throw error;
        return (data?.length ?? 0) > 0;
      },
      fetchMetadata: fetchResourceLinkMetadata,
    });
    return withCors(response);
  } catch (error) {
    console.error(
      "resource-link-preview failed",
      error instanceof Error ? error.message : error,
    );
    return withCors(Response.json({ error: "unavailable" }, { status: 500 }));
  }
});

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
