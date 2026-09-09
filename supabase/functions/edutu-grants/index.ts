import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { edgeLog } from "../_shared/log.ts";
import { proxyEdutuGrantRequest } from "../_shared/edutuGrantProxy.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EDUTU_ENGINE_URL = Deno.env.get("EDUTU_ENGINE_URL")?.trim() ?? "";
const EDUTU_ENGINE_API_KEY = Deno.env.get("EDUTU_ENGINE_API_KEY")?.trim() ?? "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    if (request.method !== "POST") return withCors(error("METHOD_NOT_ALLOWED", "Use POST", 405));

    const authHeader = request.headers.get("Authorization") ?? "";
    const scoped = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await scoped.auth.getUser();
    if (authError || !user) return withCors(error("UNAUTHORIZED", "Sign in required", 401));

    const { data: allowed, error: roleError } = await service.rpc("is_admin", { _user_id: user.id });
    if (roleError) {
      edgeLog({ level: "error", event: "edutu_grants_role_check_failed", request_id: requestId, code: "ROLE_CHECK_FAILED" });
      return withCors(error("ROLE_CHECK_FAILED", "Grant engine access is unavailable", 503));
    }
    if (!allowed) return withCors(error("FORBIDDEN", "Administrator access required", 403));

    const input = await request.json().catch(() => null);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return withCors(error("INVALID_REQUEST", "A JSON request body is required", 400));
    }

    const response = await proxyEdutuGrantRequest(input, {
      baseUrl: EDUTU_ENGINE_URL,
      apiKey: EDUTU_ENGINE_API_KEY,
    });
    edgeLog({
      level: response.ok ? "info" : "warn",
      event: "edutu_grants_request",
      request_id: requestId,
      duration_ms: Date.now() - startedAt,
      status: response.status,
      metadata: { action: typeof input.action === "string" ? input.action : "invalid" },
    });
    return withCors(response);
  } catch (cause) {
    edgeLog({
      level: "error",
      event: "edutu_grants_unhandled_error",
      request_id: requestId,
      duration_ms: Date.now() - startedAt,
      status: 500,
      code: cause instanceof Error ? cause.name : "UNKNOWN",
    });
    return withCors(error("UNAVAILABLE", "Grant engine access is unavailable", 500));
  }
});

function error(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
