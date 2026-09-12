// paystack-init — POST, user JWT required (default verify_jwt = true).
// Creates a payments row (status='initialized') and asks Paystack to initialize a
// hosted-checkout transaction. The client NEVER supplies an amount: it sends
// { plan_code, currency } and the server resolves the amount from the canonical
// price list. Returns { authorization_url, reference }. Secret key stays server-side.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isCurrency, isPlanCode, resolvePlanAmount } from "../_shared/billing.ts";
import { paystackFetch } from "../_shared/paystack.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:8080";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!PAYSTACK_SECRET_KEY) return json({ error: "Payments are not configured yet.", code: "NOT_CONFIGURED" }, 500);

    // 1. Resolve the caller from the forwarded Authorization header (aggregate-funding pattern).
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return json({ error: "Please sign in to continue.", code: "UNAUTHORIZED" }, 401);

    // 2. Validate plan + currency against the canonical list; resolve amount server-side.
    const body = await req.json().catch(() => ({}));
    const planCode = body.plan_code;
    const currency = body.currency;
    if (!isPlanCode(planCode) || !isCurrency(currency)) {
      return json({ error: "Invalid plan or currency.", code: "INVALID_PLAN" }, 400);
    }
    const amount = resolvePlanAmount(planCode, currency);
    if (amount == null) return json({ error: "Invalid plan or currency.", code: "INVALID_PLAN" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Guard against accidental double-purchase: block if already active >30 days out.
    const { data: sub } = await admin
      .from("subscriptions")
      .select("has_access, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sub?.has_access && sub.expires_at) {
      const daysOut = (new Date(sub.expires_at).getTime() - Date.now()) / 86_400_000;
      if (daysOut > 30) {
        return json(
          { error: "You already have an active membership.", code: "ALREADY_ACTIVE", expires_at: sub.expires_at },
          409,
        );
      }
    }

    // 3. Create the payments row (our reference is the correlation key).
    const reference = `sua_${crypto.randomUUID()}`;
    const { data: payment, error: insErr } = await admin
      .from("payments")
      .insert({ user_id: user.id, provider: "paystack", reference, plan_code: planCode, amount, currency, status: "initialized" })
      .select("id")
      .single();
    if (insErr || !payment) {
      console.error("paystack-init: payments insert failed", insErr?.message);
      return json({ error: "Could not start payment. Please try again.", code: "DB_ERROR" }, 500);
    }

    // 4. Initialize the Paystack transaction.
    const initRes = await paystackFetch("/transaction/initialize", PAYSTACK_SECRET_KEY, {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount,
        currency,
        reference,
        callback_url: `${APP_URL}/payment/callback`,
        metadata: { user_id: user.id, plan_code: planCode },
        channels: ["card", "bank", "bank_transfer", "ussd", "mobile_money"],
      }),
    });

    if (!initRes.ok || !initRes.json?.status || !initRes.json?.data?.authorization_url) {
      const msg: string = initRes.json?.message ?? "";
      await admin.from("payments").update({ status: "failed", gateway_response: initRes.json ?? null }).eq("id", payment.id);
      console.error("paystack-init: initialize failed", reference, initRes.status, msg);
      if (/currency/i.test(msg)) {
        return json({ error: "Card payment in this currency isn't available yet.", code: "CURRENCY_UNAVAILABLE" }, 409);
      }
      return json({ error: "Could not start payment. Please try again.", code: "PAYSTACK_ERROR" }, 502);
    }

    // 5. Return the hosted-checkout URL + our reference. Never return/log the secret key.
    return json({ authorization_url: initRes.json.data.authorization_url, reference }, 200);
  } catch (e) {
    console.error("paystack-init error", e instanceof Error ? e.message : e);
    return json({ error: "Unexpected error. Please try again.", code: "UNEXPECTED" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
