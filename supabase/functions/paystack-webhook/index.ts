// paystack-webhook — POST, NO JWT (verify_jwt=false in supabase/config.toml).
// Paystack sends no Supabase JWT; authenticity is proven by the HMAC-SHA512
// signature over the RAW body. This is the server-to-server settlement path.
//
// Security invariants (Plan 06 §5.8):
//  - HMAC verified over the exact raw body, timing-safe, BEFORE any JSON.parse.
//  - Unsigned/invalid requests never touch the DB beyond a failed-signature audit row → 401.
//  - Idempotent: UNIQUE(provider,event_type,reference) dedupes replays; the access
//    flip only ever happens via grant_annual_access() (status-transition gated).
//  - amount + currency revalidated against the server-created payments row.
//  - Returns 200 for handled/duplicate/ignored/poison events; 401 only for bad signatures.
import { createClient } from "npm:@supabase/supabase-js@2";
import { decideChargeGrant, verifyPaystackSignature } from "../_shared/paystack.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("", { status: 405 });

  // 1. Read the RAW body BEFORE any parse — HMAC is over the exact bytes.
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 2. Verify signature. Invalid/missing → audit + 401 (empty body, no payload echo).
  const valid = await verifyPaystackSignature(raw, signature, PAYSTACK_SECRET_KEY);
  if (!valid) {
    const parsed = safeParse(raw);
    try {
      await admin.from("payment_webhook_events").insert({
        provider: "paystack",
        event_type: parsed?.event ?? "unknown",
        reference: parsed?.data?.reference ?? null,
        signature_valid: false,
        payload: parsed ?? {},
        processed: false,
      });
    } catch (_) {
      /* never let an audit-write failure change the 401 */
    }
    return new Response("", { status: 401 });
  }

  const event = safeParse(raw);
  if (!event) return new Response("", { status: 400 });
  const eventType: string = event.event ?? "unknown";
  const data = event.data ?? {};
  const reference: string | null = data.reference ?? null;

  // 3. Idempotent event insert. Unique-violation → duplicate delivery → 200 ack.
  const { data: inserted, error: insErr } = await admin
    .from("payment_webhook_events")
    .insert({ provider: "paystack", event_type: eventType, reference, signature_valid: true, payload: event, processed: false })
    .select("id")
    .single();
  if (insErr || !inserted) {
    // Most likely the UNIQUE(provider,event_type,reference) dedupe key fired.
    return jsonOk("duplicate");
  }

  // 4. Only charge.success is actionable; ignore-and-200 everything else.
  if (eventType !== "charge.success") {
    await admin.from("payment_webhook_events").update({ processed: true }).eq("id", inserted.id);
    return jsonOk("ignored");
  }

  const { data: payment } = await admin
    .from("payments")
    .select("id, amount, currency, status, user_id")
    .eq("reference", reference)
    .maybeSingle();

  const decision = decideChargeGrant(eventType, data, payment);

  // 5a. Missing row or amount/currency mismatch → poison event. Log loudly, mark
  //     processed=false, return 200 (never 5xx-retry-loop). Access NOT granted.
  if (!payment || decision.action === "mismatch") {
    console.error("paystack-webhook: charge mismatch/missing payment", reference, decision.action);
    await admin.from("payment_webhook_events").update({ processed: false }).eq("id", inserted.id);
    return jsonOk("rejected");
  }

  // 5b. Persist channel + verbatim gateway response for audit.
  await admin
    .from("payments")
    .update({ channel: data.channel ?? null, gateway_response: data, paid_at: data.paid_at ?? new Date().toISOString() })
    .eq("id", payment.id);

  // 5c. Flip access ONLY via the routine (idempotent; safe if verify already ran).
  if (decision.action === "grant") {
    const { error: rpcErr } = await admin.rpc("grant_annual_access", { _payment_id: payment.id });
    if (rpcErr) {
      // Real infra error — allow Paystack to retry (500). Event row stays processed=false.
      console.error("paystack-webhook: grant_annual_access failed", reference, rpcErr.message);
      return new Response("", { status: 500 });
    }
  }

  await admin.from("payment_webhook_events").update({ processed: true }).eq("id", inserted.id);
  return jsonOk("ok");
});

function jsonOk(status: string) {
  return new Response(JSON.stringify({ status }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
