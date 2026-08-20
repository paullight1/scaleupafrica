// bachs-webhook — POST, NO JWT (verify_jwt=false in supabase/config.toml).
//
// Bachs is server-to-server. Authenticity is proven by HMAC-SHA256 over
// `${X-Bachs-Timestamp}.${raw_body}` with a 300-second freshness tolerance.
// Fulfillment authority is collection.succeeded, never the browser redirect and
// never checkout.completed.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  bachsFetch,
  classifyWebhookInsertError,
  decideBachsGrant,
  resolveBachsBaseUrl,
  safeBachsCheckoutSummary,
  verifyBachsSignature,
  type BachsCheckout,
  type BachsWebhookEvent,
} from "../_shared/bachs.ts";
import { readBoundedText } from "../_shared/requestBody.ts";
import { sendPaymentReceipt } from "../_shared/email/receipt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BACHS_SECRET_KEY = Deno.env.get("BACHS_SECRET_KEY") ?? "";
const BACHS_WEBHOOK_SIGNING_SECRET = Deno.env.get("BACHS_WEBHOOK_SIGNING_SECRET") ?? "";
const BACHS_BASE_URL_CONFIG = Deno.env.get("BACHS_BASE_URL");
const BACHS_ORGANIZATION_ID = Deno.env.get("BACHS_ORGANIZATION_ID") ?? "";
const MAX_WEBHOOK_BYTES = 256 * 1024;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("", { status: 405 });
  if (!BACHS_SECRET_KEY || !BACHS_WEBHOOK_SIGNING_SECRET) {
    console.error("bachs-webhook: payment secrets are not configured");
    return new Response("", { status: 500 });
  }

  let bachsBaseUrl: string;
  try {
    bachsBaseUrl = resolveBachsBaseUrl(BACHS_SECRET_KEY, BACHS_BASE_URL_CONFIG);
  } catch (error) {
    console.error("bachs-webhook configuration error", error instanceof Error ? error.message : error);
    return new Response("", { status: 500 });
  }

  const bounded = await readBoundedText(req, MAX_WEBHOOK_BYTES);
  if (!bounded.ok) return new Response("", { status: bounded.status });

  const rawBody = bounded.body;
  const timestamp = req.headers.get("x-bachs-timestamp");
  const signature = req.headers.get("x-bachs-signature");
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const signatureValid = await verifyBachsSignature(
    rawBody,
    timestamp,
    signature,
    BACHS_WEBHOOK_SIGNING_SECRET,
  );

  if (!signatureValid) {
    // Never persist attacker-controlled JSON after signature failure. Only a
    // bounded traffic summary is useful for incident/abuse analysis.
    try {
      await admin.from("payment_webhook_events").insert({
        provider: "bachs",
        event_type: "invalid_signature",
        reference: null,
        signature_valid: false,
        payload: {
          body_bytes: bounded.bytes,
          content_type: req.headers.get("content-type") ?? null,
          has_timestamp: Boolean(timestamp),
          has_signature: Boolean(signature),
        },
        processed: false,
      });
    } catch {
      // Invalid requests are rejected regardless of audit availability.
    }
    return new Response("", { status: 401 });
  }

  const event = safeParseEvent(rawBody);
  if (!event) return new Response("", { status: 400 });

  if (BACHS_ORGANIZATION_ID && event.organization_id !== BACHS_ORGANIZATION_ID) {
    console.error("bachs-webhook: organization mismatch", event.id, event.organization_id);
    return new Response("", { status: 401 });
  }

  // Use the Bachs event ID in the existing event-log reference slot. The table's
  // UNIQUE(provider,event_type,reference) therefore becomes event-ID idempotency
  // for Bachs without requiring a risky schema migration during this phase.
  const auditPayload = safeEventSummary(event);
  const { data: inserted, error: insertError } = await admin
    .from("payment_webhook_events")
    .insert({
      provider: "bachs",
      event_type: event.type,
      reference: event.id,
      signature_valid: true,
      payload: auditPayload,
      processed: false,
    })
    .select("id, processed")
    .single();

  let eventRow: { id: string; processed: boolean } | null = inserted as
    | { id: string; processed: boolean }
    | null;
  const insertOutcome = classifyWebhookInsertError(insertError);

  if (insertOutcome === "duplicate") {
    const { data: existing, error: existingError } = await admin
      .from("payment_webhook_events")
      .select("id, processed")
      .eq("provider", "bachs")
      .eq("event_type", event.type)
      .eq("reference", event.id)
      .maybeSingle();

    if (existingError || !existing) {
      console.error("bachs-webhook: duplicate lookup failed", event.id, existingError?.message);
      return new Response("", { status: 500 });
    }
    if (existing.processed) return jsonOk("duplicate");

    // Previous delivery inserted the event but did not finish processing. Resume
    // instead of falsely acknowledging it as handled.
    eventRow = existing as { id: string; processed: boolean };
  } else if (insertOutcome === "retry" || !eventRow) {
    console.error(
      "bachs-webhook: event audit insert failed",
      event.id,
      insertError?.code,
      insertError?.message,
    );
    return new Response("", { status: 500 });
  }

  try {
    if (event.type === "checkout.completed") {
      // Bachs explicitly says checkout.completed can fire whether or not payment
      // was collected. Audit it, but NEVER grant access from this event.
      return await markProcessed(admin, eventRow.id, "ignored");
    }

    const actionable = new Set([
      "collection.succeeded",
      "collection.failed",
      "collection.underpaid",
      "checkout.expired",
    ]);
    if (!actionable.has(event.type)) {
      return await markProcessed(admin, eventRow.id, "ignored");
    }

    const checkoutId = getString(event.data, "checkout_id");
    if (!checkoutId) {
      console.error("bachs-webhook: actionable event missing checkout_id", event.id, event.type);
      return new Response("", { status: 500 });
    }

    const checkoutResult = await bachsFetch<BachsCheckout>(
      `/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`,
      BACHS_SECRET_KEY,
      bachsBaseUrl,
      { method: "GET", signal: AbortSignal.timeout(20_000) },
    );
    if (!checkoutResult.ok || !checkoutResult.json?.checkout_id) {
      console.error("bachs-webhook: checkout retrieval failed", event.id, checkoutId, checkoutResult.status);
      return new Response("", { status: 500 });
    }

    const checkout = checkoutResult.json;
    const reference = checkout.reference?.trim() ?? "";
    if (!reference) {
      console.error("bachs-webhook: checkout has no Cresciva reference", event.id, checkoutId);
      return new Response("", { status: 500 });
    }

    const { data: payment, error: paymentReadError } = await admin
      .from("payments")
      .select("id, amount, currency, status, user_id")
      .eq("provider", "bachs")
      .eq("reference", reference)
      .maybeSingle();
    if (paymentReadError || !payment) {
      console.error("bachs-webhook: payment ledger lookup failed", event.id, reference, paymentReadError?.message);
      return new Response("", { status: 500 });
    }

    const safeSummary = safeBachsCheckoutSummary(checkout);

    if (event.type === "collection.failed" || event.type === "collection.underpaid") {
      const { error: updateError } = await admin
        .from("payments")
        .update({ status: "failed", gateway_response: safeSummary })
        .eq("id", payment.id);
      if (updateError) {
        console.error("bachs-webhook: failed-payment persistence error", reference, updateError.message);
        return new Response("", { status: 500 });
      }
      return await markProcessed(admin, eventRow.id, event.type === "collection.underpaid" ? "underpaid" : "failed");
    }

    if (event.type === "checkout.expired") {
      // Do not overwrite a payment already settled by a racing collection event.
      if (payment.status !== "success") {
        const { error: updateError } = await admin
          .from("payments")
          .update({ status: "abandoned", gateway_response: safeSummary })
          .eq("id", payment.id);
        if (updateError) {
          console.error("bachs-webhook: expiry persistence error", reference, updateError.message);
          return new Response("", { status: 500 });
        }
      }
      return await markProcessed(admin, eventRow.id, "expired");
    }

    // collection.succeeded — authoritative fulfillment event, but still re-fetch
    // and revalidate the checkout server-side before granting access.
    const decision = decideBachsGrant(checkout, payment);
    if (decision.action === "ignore" || decision.action === "mismatch") {
      console.error("bachs-webhook: successful collection rejected", reference, decision.action);
      return await markProcessed(admin, eventRow.id, "rejected");
    }

    const { error: summaryWriteError } = await admin
      .from("payments")
      .update({
        channel: checkout.payment_method ?? null,
        gateway_response: safeSummary,
        paid_at: checkout.completed_at ?? new Date().toISOString(),
      })
      .eq("id", payment.id);
    if (summaryWriteError) {
      console.error("bachs-webhook: settlement summary persistence error", reference, summaryWriteError.message);
      return new Response("", { status: 500 });
    }

    if (decision.action === "grant") {
      const { error: grantError } = await admin.rpc("grant_annual_access", {
        _payment_id: payment.id,
      });
      if (grantError) {
        console.error("bachs-webhook: grant_annual_access failed", reference, grantError.message);
        return new Response("", { status: 500 });
      }

      // Courtesy only. This helper never throws and shares an idempotency key
      // with the callback verification path.
      await sendPaymentReceipt(admin as never, payment.id, Deno.env.toObject());
    }

    return await markProcessed(admin, eventRow.id, "ok");
  } catch (error) {
    console.error("bachs-webhook processing error", event.id, error instanceof Error ? error.message : error);
    return new Response("", { status: 500 });
  }
});

async function markProcessed(
  admin: ReturnType<typeof createClient>,
  eventId: string,
  status: string,
): Promise<Response> {
  const { error } = await admin
    .from("payment_webhook_events")
    .update({ processed: true })
    .eq("id", eventId);
  if (error) {
    console.error("bachs-webhook: event processed marker failed", eventId, error.message);
    return new Response("", { status: 500 });
  }
  return jsonOk(status);
}

function safeParseEvent(raw: string): BachsWebhookEvent | null {
  try {
    const value = JSON.parse(raw) as Partial<BachsWebhookEvent>;
    if (!value || typeof value !== "object") return null;
    if (typeof value.id !== "string" || !value.id.startsWith("evt_")) return null;
    if (typeof value.type !== "string" || !value.type) return null;
    return {
      id: value.id,
      type: value.type,
      created_at: typeof value.created_at === "string" ? value.created_at : null,
      organization_id: typeof value.organization_id === "string" ? value.organization_id : null,
      data: value.data && typeof value.data === "object" ? value.data : {},
    };
  } catch {
    return null;
  }
}

function safeEventSummary(event: BachsWebhookEvent): Record<string, unknown> {
  return {
    event_id: event.id,
    type: event.type,
    created_at: event.created_at ?? null,
    organization_id: event.organization_id ?? null,
    checkout_id: getString(event.data, "checkout_id"),
    charge_id: getString(event.data, "charge_id"),
    status: getString(event.data, "status"),
    amount: getString(event.data, "amount"),
    currency: getString(event.data, "currency"),
  };
}

function getString(
  data: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = data?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function jsonOk(status: string) {
  return new Response(JSON.stringify({ status }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
