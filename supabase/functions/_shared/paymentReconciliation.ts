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

export type ReceiptStatus = "sent" | "failed" | "skipped";

export interface PaymentReceiptEvent {
  payment_id?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface SettlementIdentifiers {
  provider: string;
  checkoutId?: string | null;
  providerInvoiceId?: string | null;
}

/** A Bachs recurring settlement is keyed by invoice id; one-off checkout rows may use checkout id. */
export function settlementEventProcessed(
  payment: SettlementIdentifiers,
  processedCheckoutIds: ReadonlySet<string>,
  processedInvoiceIds: ReadonlySet<string>,
): boolean {
  if (payment.provider !== "bachs") return true;
  return Boolean(
    (payment.checkoutId && processedCheckoutIds.has(payment.checkoutId)) ||
      (payment.providerInvoiceId && processedInvoiceIds.has(payment.providerInvoiceId)),
  );
}

/** Resolve the newest receipt audit row for each payment; unlinked rows are ignored. */
export function indexReceiptStatuses(events: PaymentReceiptEvent[]): Map<string, ReceiptStatus> {
  const latest = new Map<string, { status: ReceiptStatus; createdAt: number }>();

  for (const event of events) {
    const paymentId = typeof event.payment_id === "string" ? event.payment_id.trim() : "";
    const status = event.status;
    if (!paymentId || (status !== "sent" && status !== "failed" && status !== "skipped")) continue;

    const parsedCreatedAt = event.created_at ? Date.parse(event.created_at) : Number.NaN;
    const createdAt = Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : 0;
    const existing = latest.get(paymentId);
    if (!existing || createdAt > existing.createdAt) latest.set(paymentId, { status, createdAt });
  }

  return new Map([...latest].map(([paymentId, event]) => [paymentId, event.status]));
}

/**
 * Pure payment-ledger invariant check used by the admin reconciliation endpoint.
 * It never mutates access. Remediation must flow through provider verification +
 * grant_membership_access(), never a direct subscription update.
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
  if (payment.status === "success" && receiptStatus === "failed") issues.push("receipt_failed");
  if (payment.status === "success" && receiptStatus === "skipped") issues.push("receipt_skipped");

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
