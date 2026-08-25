import { useQuery } from "@tanstack/react-query";
import { supabase } from "@shared/integrations/supabase/client";

export type PaymentIssue =
  | "paid_no_access"
  | "success_no_processed_event"
  | "receipt_failed"
  | "receipt_skipped"
  | "access_no_paid_payment";

export interface ReconciledPaymentRow {
  id: string;
  provider: string;
  reference: string;
  status: string;
  amount: number | string;
  currency: string;
  paid_at: string | null;
  checkout_id: string | null;
  receipt_status: "sent" | "failed" | "skipped" | null;
  access_active: boolean;
  healthy: boolean;
  issues: PaymentIssue[];
}

export interface AccessDiscrepancyRow {
  user_id: string;
  expires_at: string | null;
  issues: PaymentIssue[];
}

export interface PaymentReconciliationResponse {
  generated_at: string;
  summary: {
    payments_checked: number;
    unhealthy_payments: number;
    access_discrepancies: number;
  };
  payments: ReconciledPaymentRow[];
  access_discrepancies: AccessDiscrepancyRow[];
}

export type PaymentPeriodMode = "monthly" | "yearly" | "lifetime" | "custom";

export interface PaymentPeriodSelection {
  mode: PaymentPeriodMode;
  month: string;
  year: string;
  customFrom: string;
  customTo: string;
}

export interface ResolvedPaymentPeriod {
  from: string | null;
  to: string | null;
  label: string;
  valid: boolean;
}

export interface PaymentCurrencySummary {
  amount: number;
  payments: number;
  average: number;
}

export interface AdminPaymentReport {
  periodLabel: string;
  byCurrency: Record<string, PaymentCurrencySummary>;
  successfulPayments: number;
  failedPayments: number;
}

type PaymentReportRpcResponse = {
  data: unknown;
  error: Error | null;
};

type PaymentReportRpcClient = {
  rpc: (
    name: "admin_payment_report",
    args: { _from: string | null; _to: string | null },
  ) => PromiseLike<PaymentReportRpcResponse>;
};

export function resolvePaymentPeriod(selection: PaymentPeriodSelection): ResolvedPaymentPeriod {
  if (selection.mode === "lifetime") {
    return { from: null, to: null, label: "Lifetime", valid: true };
  }

  if (selection.mode === "monthly") {
    const match = /^(\d{4})-(\d{2})$/.exec(selection.month);
    if (!match) return { from: null, to: null, label: "Selected month", valid: false };
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) {
      return { from: null, to: null, label: "Selected month", valid: false };
    }
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const from = `${match[1]}-${match[2]}-01`;
    const to = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${from}T00:00:00.000Z`));
    return { from, to, label, valid: true };
  }

  if (selection.mode === "yearly") {
    const numericYear = Number(selection.year);
    if (!/^\d{4}$/.test(selection.year) || numericYear < 2000 || numericYear > 9999) {
      return { from: null, to: null, label: "Selected year", valid: false };
    }
    return {
      from: `${selection.year}-01-01`,
      to: `${selection.year}-12-31`,
      label: selection.year,
      valid: true,
    };
  }

  const validDates = /^\d{4}-\d{2}-\d{2}$/.test(selection.customFrom)
    && /^\d{4}-\d{2}-\d{2}$/.test(selection.customTo);
  return {
    from: selection.customFrom || null,
    to: selection.customTo || null,
    label: "Custom range",
    valid: validDates && selection.customFrom <= selection.customTo,
  };
}

async function fetchPaymentReconciliation(): Promise<PaymentReconciliationResponse> {
  const { data, error } = await supabase.functions.invoke<PaymentReconciliationResponse>(
    "payment-reconciliation",
    { body: {} },
  );
  if (error) throw error;
  if (!data) throw new Error("Payment reconciliation returned no data.");
  return data;
}

export function usePaymentReconciliation() {
  return useQuery({
    queryKey: ["admin", "payment-reconciliation"],
    queryFn: fetchPaymentReconciliation,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminPaymentReport(selection: PaymentPeriodSelection) {
  const period = resolvePaymentPeriod(selection);
  return useQuery({
    queryKey: ["admin", "payment-report", period.from, period.to],
    enabled: period.valid,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AdminPaymentReport> => {
      const { data, error } = await (supabase as unknown as PaymentReportRpcClient).rpc(
        "admin_payment_report",
        { _from: period.from, _to: period.to },
      );
      if (error) throw error;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Payment reporting returned no data.");
      }

      const raw = data as Record<string, unknown>;
      const rawCurrencies = raw.by_currency;
      const byCurrency: Record<string, PaymentCurrencySummary> = {};
      if (rawCurrencies && typeof rawCurrencies === "object" && !Array.isArray(rawCurrencies)) {
        for (const [currency, value] of Object.entries(rawCurrencies)) {
          if (!value || typeof value !== "object" || Array.isArray(value)) continue;
          const row = value as Record<string, unknown>;
          byCurrency[currency] = {
            amount: finiteNumber(row.amount),
            payments: finiteNumber(row.payments),
            average: finiteNumber(row.average),
          };
        }
      }

      return {
        periodLabel: period.label,
        byCurrency,
        successfulPayments: finiteNumber(raw.successful_payments),
        failedPayments: finiteNumber(raw.failed_payments),
      };
    },
  });
}

function finiteNumber(value: unknown): number {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : 0;
}
