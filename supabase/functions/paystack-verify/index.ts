// paystack-verify — POST, user JWT required. The callback-page path: webhooks can
// lag or be missed, so the browser confirms the transaction directly. Idempotent
// and race-safe with the webhook (both flip access only via grant_annual_access).
//
// Users can only verify their OWN transaction (reference ownership enforced → 403).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { chargeMatchesPayment, decideChargeGrant, mapPaystackStatus, paystackFetch } from "../_shared/paystack.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!PAYSTACK_SECRET_KEY) return json({ error: "Payments are not configured yet.", code: "NOT_CONFIGURED" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to continue.", code: "UNAUTHORIZED" }, 401);

    const body = await req.json().catch(() => ({}));
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (!reference) return json({ error: "Missing reference.", code: "MISSING_REFERENCE" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: payment } = await admin
      .from("payments")
      .select("id, amount, currency, status, user_id")
      .eq("reference", reference)
      .maybeSingle();
    if (!payment) return json({ error: "Payment not found.", code: "NOT_FOUND" }, 404);

    // Ownership: users can only verify their own transactions.
    if (payment.user_id !== user.id) return json({ error: "Forbidden.", code: "FORBIDDEN" }, 403);

    const verifyRes = await paystackFetch<any>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
      PAYSTACK_SECRET_KEY,
    );
    if (!verifyRes.ok || !verifyRes.json?.status) {
      // Paystack unreachable / not-yet-settled — treat as pending so the UI polls.
      return json({ status: "pending" }, 200);
    }

    const data = verifyRes.json.data ?? {};
    const status = mapPaystackStatus(data.status);

    if (status === "success") {
      // Amount + currency MUST match the server-created row.
      if (!chargeMatchesPayment(data, payment)) {
        console.error("paystack-verify: amount/currency mismatch", reference);
        return json({ status: "failed", code: "MISMATCH" }, 200);
      }
      await admin
        .from("payments")
        .update({ channel: data.channel ?? null, gateway_response: data, paid_at: data.paid_at ?? new Date().toISOString() })
        .eq("id", payment.id);

      const decision = decideChargeGrant("charge.success", data, payment);
      if (decision.action === "grant") {
        const { error: rpcErr } = await admin.rpc("grant_annual_access", { _payment_id: payment.id });
        if (rpcErr) console.error("paystack-verify: grant_annual_access failed", reference, rpcErr.message);
      }
    }

    return json({ status }, 200);
  } catch (e) {
    console.error("paystack-verify error", e instanceof Error ? e.message : e);
    return json({ error: "Unexpected error. Please try again.", code: "UNEXPECTED" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
