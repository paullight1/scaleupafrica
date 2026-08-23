// bachs-portal — POST, user JWT required.
// Returns a short-lived Bachs customer portal URL without exposing the API key.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { bachsFetch, resolveBachsBaseUrl } from "../_shared/bachs.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BACHS_SECRET_KEY = Deno.env.get("BACHS_SECRET_KEY") ?? "";
const BACHS_BASE_URL_CONFIG = Deno.env.get("BACHS_BASE_URL");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!BACHS_SECRET_KEY) return json({ error: "Payments are not configured yet.", code: "NOT_CONFIGURED" }, 500);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Please sign in to continue.", code: "UNAUTHORIZED" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: subscription, error } = await admin.from("subscriptions").select("bachs_customer_id").eq("user_id", user.id).maybeSingle();
    if (error) return json({ error: "Could not load billing details.", code: "DB_ERROR" }, 500);
    if (!subscription?.bachs_customer_id) return json({ error: "No recurring billing account exists yet.", code: "NO_BILLING_ACCOUNT" }, 404);
    const baseUrl = resolveBachsBaseUrl(BACHS_SECRET_KEY, BACHS_BASE_URL_CONFIG);
    const result = await bachsFetch<{ id?: string; url?: string }>(
      `/v1/customers/${encodeURIComponent(subscription.bachs_customer_id)}/portal-sessions`, BACHS_SECRET_KEY, baseUrl,
      { method: "POST", signal: AbortSignal.timeout(20_000) },
    );
    if (!result.ok || !result.json.url || !/^https:\/\//i.test(result.json.url)) {
      console.error("bachs-portal: provider portal session failed", result.status);
      return json({ error: "Could not open billing management. Please try again.", code: "BACHS_ERROR" }, 502);
    }
    return json({ portal_url: result.json.url });
  } catch (error) {
    console.error("bachs-portal error", error instanceof Error ? error.message : error);
    return json({ error: "Unexpected error. Please try again.", code: "UNEXPECTED" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
