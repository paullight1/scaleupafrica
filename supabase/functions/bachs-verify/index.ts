// bachs-verify — POST, user JWT required.
//
// The callback carries Cresciva's random internal payment reference, not proof of
// payment. We load the caller-owned ledger row, recover the provider checkout_id
// persisted at initialization, retrieve Bachs server-side, and revalidate exact
// settlement before the same atomic grant routine used by the webhook.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  bachsFetch,
  crescivaReferenceFromCheckout,
  decideBachsGrant,
  isBachsTerminalSuccess,
  resolveBachsBaseUrl,
  safeBachsCheckoutSummary,
  type BachsCheckout,
} from "../_shared/bachs.ts";
import { sendPaymentReceipt } from "../_shared/email/receipt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BACHS_SECRET_KEY = Deno.env.get("BACHS_SECRET_KEY") ?? "";
const BACHS_BASE_URL_CONFIG = Deno.env.get("BACHS_BASE_URL");

export type VerifyStatus = "success" | "pending" | "failed";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!BACHS_SECRET_KEY) {
      return json({ error: "Payments are not configured yet.", code: "NOT_CONFIGURED" }, 500);
    }

    let bachsBaseUrl: string;
    try {
      bachsBaseUrl = resolveBachsBaseUrl(BACHS_SECRET_KEY, BACHS_BASE_URL_CONFIG);
    } catch (error) {
      console.error("bachs-verify configuration error", error instanceof Error ? error.message : error);
      return json({ error: "Payments are not configured correctly.", code: "NOT_CONFIGURED" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to continue.", code: "UNAUTHORIZED" }, 401);

    const body = await req.json().catch(() => ({}));
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (!/^crv_[A-Za-z0-9-]{8,120}$/.test(reference)) {
      return json({ error: "Missing or invalid payment reference.", code: "MISSING_REFERENCE" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: payment, error: paymentReadError } = await admin
      .from("payments")
      .select("id, amount, currency, status, user_id, gateway_response")
      .eq("provider", "bachs")
      .eq("reference", reference)
      .maybeSingle();
    if (paymentReadError) {
      console.error("bachs-verify: payment read failed", reference, paymentReadError.message);
      return json({ status: "pending" satisfies VerifyStatus }, 200);
    }
    if (!payment) return json({ error: "Payment not found.", code: "NOT_FOUND" }, 404);
    if (payment.user_id !== user.id) return json({ error: "Forbidden.", code: "FORBIDDEN" }, 403);
    if (payment.status === "success") {
      return json({ status: "success" satisfies VerifyStatus }, 200);
    }

    const checkoutId = objectString(payment.gateway_response, "checkout_id");
    if (!checkoutId || !/^chk_[A-Za-z0-9_-]{4,120}$/.test(checkoutId)) {
      console.error("bachs-verify: ledger missing checkout linkage", reference);
      return json({ status: "pending" satisfies VerifyStatus }, 200);
    }

    const checkoutResult = await bachsFetch<BachsCheckout>(
      `/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`,
      BACHS_SECRET_KEY,
      bachsBaseUrl,
      { method: "GET", signal: AbortSignal.timeout(20_000) },
    );
    if (!checkoutResult.ok || !checkoutResult.json?.checkout_id) {
      console.warn("bachs-verify: checkout not ready", checkoutId, checkoutResult.status);
      return json({ status: "pending" satisfies VerifyStatus }, 200);
    }

    const checkout = checkoutResult.json;
    const providerReference = crescivaReferenceFromCheckout(checkout);
    if (providerReference && providerReference !== reference) {
      console.error("bachs-verify: provider metadata reference mismatch", checkoutId);
      return json({ status: "failed" satisfies VerifyStatus, code: "MISMATCH" }, 200);
    }

    const providerStatus = mapCheckoutStatus(checkout);
    if (providerStatus === "pending") return json({ status: "pending" satisfies VerifyStatus }, 200);

    const safeSummary = safeBachsCheckoutSummary(checkout);

    if (providerStatus === "failed") {
      const internalStatus = ["expired", "cancelled", "canceled"].includes(
        String(checkout.status ?? "").toLowerCase(),
      )
        ? "abandoned"
        : "failed";
      const { error: failureWriteError } = await admin
        .from("payments")
        .update({ status: internalStatus, gateway_response: safeSummary })
        .eq("id", payment.id);
      if (failureWriteError) {
        console.error("bachs-verify: failure state write failed", reference, failureWriteError.message);
        return json({ status: "pending" satisfies VerifyStatus }, 200);
      }
      return json({ status: "failed" satisfies VerifyStatus }, 200);
    }

    const decision = decideBachsGrant(checkout, payment);
    if (decision.action === "mismatch") {
      console.error("bachs-verify: amount/currency mismatch", reference);
      return json({ status: "failed" satisfies VerifyStatus, code: "MISMATCH" }, 200);
    }
    if (decision.action === "ignore") return json({ status: "pending" satisfies VerifyStatus }, 200);

    const { error: summaryWriteError } = await admin
      .from("payments")
      .update({
        channel: checkout.payment_method ?? null,
        gateway_response: { ...safeSummary, checkout_id: checkoutId },
        paid_at: checkout.completed_at ?? new Date().toISOString(),
      })
      .eq("id", payment.id);
    if (summaryWriteError) {
      console.error("bachs-verify: settlement summary write failed", reference, summaryWriteError.message);
      return json({ status: "pending" satisfies VerifyStatus }, 200);
    }

    if (decision.action === "grant") {
      const { error: grantError } = await admin.rpc("grant_annual_access", {
        _payment_id: payment.id,
      });
      if (grantError) {
        console.error("bachs-verify: grant_annual_access failed", reference, grantError.message);
        return json({ status: "pending" satisfies VerifyStatus }, 200);
      }
      await sendPaymentReceipt(admin as never, payment.id, Deno.env.toObject());
    }

    return json({ status: "success" satisfies VerifyStatus }, 200);
  } catch (error) {
    console.error("bachs-verify error", error instanceof Error ? error.message : error);
    return json({ error: "Unexpected error. Please try again.", code: "UNEXPECTED" }, 500);
  }
});

function mapCheckoutStatus(checkout: BachsCheckout): VerifyStatus {
  const paymentStatus = String(checkout.payment_status ?? "").toLowerCase();
  const checkoutStatus = String(checkout.status ?? "").toLowerCase();
  if (paymentStatus === "succeeded" && isBachsTerminalSuccess(checkout.charge?.status)) return "success";
  if (
    paymentStatus === "failed" ||
    paymentStatus === "canceled" ||
    checkoutStatus === "expired" ||
    checkoutStatus === "cancelled" ||
    checkoutStatus === "canceled"
  ) {
    return "failed";
  }
  return "pending";
}

function objectString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
