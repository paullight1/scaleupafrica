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
