// Authenticated endpoint for Paystack's hosted subscription-management page.
// The page lets a subscriber update their card or cancel future renewals.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { paystackFetch } from "../_shared/paystack.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!PAYSTACK_SECRET_KEY)
    return json(
      { error: "Payments are not configured yet.", code: "NOT_CONFIGURED" },
      500,
    );

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return json(
        { error: "Please sign in to continue.", code: "UNAUTHORIZED" },
        401,
      );

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("paystack_subscription_code")
      .eq("user_id", user.id)
      .maybeSingle();
    const code = subscription?.paystack_subscription_code;
    if (!code)
      return json(
        {
          error: "Your Paystack subscription is still being set up.",
          code: "NOT_READY",
        },
        409,
      );

    const result = await paystackFetch(
      `/subscription/${encodeURIComponent(code)}/manage/link`,
      PAYSTACK_SECRET_KEY,
    );
    const link = result.json?.data?.link;
    if (!result.ok || !link) {
      console.error(
        "paystack-manage: link generation failed",
        code,
        result.status,
      );
      return json(
        {
          error: "Could not open subscription management. Please try again.",
          code: "PAYSTACK_ERROR",
        },
        502,
      );
    }
    return json({ link });
  } catch (e) {
    console.error("paystack-manage error", e instanceof Error ? e.message : e);
    return json(
      { error: "Unexpected error. Please try again.", code: "UNEXPECTED" },
      500,
    );
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
