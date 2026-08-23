import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RECENT_AUTH_SECONDS = 15 * 60;

type Action = "export" | "delete";

type JsonRecord = Record<string, unknown>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jwtIssuedAt(authHeader: string): number | null {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as { iat?: unknown };
    return typeof parsed.iat === "number" ? parsed.iat : null;
  } catch {
    return null;
  }
}

async function selectRows(
  service: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string,
  select = "*",
): Promise<unknown[]> {
  const { data, error } = await service.from(table).select(select).eq(column, value);
  if (error) throw new Error(`export_${table}_failed`);
  return Array.isArray(data) ? data : [];
}

async function exportAccount(
  service: ReturnType<typeof createClient>,
  user: { id: string; email?: string; created_at?: string },
): Promise<JsonRecord> {
  const [profiles, subscriptions, payments, preferences, saved, fundingResults, memberStates, notificationPrefs, enrichmentRuns] = await Promise.all([
    selectRows(service, "profiles", "id", user.id),
    selectRows(service, "subscriptions", "user_id", user.id),
    selectRows(service, "payments", "user_id", user.id, "id,provider,reference,plan_code,amount,currency,status,channel,paid_at,created_at,updated_at"),
    selectRows(service, "user_preferences", "user_id", user.id),
    selectRows(service, "saved_opportunities", "user_id", user.id),
    selectRows(service, "funding_results", "user_id", user.id, "keywords_raw,keywords_normalized,opportunities,created_at,expires_at"),
    selectRows(service, "member_opportunity_state", "user_id", user.id),
    selectRows(service, "funding_notification_preferences", "user_id", user.id),
    selectRows(service, "business_enrichment_runs", "user_id", user.id),
  ]);

  return {
    format: "cresciva-account-export-v1",
    generated_at: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null, created_at: user.created_at ?? null },
    profiles,
    subscriptions,
    payments,
    preferences,
    saved_opportunities: saved,
    funding_results: fundingResults,
    member_opportunity_state: memberStates,
    funding_notification_preferences: notificationPrefs,
    business_enrichment_runs: enrichmentRuns,
  };
}

async function removeProfileMedia(service: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const bucket = service.storage.from("profile-media");
  const paths: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await bucket.list(userId, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("profile_media_list_failed");
    const rows = data ?? [];
    for (const row of rows) if (row.name) paths.push(`${userId}/${row.name}`);
    if (rows.length < 100) break;
    offset += rows.length;
  }
  if (!paths.length) return;
  const { error } = await bucket.remove(paths);
  if (error) throw new Error("profile_media_delete_failed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await authed.auth.getUser();
  if (userError || !user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({} as JsonRecord));
  const action = (body as { action?: unknown }).action as Action | undefined;
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (action === "export") {
      return json(await exportAccount(service, user));
    }

    if (action !== "delete") return json({ error: "invalid_action" }, 400);
    if ((body as { confirmation?: unknown }).confirmation !== "DELETE MY ACCOUNT") {
      return json({ error: "confirmation_required" }, 400);
    }

    const issuedAt = jwtIssuedAt(authHeader);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!issuedAt || nowSeconds - issuedAt > RECENT_AUTH_SECONDS) {
      return json({ error: "recent_auth_required" }, 409);
    }

    const { error: prepareError } = await service.rpc("prepare_account_deletion", { _user_id: user.id });
    if (prepareError) throw new Error("account_sanitization_failed");

    await removeProfileMedia(service, user.id);

    const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error("auth_delete_failed");

    return json({ deleted: true });
  } catch (error) {
    console.error("account-data failure", error instanceof Error ? error.message : "unknown");
    return json({ error: "unavailable" }, 500);
  }
});
