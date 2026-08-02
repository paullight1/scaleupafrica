import { PageHeader } from "@shared/components/common/PageHeader";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { PaymentHistory } from "@/components/billing/PaymentHistory";
import { ConciergeCard } from "@/components/billing/ConciergeCard";

interface BillingPanelProps {
  /** Set false when the host page already renders its own title (e.g. dashboard shell). */
  showHeader?: boolean;
  className?: string;
}

/**
 * Self-contained billing surface (Plan 06 §5.6). Plan 03's dashboard "Account &
 * billing" sub-route imports and mounts this directly. Composes:
 *   - CurrentPlanCard  (status + renew/upgrade, loading/empty/error states)
 *   - PaymentHistory   (RLS-scoped receipts)
 *   - ConciergeCard    (permanent WhatsApp / bank-transfer fallback lane)
 */
export function BillingPanel({ showHeader = true, className }: BillingPanelProps) {
  return (
    <div className={className}>
      {showHeader && (
        <PageHeader
          title="Membership & billing"
          subtitle="Manage your annual membership, renew, and review your payment history."
          className="mb-8"
        />
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CurrentPlanCard />
          <PaymentHistory />
        </div>
        <div className="lg:col-span-1">
          <ConciergeCard />
        </div>
      </div>
    </div>
  );
}

export default BillingPanel;
