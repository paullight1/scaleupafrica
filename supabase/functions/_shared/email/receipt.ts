// =============================================================================
// Payment receipt — shared by paystack-webhook and paystack-verify.
//
// Both functions can complete the same grant (the webhook is the settlement
// path; verify is the callback-page backstop), so BOTH call this. The
// `receipt:<paymentId>` idempotency key is what makes that safe: Resend collapses
// identical keys for 24h, so the customer gets exactly one receipt no matter
// which path won the race — or whether Paystack retried the webhook.
//
// Never throws. A receipt is a courtesy; it must not be able to fail a payment
// grant or push a webhook into a retry loop.
// =============================================================================

import { loadEmailConfig } from "./config.ts";
import { dispatch, type EmailLogRow } from "./dispatch.ts";

/** The narrow slice of the Supabase client this needs — keeps npm: imports out. */
interface AdminClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null }>;
      };
    };
    insert(row: Record<string, unknown>): Promise<{ error: unknown }>;
  };
  auth: {
    admin: {
      getUserById(id: string): Promise<{
        data: { user: { email?: string | null; user_metadata?: Record<string, unknown> } | null };
      }>;
    };
  };
}

export async function sendPaymentReceipt(
  admin: AdminClient,
  paymentId: string,
  env: Record<string, string | undefined>,
): Promise<void> {
  try {
    const config = loadEmailConfig(env);
    if (!config.apiKey) return; // not configured — dispatch would only log a skip

    const { data: payment } = await admin
      .from("payments")
      .select("id, amount, currency, reference, user_id, paid_at")
      .eq("id", paymentId)
      .maybeSingle();
    if (!payment) return;

    const userId = String(payment.user_id ?? "");
    if (!userId) return;

    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (!email) {
      console.warn("[email] receipt skipped — no address for user", userId);
      return;
    }

    const meta = userData.user?.user_metadata ?? {};
    const name =
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.name === "string" && meta.name) ||
      null;

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    const log = async (row: EmailLogRow) => {
      await admin.from("email_events").insert(row);
    };

    await dispatch(
      {
        kind: "payment_receipt",
        name,
        amount: Number(payment.amount),
        currency: String(payment.currency ?? ""),
        reference: String(payment.reference ?? ""),
        paidAt: (payment.paid_at as string | null) ?? null,
        expiresAt: (subscription?.expires_at as string | null) ?? null,
        siteUrl: config.siteUrl,
      },
      { to: email, idempotencyKey: `receipt:${paymentId}` },
      { config, log },
    );
  } catch (e) {
    // Swallow everything: a receipt failure must never affect the grant path.
    console.error("[email] payment receipt failed", e instanceof Error ? e.message : e);
  }
}
