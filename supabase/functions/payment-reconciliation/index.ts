// payment-reconciliation — POST, admin JWT required.
// Read-only operational view over payment, subscription, webhook, and receipt state.
// It never mutates entitlements; remediation must re-run verified provider settlement.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  reconcileActiveSubscription,
  reconcilePayment,
  type ReconciliationSubscription,
} from "../_shared/paymentReconciliation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_PAYMENTS = 50;
const MAX_EVENTS = 250;

type ActiveSubscriptionRow = {
  user_id: unknown;
  has_access: unknown;
  expires_at: unknown;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: role, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) {
      console.error("payment-reconciliation: role lookup failed", roleError.message);
      return json({ error: "unavailable" }, 500);
    }
    if (!role) return json({ error: "forbidden" }, 403);

    const [paymentsResult, webhookResult, activeSubsResult] = await Promise.all([
      admin
        .from("payments")
        .select("id,user_id,provider,reference,status,amount,currency,paid_at,created_at,gateway_response")
        .order("created_at", { ascending: false })
        .limit(MAX_PAYMENTS),
      admin
        .from("payment_webhook_events")
        .select("provider,event_type,processed,payload,created_at")
        .eq("signature_valid", true)
        .order("created_at", { ascending: false })
        .limit(MAX_EVENTS),
      admin
        .from("subscriptions")
        .select("user_id,has_access,expires_at")
        .eq("has_access", true)
        .gt("expires_at", new Date().toISOString())
        .limit(250),
    ]);

    if (paymentsResult.error || webhookResult.error || activeSubsResult.error) {
      console.error(
        "payment-reconciliation: base query failed",
        paymentsResult.error?.message,
        webhookResult.error?.message,
        activeSubsResult.error?.message,
      );
      return json({ error: "unavailable" }, 500);
    }

    const payments = paymentsResult.data ?? [];
    const userIds = [...new Set(payments.map((p) => String(p.user_id)))];
    const subscriptionsByUser = new Map<string, ReconciliationSubscription>();

    if (userIds.length > 0) {
      const { data: subs, error } = await admin
        .from("subscriptions")
        .select("user_id,has_access,expires_at")
        .in("user_id", userIds);
      if (error) {
        console.error("payment-reconciliation: subscription query failed", error.message);
        return json({ error: "unavailable" }, 500);
      }
      for (const sub of subs ?? []) {
        subscriptionsByUser.set(String(sub.user_id), {
          user_id: String(sub.user_id),
          has_access: Boolean(sub.has_access),
          expires_at: typeof sub.expires_at === "string" ? sub.expires_at : null,
        });
      }
    }

    const processedCheckoutIds = new Set<string>();
    for (const event of webhookResult.data ?? []) {
      if (event.provider !== "bachs" || !event.processed) continue;
      const checkoutId = objectString(event.payload, "checkout_id");
      if (checkoutId) processedCheckoutIds.add(checkoutId);
    }

    const emailCache = new Map<string, string | null>();
    const rows = [] as Array<Record<string, unknown>>;

    for (const payment of payments) {
      const userId = String(payment.user_id);
      const checkoutId = objectString(payment.gateway_response, "checkout_id");
      const receiptStatus = await getReceiptStatus(
        admin,
        userId,
        payment.paid_at ?? payment.created_at,
        emailCache,
      );
      const result = reconcilePayment({
        payment: {
          id: String(payment.id),
          user_id: userId,
          provider: String(payment.provider),
          reference: String(payment.reference),
          status: String(payment.status),
          amount: payment.amount,
          currency: String(payment.currency),
          paid_at: payment.paid_at,
          created_at: payment.created_at,
        },
        subscription: subscriptionsByUser.get(userId) ?? null,
        processedSettlementEvent:
          payment.provider !== "bachs" || Boolean(checkoutId && processedCheckoutIds.has(checkoutId)),
        receiptStatus,
      });

      rows.push({
        id: payment.id,
        provider: payment.provider,
        reference: payment.reference,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paid_at: payment.paid_at,
        checkout_id: checkoutId,
        receipt_status: receiptStatus,
        access_active: result.accessActive,
        healthy: result.healthy,
        issues: result.issues,
      });
    }

    const activeSubs = ((activeSubsResult.data ?? []) as ActiveSubscriptionRow[]).map(
      (sub: ActiveSubscriptionRow): ReconciliationSubscription => ({
        user_id: String(sub.user_id),
        has_access: Boolean(sub.has_access),
        expires_at: typeof sub.expires_at === "string" ? sub.expires_at : null,
      }),
    );
    const activeUserIds = activeSubs.map((s) => s.user_id);
    const successfulPaymentUsers = new Set<string>();
    if (activeUserIds.length > 0) {
      const { data: paidRows, error } = await admin
        .from("payments")
        .select("user_id")
        .eq("status", "success")
        .in("user_id", activeUserIds);
      if (error) {
        console.error("payment-reconciliation: successful payment query failed", error.message);
        return json({ error: "unavailable" }, 500);
      }
      for (const row of paidRows ?? []) successfulPaymentUsers.add(String(row.user_id));
    }

    const accessDiscrepancies = activeSubs
      .map((sub) => ({
        user_id: sub.user_id,
        expires_at: sub.expires_at,
        issues: reconcileActiveSubscription(sub, successfulPaymentUsers.has(sub.user_id)),
      }))
      .filter((row) => row.issues.length > 0);

    const unhealthyPayments = rows.filter((row) => row.healthy === false).length;
    return json({
      generated_at: new Date().toISOString(),
      summary: {
        payments_checked: rows.length,
        unhealthy_payments: unhealthyPayments,
        access_discrepancies: accessDiscrepancies.length,
      },
      payments: rows,
      access_discrepancies: accessDiscrepancies,
    });
  } catch (error) {
    console.error("payment-reconciliation error", error instanceof Error ? error.message : error);
    return json({ error: "unavailable" }, 500);
  }
});

async function getReceiptStatus(
  admin: ReturnType<typeof createClient>,
  userId: string,
  since: string | null,
  emailCache: Map<string, string | null>,
): Promise<"sent" | "failed" | "skipped" | null> {
  let email = emailCache.get(userId);
  if (email === undefined) {
    const { data } = await admin.auth.admin.getUserById(userId);
    email = data.user?.email ?? null;
    emailCache.set(userId, email);
  }
  if (!email) return null;

  let query = admin
    .from("email_events")
    .select("status,created_at")
    .eq("kind", "payment_receipt")
    .eq("to_email", email)
    .order("created_at", { ascending: false })
    .limit(1);
  if (since) query = query.gte("created_at", since);
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("payment-reconciliation: receipt lookup failed", userId, error.message);
    return null;
  }
  const status = data?.status;
  return status === "sent" || status === "failed" || status === "skipped" ? status : null;
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
