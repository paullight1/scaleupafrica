// bachs-init — POST, user JWT required (verify_jwt=true in supabase/config.toml).
//
// Bachs' current checkout contract is product-based. Cresciva owns the expected
// annual price in its ledger and selects a preconfigured one-time Bachs product
// per settlement currency. The Bachs product must be configured to the same price;
// settlement still cannot grant access unless provider amount/currency match the
// server-created Cresciva payment row exactly.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isCurrency, isPlanCode, resolvePlanAmount } from "../_shared/billing.ts";
import {
  bachsFetch,
  resolveBachsBaseUrl,
  resolveBachsProductId,
} from "../_shared/bachs.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BACHS_SECRET_KEY = Deno.env.get("BACHS_SECRET_KEY") ?? "";
const BACHS_BASE_URL_CONFIG = Deno.env.get("BACHS_BASE_URL");
const BACHS_ANNUAL_PRODUCT_NGN = Deno.env.get("BACHS_ANNUAL_PRODUCT_NGN") ?? "";
const BACHS_ANNUAL_PRODUCT_USD = Deno.env.get("BACHS_ANNUAL_PRODUCT_USD") ?? "";
const APP_URL_CONFIG = Deno.env.get("APP_URL") ?? "";

interface BachsCheckoutCreateResponse {
  checkout_id?: string;
  checkout_url?: string;
  status?: string;
  expires_at?: string;
  created_at?: string;
  detail?: string;
  error_code?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!BACHS_SECRET_KEY) {
      return json({ error: "Payments are not configured yet.", code: "NOT_CONFIGURED" }, 500);
    }

    let bachsBaseUrl: string;
    let appUrl: string;
    try {
      bachsBaseUrl = resolveBachsBaseUrl(BACHS_SECRET_KEY, BACHS_BASE_URL_CONFIG);
      appUrl = resolveAppUrl(APP_URL_CONFIG);
    } catch (error) {
      console.error("bachs-init configuration error", error instanceof Error ? error.message : error);
      return json({ error: "Payments are not configured correctly.", code: "NOT_CONFIGURED" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return json({ error: "Please sign in to continue.", code: "UNAUTHORIZED" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const planCode = body.plan_code;
    const currency = body.currency;
    if (!isPlanCode(planCode) || !isCurrency(currency)) {
      return json({ error: "Invalid plan or currency.", code: "INVALID_PLAN" }, 400);
    }

    const amount = resolvePlanAmount(planCode, currency);
    const productId = resolveBachsProductId(currency, {
      NGN: BACHS_ANNUAL_PRODUCT_NGN,
      USD: BACHS_ANNUAL_PRODUCT_USD,
    });
    if (amount == null || !productId) {
      console.error("bachs-init: missing/invalid product configuration", currency);
      return json({ error: "Payments are not configured for this currency.", code: "NOT_CONFIGURED" }, 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: subscription, error: subErr } = await admin
      .from("subscriptions")
      .select("has_access, expires_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subErr) {
      console.error("bachs-init: subscription read failed", subErr.message);
      return json({ error: "Could not confirm membership status. Please retry.", code: "DB_ERROR" }, 500);
    }
    if (subscription?.has_access && subscription.expires_at) {
      const daysRemaining = (new Date(subscription.expires_at).getTime() - Date.now()) / 86_400_000;
      if (daysRemaining > 30) {
        return json(
          {
            error: "You already have an active membership.",
            code: "ALREADY_ACTIVE",
            expires_at: subscription.expires_at,
          },
          409,
        );
      }
    }

    const reference = `crv_${crypto.randomUUID()}`;
    const { data: payment, error: insertError } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        provider: "bachs",
        reference,
        plan_code: planCode,
        amount,
        currency,
        status: "initialized",
      })
      .select("id")
      .single();

    if (insertError || !payment) {
      console.error("bachs-init: payment ledger insert failed", insertError?.code, insertError?.message);
      return json({ error: "Could not start payment. Please try again.", code: "DB_ERROR" }, 500);
    }

    // Current Bachs checkout sessions are product-based. The internal reference is
    // in both the return URL and metadata, so callback verification does not depend
    // on Bachs injecting a query parameter into our URL.
    const providerPayload = {
      product_cart: [{ product_id: productId, quantity: 1 }],
      billing_currency: currency,
      return_url: `${appUrl}/payment/callback?reference=${encodeURIComponent(reference)}`,
      cancel_url: `${appUrl}/dashboard/account#billing`,
      customer: { email: user.email },
      metadata: {
        cresciva_reference: reference,
        internal_payment_id: payment.id,
        plan_code: planCode,
      },
    };

    const idempotencyKey = `checkout_${reference}`;
    const providerResult = await createCheckoutWithRetry(
      providerPayload,
      idempotencyKey,
      BACHS_SECRET_KEY,
      bachsBaseUrl,
    );

    const checkout = providerResult.json;
    if (!providerResult.ok || !checkout.checkout_id || !checkout.checkout_url) {
      const { error: failUpdateError } = await admin
        .from("payments")
        .update({
          status: "failed",
          gateway_response: {
            provider: "bachs",
            status: providerResult.status,
            error_code: checkout.error_code ?? null,
            product_id: productId,
          },
        })
        .eq("id", payment.id);
      if (failUpdateError) {
        console.error("bachs-init: failed to persist provider failure", failUpdateError.message);
      }
      console.error(
        "bachs-init: checkout creation failed",
        reference,
        providerResult.status,
        checkout.error_code ?? "unknown",
      );
      return json(
        {
          error: "Could not start payment. Please try again.",
          code: providerResult.status === 429 ? "RATE_LIMITED" : "BACHS_ERROR",
        },
        providerResult.status === 429 ? 429 : 502,
      );
    }

    const { error: summaryError } = await admin
      .from("payments")
      .update({
        gateway_response: {
          provider: "bachs",
          checkout_id: checkout.checkout_id,
          status: checkout.status ?? "open",
          expires_at: checkout.expires_at ?? null,
          product_id: productId,
        },
      })
      .eq("id", payment.id);

    if (summaryError) {
      console.error("bachs-init: checkout summary write failed", reference, summaryError.message);
      return json({ error: "Could not finalize checkout. Please try again.", code: "DB_ERROR" }, 500);
    }

    return json(
      {
        checkout_url: checkout.checkout_url,
        checkout_id: checkout.checkout_id,
        reference,
      },
      200,
    );
  } catch (error) {
    console.error("bachs-init error", error instanceof Error ? error.message : error);
    return json({ error: "Unexpected error. Please try again.", code: "UNEXPECTED" }, 500);
  }
});

async function createCheckoutWithRetry(
  payload: Record<string, unknown>,
  idempotencyKey: string,
  secretKey: string,
  baseUrl: string,
): Promise<{ ok: boolean; status: number; json: BachsCheckoutCreateResponse }> {
  let last: { ok: boolean; status: number; json: BachsCheckoutCreateResponse } = {
    ok: false,
    status: 502,
    json: { error_code: "NETWORK_ERROR" },
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      last = await bachsFetch<BachsCheckoutCreateResponse>(
        "/v1/checkout-sessions",
        secretKey,
        baseUrl,
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20_000),
        },
      );
      if (last.status < 500) return last;
    } catch (error) {
      console.warn(
        "bachs-init: transient checkout request failure",
        attempt + 1,
        error instanceof Error ? error.message : String(error),
      );
    }
    if (attempt < 2) await sleep(250 * 2 ** attempt);
  }
  return last;
}

function resolveAppUrl(value: string): string {
  const raw = value.trim().replace(/\/+$/, "");
  if (!raw) throw new Error("APP_URL is required");
  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("APP_URL must be HTTPS outside local development");
  }
  return url.origin;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
