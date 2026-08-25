import { CalendarRange, CircleAlert, CreditCard, Loader2, ReceiptText } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import type {
  AdminPaymentReport,
  PaymentPeriodMode,
  PaymentPeriodSelection,
} from "@/hooks/queries/adminPayments";

const PERIOD_OPTIONS: Array<{ mode: PaymentPeriodMode; label: string }> = [
  { mode: "monthly", label: "Monthly" },
  { mode: "yearly", label: "Yearly" },
  { mode: "lifetime", label: "Lifetime" },
  { mode: "custom", label: "Custom" },
];

export function PaymentInsightsDialog({
  open,
  onOpenChange,
  selection,
  onSelectionChange,
  report,
  loading,
  error,
  rangeValid,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: PaymentPeriodSelection;
  onSelectionChange: (selection: PaymentPeriodSelection) => void;
  report: AdminPaymentReport | undefined;
  loading: boolean;
  error: boolean;
  rangeValid: boolean;
  onRetry: () => void;
}) {
  const update = (patch: Partial<PaymentPeriodSelection>) => {
    onSelectionChange({ ...selection, ...patch });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border bg-[#eef8f1] px-6 py-6 pr-12 text-left">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#d8eadf] bg-white/80">
            <CalendarRange className="h-5 w-5 text-[#4a9b6d]" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-2xl text-ink-strong">Payment insights</DialogTitle>
          <DialogDescription>
            Track settled payment value across a month, year, lifetime, or exact calendar range.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 pb-6">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/50 p-1.5 sm:grid-cols-4">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.mode}
                type="button"
                variant={selection.mode === option.mode ? "default" : "ghost"}
                aria-pressed={selection.mode === option.mode}
                onClick={() => update({ mode: option.mode })}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <PeriodControls selection={selection} update={update} />

          {!rangeValid ? (
            <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-strong">
              Choose a valid start and end date. The end date cannot be before the start date.
            </div>
          ) : loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Calculating payment totals…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <p className="font-medium text-foreground">Payment totals could not be loaded.</p>
              <p className="mt-1 text-sm text-muted-foreground">The reconciliation ledger was not changed.</p>
              <Button className="mt-4" variant="outline" onClick={onRetry}>Try again</Button>
            </div>
          ) : report ? (
            <PaymentReportView report={report} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PeriodControls({
  selection,
  update,
}: {
  selection: PaymentPeriodSelection;
  update: (patch: Partial<PaymentPeriodSelection>) => void;
}) {
  if (selection.mode === "monthly") {
    return (
      <div className="max-w-xs space-y-2">
        <Label htmlFor="payment-report-month">Choose month</Label>
        <Input
          id="payment-report-month"
          type="month"
          value={selection.month}
          onChange={(event) => update({ month: event.target.value })}
        />
      </div>
    );
  }

  if (selection.mode === "yearly") {
    return (
      <div className="max-w-xs space-y-2">
        <Label htmlFor="payment-report-year">Choose year</Label>
        <Input
          id="payment-report-year"
          type="number"
          inputMode="numeric"
          min="2000"
          max="9999"
          value={selection.year}
          onChange={(event) => update({ year: event.target.value })}
        />
      </div>
    );
  }

  if (selection.mode === "custom") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payment-report-from">Start date</Label>
          <Input
            id="payment-report-from"
            type="date"
            value={selection.customFrom}
            onChange={(event) => update({ customFrom: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment-report-to">End date</Label>
          <Input
            id="payment-report-to"
            type="date"
            value={selection.customTo}
            onChange={(event) => update({ customTo: event.target.value })}
          />
        </div>
      </div>
    );
  }

  return (
    <p className="rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
      Lifetime includes every successful payment recorded in Cresciva’s ledger.
    </p>
  );
}

function PaymentReportView({ report }: { report: AdminPaymentReport }) {
  const currencies = Object.entries(report.byCurrency);
  const terminalPayments = report.successfulPayments + report.failedPayments;
  const successRate = terminalPayments > 0
    ? `${Math.round((report.successfulPayments / terminalPayments) * 100)}%`
    : "—";

  return (
    <div className="space-y-5">
      <div>
        <p className="studio-section-label">Amount gotten</p>
        <h3 className="mt-1 font-display text-xl font-semibold text-ink-strong">{report.periodLabel}</h3>
      </div>

      {currencies.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {currencies.map(([currency, summary]) => (
            <article key={currency} className="rounded-xl border border-[#d8eadf] bg-[#eef8f1] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#397a56]">{currency}</p>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-strong">
                {formatPaymentAmount(summary.amount, currency)}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink/60">
                <span>{summary.payments.toLocaleString()} {summary.payments === 1 ? "payment" : "payments"}</span>
                <span>{formatPaymentAmount(summary.average, currency)} average</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
          <ReceiptText className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 font-medium text-foreground">No successful payments</p>
          <p className="mt-1 text-sm text-muted-foreground">No settled amount was recorded for this period.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <ReportStat icon={CreditCard} label="Successful" value={report.successfulPayments.toLocaleString()} />
        <ReportStat icon={CircleAlert} label="Unsuccessful" value={report.failedPayments.toLocaleString()} />
        <ReportStat icon={ReceiptText} label="Success rate" value={successRate} />
      </div>
      <p className="text-sm text-muted-foreground">
        {report.successfulPayments.toLocaleString()} successful payments
      </p>
    </div>
  );
}

function ReportStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-primary-dark" aria-hidden="true" />
      <p className="mt-3 font-display text-2xl font-bold text-ink-strong">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function PaymentAmountValue({ report }: { report: AdminPaymentReport | undefined }) {
  if (!report) return <>—</>;
  const currencies = Object.entries(report.byCurrency);
  if (currencies.length === 0) return <>0</>;
  return (
    <span className="flex flex-col gap-0.5 text-[1.4rem] leading-tight">
      {currencies.map(([currency, summary]) => (
        <span key={currency}>{formatPaymentAmount(summary.amount, currency)}</span>
      ))}
    </span>
  );
}

function formatPaymentAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toLocaleString()}`;
  }
}
