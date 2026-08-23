export type ReconciliationIssue =
  | "paid_no_access"
  | "success_no_processed_event"
  | "receipt_failed"
  | "receipt_skipped"
  | "access_no_paid_payment";

export interface ReconciliationPayment {
  id: string;
  user_id: string;
  provider: string;
  reference: string;
  status: string;
  amount: number | string;
  currency: string;
  paid_at?: string | null;
  created_at?: string | null;
}

export interface ReconciliationSubscription {
  user_id: string;
  has_access: boolean;
  expires_at?: string | null;
}

export interface PaymentReconciliationInput {
  payment: ReconciliationPayment;
  subscription?: ReconciliationSubscription | null;
  processedSettlementEvent: boolean;
  receiptStatus?: "sent" | "failed" | "skipped" | null;
  nowMs?: number;
}

export interface PaymentReconciliationResult {
  issues: ReconciliationIssue[];
  healthy: boolean;
  accessActive: boolean;
}

/**
 * Pure payment-ledger invariant check used by the admin reconciliation endpoint.
 * It never mutates access. Remediation must flow through provider verification +
 * grant_annual_access(), never a direct subscription update.
 */
export function reconcilePayment({
  payment,
  subscription,
  processedSettlementEvent,
  receiptStatus = null,
  nowMs = Date.now(),
}: PaymentReconciliationInput): PaymentReconciliationResult {
  const issues: ReconciliationIssue[] = [];
  const expiryMs = subscription?.expires_at ? Date.parse(subscription.expires_at) : Number.NaN;
  const accessActive = Boolean(
    subscription?.has_access && Number.isFinite(expiryMs) && expiryMs > nowMs,
  );

  if (payment.status === "success" && !accessActive) {
    issues.push("paid_no_access");
  }
  if (payment.status === "success" && !processedSettlementEvent) {
    issues.push("success_no_processed_event");
  }
  if (receiptStatus === "failed") issues.push("receipt_failed");
  if (receiptStatus === "skipped") issues.push("receipt_skipped");

  return { issues, healthy: issues.length === 0, accessActive };
}

/** Active paid entitlement with no successful payment of any provider. */
export function reconcileActiveSubscription(
  subscription: ReconciliationSubscription,
  hasSuccessfulPayment: boolean,
  nowMs = Date.now(),
): ReconciliationIssue[] {
  const expiryMs = subscription.expires_at ? Date.parse(subscription.expires_at) : Number.NaN;
  const active = subscription.has_access && Number.isFinite(expiryMs) && expiryMs > nowMs;
  return active && !hasSuccessfulPayment ? ["access_no_paid_payment"] : [];
}
