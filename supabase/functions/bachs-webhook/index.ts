// bachs-webhook — POST, NO JWT (verify_jwt=false in supabase/config.toml).
// Bachs is server-to-server. Subscription events update the local projection;
// invoice.paid is the only event that extends access.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  classifyBachsRecurringEvent,
  invoiceMatchesExpected,
  parseBachsInvoiceSnapshot,
  parseBachsSubscriptionSnapshot,
  planCodeFromBachsProductId,
  resolveBachsBaseUrl,
  verifyBachsSignature,
  type BachsWebhookEvent,
} from "../_shared/bachs.ts";
import { isPlanCode, resolvePlanAmount, type PlanCode } from "../_shared/billing.ts";
import { readBoundedText } from "../_shared/requestBody.ts";
import { sendPaymentReceipt } from "../_shared/email/receipt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BACHS_SECRET_KEY = Deno.env.get("BACHS_SECRET_KEY") ?? "";
const BACHS_WEBHOOK_SIGNING_SECRET = Deno.env.get("BACHS_WEBHOOK_SIGNING_SECRET") ?? "";
const BACHS_BASE_URL_CONFIG = Deno.env.get("BACHS_BASE_URL");
const BACHS_ORGANIZATION_ID = Deno.env.get("BACHS_ORGANIZATION_ID") ?? "";
const BACHS_MONTHLY_PRODUCT_USD = Deno.env.get("BACHS_MONTHLY_PRODUCT_USD") ?? "";
const BACHS_QUARTERLY_PRODUCT_USD = Deno.env.get("BACHS_QUARTERLY_PRODUCT_USD") ?? "";
const BACHS_ANNUAL_PRODUCT_USD = Deno.env.get("BACHS_ANNUAL_PRODUCT_USD") ?? "";
const MAX_WEBHOOK_BYTES = 256 * 1024;
type LooseSupabaseClient = SupabaseClient<any, "public", "public", any, any>;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("", { status: 405 });
  if (!BACHS_SECRET_KEY || !BACHS_WEBHOOK_SIGNING_SECRET) return new Response("", { status: 500 });
  try { resolveBachsBaseUrl(BACHS_SECRET_KEY, BACHS_BASE_URL_CONFIG); } catch { return new Response("", { status: 500 }); }

  const bounded = await readBoundedText(req, MAX_WEBHOOK_BYTES);
  if (!bounded.ok) return new Response("", { status: bounded.status });
  const rawBody = bounded.body;
  const timestamp = req.headers.get("x-bachs-timestamp");
  const signature = req.headers.get("x-bachs-signature");
  const admin = createClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (!(await verifyBachsSignature(rawBody, timestamp, signature, BACHS_WEBHOOK_SIGNING_SECRET))) {
    try {
      await admin.from("payment_webhook_events").insert({
        provider: "bachs", event_type: "invalid_signature", signature_valid: false,
        payload: { body_bytes: bounded.bytes, has_timestamp: Boolean(timestamp), has_signature: Boolean(signature) }, processed: false,
      });
    } catch { /* Rejection must not depend on audit storage. */ }
    return new Response("", { status: 401 });
  }

  const event = safeParseEvent(rawBody);
  if (!event) return new Response("", { status: 400 });
  if (BACHS_ORGANIZATION_ID && event.organization_id !== BACHS_ORGANIZATION_ID) return new Response("", { status: 401 });

  const { data: inserted, error: insertError } = await admin.from("payment_webhook_events").insert({
    provider: "bachs", event_type: event.type, reference: event.id, signature_valid: true,
    payload: safeEventSummary(event), processed: false,
  }).select("id, processed").single();
  let eventRow: { id: string; processed: boolean } | null = inserted as { id: string; processed: boolean } | null;
  if (insertError?.code === "23505") {
    const { data: existing, error: existingError } = await admin.from("payment_webhook_events")
      .select("id, processed").eq("provider", "bachs").eq("event_type", event.type).eq("reference", event.id).maybeSingle();
    if (existingError || !existing) return new Response("", { status: 500 });
    if (existing.processed) return jsonOk("duplicate");
    eventRow = existing as { id: string; processed: boolean };
  } else if (insertError || !eventRow) {
    console.error("bachs-webhook: event audit insert failed", event.id, insertError?.message);
    return new Response("", { status: 500 });
  }

  try {
    const action = classifyBachsRecurringEvent(event.type);
    if (action === "ignore") return await markProcessed(admin, eventRow.id, "ignored");
    if (action === "subscription_sync") return await handleSubscriptionEvent(admin, event, eventRow.id);
    if (action === "invoice_paid") return await handleInvoicePaid(admin, event, eventRow.id);
    return await handleInvoiceFailed(admin, event, eventRow.id);
  } catch (error) {
    console.error("bachs-webhook processing error", event.id, error instanceof Error ? error.message : error);
    return new Response("", { status: 500 });
  }
});

async function handleSubscriptionEvent(admin: LooseSupabaseClient, event: BachsWebhookEvent, eventRowId: string) {
  const snapshot = parseBachsSubscriptionSnapshot(event.data?.subscription ?? event.data);
  if (!snapshot) return new Response("", { status: 500 });
  const userId = await resolveUserId(admin, snapshot.metadata, snapshot.subscription_id);
  const planCode = resolvePlanCode(snapshot.metadata, snapshot.product_id);
  if (!userId || !planCode) return new Response("", { status: 500 });
  const { error } = await admin.rpc("sync_bachs_subscription", {
    _user_id: userId, _bachs_customer_id: snapshot.customer_id, _bachs_subscription_id: snapshot.subscription_id,
    _bachs_initial_reference: stringFrom(snapshot.metadata.cresciva_reference), _plan_code: planCode,
    _billing_status: snapshot.status, _billing_email: snapshot.customer_email,
    _current_period_start: snapshot.current_period_start, _current_period_end: snapshot.current_period_end,
    _next_payment_at: snapshot.next_billed_at, _cancel_at_period_end: snapshot.cancel_at_period_end,
    _event_at: event.created_at ?? new Date().toISOString(),
  });
  if (error) { console.error("bachs-webhook: subscription sync failed", snapshot.subscription_id, error.message); return new Response("", { status: 500 }); }
  return await markProcessed(admin, eventRowId, "subscription_synced");
}

async function handleInvoicePaid(admin: LooseSupabaseClient, event: BachsWebhookEvent, eventRowId: string) {
  const invoice = parseBachsInvoiceSnapshot(event.data?.invoice ?? event.data);
  if (!invoice?.subscription_id || !invoice.period_end) return new Response("", { status: 500 });
  const { data: subscription, error: subscriptionError } = await admin.from("subscriptions")
    .select("user_id, plan_code, bachs_initial_reference").eq("bachs_subscription_id", invoice.subscription_id).maybeSingle();
  if (subscriptionError || !subscription || !isPlanCode(subscription.plan_code)) return new Response("", { status: 500 });
  const planCode = subscription.plan_code as PlanCode;
  const expectedAmount = resolvePlanAmount(planCode, "USD");
  if (expectedAmount == null || !invoiceMatchesExpected(invoice, expectedAmount, "USD")) {
    console.error("bachs-webhook: invoice rejected", invoice.invoice_id);
    return await markProcessed(admin, eventRowId, "rejected");
  }
  const reference = stringFrom(invoice.metadata.cresciva_reference) ?? stringFrom(subscription.bachs_initial_reference) ?? `crv_${crypto.randomUUID()}`;
  const providerChargeId = stringFrom(event.data?.charge_id) ?? stringFrom((event.data?.charge as Record<string, unknown> | undefined)?.charge_id);
  const { data: paymentId, error } = await admin.rpc("record_bachs_invoice_paid", {
    _user_id: subscription.user_id, _reference: reference, _provider_invoice_id: invoice.invoice_id,
    _provider_charge_id: providerChargeId, _provider_subscription_id: invoice.subscription_id, _plan_code: planCode,
    _amount: expectedAmount, _currency: "USD", _channel: stringFrom(event.data?.payment_method) ?? stringFrom(event.data?.collection_method),
    _paid_at: event.created_at ?? new Date().toISOString(), _period_start: invoice.period_start, _period_end: invoice.period_end,
    _next_payment_at: stringFrom(event.data?.next_payment_at) ?? invoice.period_end, _gateway_response: safeInvoiceSummary(event, invoice),
  });
  if (error || !paymentId) { console.error("bachs-webhook: invoice settlement failed", invoice.invoice_id, error?.message); return new Response("", { status: 500 }); }
  await sendPaymentReceipt(admin as never, paymentId, Deno.env.toObject());
  return await markProcessed(admin, eventRowId, "invoice_paid");
}

async function handleInvoiceFailed(admin: LooseSupabaseClient, event: BachsWebhookEvent, eventRowId: string) {
  const invoice = parseBachsInvoiceSnapshot(event.data?.invoice ?? event.data);
  if (!invoice?.subscription_id) return new Response("", { status: 500 });
  const { error } = await admin.from("subscriptions").update({
    billing_status: "past_due", last_bachs_event_at: event.created_at ?? new Date().toISOString(),
  }).eq("bachs_subscription_id", invoice.subscription_id);
  if (error) return new Response("", { status: 500 });
  return await markProcessed(admin, eventRowId, "invoice_failed");
}

async function resolveUserId(admin: LooseSupabaseClient, metadata: Record<string, unknown>, subscriptionId: string) {
  const metadataUserId = stringFrom(metadata.cresciva_user_id);
  if (metadataUserId && /^[0-9a-f-]{36}$/i.test(metadataUserId)) return metadataUserId;
  const { data } = await admin.from("subscriptions").select("user_id").eq("bachs_subscription_id", subscriptionId).maybeSingle();
  return data?.user_id ?? null;
}

function resolvePlanCode(metadata: Record<string, unknown>, productId: string | null): PlanCode | null {
  const metadataPlan = stringFrom(metadata.plan_code);
  if (isPlanCode(metadataPlan)) return metadataPlan;
  return planCodeFromBachsProductId(productId, { monthly: BACHS_MONTHLY_PRODUCT_USD, quarterly: BACHS_QUARTERLY_PRODUCT_USD, annual: BACHS_ANNUAL_PRODUCT_USD });
}

function safeParseEvent(raw: string): BachsWebhookEvent | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || Array.isArray(value) || typeof value.id !== "string" || !value.id.startsWith("evt_") || typeof value.type !== "string") return null;
    const rawData = value.data;
    return { id: value.id, type: value.type, created_at: typeof value.created_at === "string" ? value.created_at : null,
      organization_id: typeof value.organization_id === "string" ? value.organization_id : null,
      data: rawData && typeof rawData === "object" && !Array.isArray(rawData) ? rawData as Record<string, unknown> : {} };
  } catch { return null; }
}

function safeEventSummary(event: BachsWebhookEvent) {
  const subscription = event.data?.subscription as Record<string, unknown> | undefined;
  const invoice = event.data?.invoice as Record<string, unknown> | undefined;
  return { event_id: event.id, type: event.type, created_at: event.created_at ?? null,
    subscription_id: stringFrom(event.data?.subscription_id) ?? stringFrom(subscription?.subscription_id),
    invoice_id: stringFrom(event.data?.invoice_id) ?? stringFrom(invoice?.invoice_id) };
}

function safeInvoiceSummary(event: BachsWebhookEvent, invoice: NonNullable<ReturnType<typeof parseBachsInvoiceSnapshot>>) {
  return { provider: "bachs", event_id: event.id, event_type: event.type, invoice_id: invoice.invoice_id,
    subscription_id: invoice.subscription_id, amount: invoice.total, currency: invoice.currency, status: invoice.status };
}

function stringFrom(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }

async function markProcessed(admin: LooseSupabaseClient, eventId: string, status: string) {
  const { error } = await admin.from("payment_webhook_events").update({ processed: true }).eq("id", eventId);
  if (error) return new Response("", { status: 500 });
  return jsonOk(status);
}

function jsonOk(status: string) {
  return new Response(JSON.stringify({ status }), { status: 200, headers: { "Content-Type": "application/json" } });
}
