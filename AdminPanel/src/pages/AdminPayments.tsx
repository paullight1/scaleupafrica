import { AlertTriangle, CheckCircle2, CircleAlert, CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { ErrorState } from "@shared/components/common/ErrorState";
import { LoadingState } from "@shared/components/common/LoadingState";
import { StudioDataPanel } from "@/components/studio/StudioDataPanel";
import { StudioMetricStrip } from "@/components/studio/StudioMetricStrip";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { usePaymentReconciliation, type PaymentIssue } from "../hooks/queries/adminPayments";

const ISSUE_LABELS: Record<PaymentIssue, string> = {
  paid_no_access: "Paid, no access",
  success_no_processed_event: "No processed settlement",
  receipt_failed: "Receipt failed",
  receipt_skipped: "Receipt skipped",
  access_no_paid_payment: "Access without payment",
};

export default function AdminPayments() {
  const query = usePaymentReconciliation();

  if (query.isLoading) return <LoadingState label="Reconciling payments…" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        title="Couldn't reconcile payments"
        message="The payment ledger could not be checked. No access changes were made."
        onRetry={() => query.refetch()}
      />
    );
  }

  const { summary, payments, access_discrepancies: accessDiscrepancies, generated_at: generatedAt } = query.data;
  const allHealthy = summary.unhealthy_payments === 0 && summary.access_discrepancies === 0;

  return (
    <div className="space-y-7">
      <StudioPageHeader
        eyebrow="Read-only finance desk"
        title="Payments"
        description="Review settlement, access, webhook processing and receipt reconciliation."
        accent="lime"
        actions={
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <StudioMetricStrip
        items={[
          { label: "Payments checked", value: summary.payments_checked.toLocaleString(), hint: "In this reconciliation", icon: CreditCard, tone: "cobalt" },
          { label: "Healthy payments", value: payments.filter((payment) => payment.healthy).length.toLocaleString(), hint: "No issue detected", icon: ShieldCheck, tone: "lime" },
          { label: "Payment issues", value: summary.unhealthy_payments.toLocaleString(), hint: "Needs investigation", icon: CircleAlert, tone: "orange" },
          { label: "Access issues", value: summary.access_discrepancies.toLocaleString(), hint: "Ledger mismatch", icon: AlertTriangle, tone: "navy" },
        ]}
      />

      <div className={`studio-health-panel ${allHealthy ? "" : "!border-l-warning"}`}>
        <div className="flex items-center gap-2">
          {allHealthy ? (
            <CheckCircle2 className="h-5 w-5 text-success-strong" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-warning-strong" />
          )}
          <p className="font-medium text-foreground">
            {allHealthy ? "Reconciliation healthy" : "Reconciliation needs attention"}
          </p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Generated {new Date(generatedAt).toLocaleString()}.
        </p>
      </div>

      <StudioDataPanel>
        <div className="border-b border-border px-5 py-4">
          <p className="studio-section-label text-primary-dark">Settlement ledger</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Recent payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Access</th>
                <th className="px-5 py-3">Receipt</th>
                <th className="px-5 py-3">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-5 py-4 font-mono text-xs text-foreground">{payment.reference}</td>
                  <td className="px-5 py-4 capitalize">{payment.provider}</td>
                  <td className="px-5 py-4">{formatAmount(payment.amount, payment.currency)}</td>
                  <td className="px-5 py-4"><Badge variant={payment.status === "success" ? "success" : "secondary"}>{payment.status}</Badge></td>
                  <td className="px-5 py-4">{payment.access_active ? "Active" : "Inactive"}</td>
                  <td className="px-5 py-4">{payment.receipt_status ?? "—"}</td>
                  <td className="px-5 py-4">
                    {payment.issues.length === 0 ? (
                      <span className="text-success-strong">Healthy</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {payment.issues.map((issue) => <Badge key={issue} variant="warning">{ISSUE_LABELS[issue]}</Badge>)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td className="px-5 py-8 text-center text-muted-foreground" colSpan={7}>No payments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </StudioDataPanel>

      {accessDiscrepancies.length > 0 && (
        <section className="rounded-xl border border-warning/40 bg-card p-5">
          <h2 className="font-display text-xl font-semibold text-foreground">Access discrepancies</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These accounts have active paid access but no successful payment record. Investigate before changing access.
          </p>
          <ul className="mt-4 space-y-3">
            {accessDiscrepancies.map((row) => (
              <li key={row.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <span className="font-mono text-xs text-foreground">{row.user_id}</span>
                <div className="flex gap-2">
                  {row.issues.map((issue) => <Badge key={issue} variant="warning">{ISSUE_LABELS[issue]}</Badge>)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function formatAmount(amount: number | string, currency: string): string {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return `${currency} ${String(amount)}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(numeric / 100);
  } catch {
    return `${currency} ${(numeric / 100).toLocaleString()}`;
  }
}
