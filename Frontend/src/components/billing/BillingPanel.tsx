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
          subtitle="Manage your recurring membership, billing settings, and payment history."
          className="mb-8"
        />
      )}
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
        <div className="min-w-0 space-y-5">
          <CurrentPlanCard />
          <PaymentHistory />
        </div>
        <div className="min-w-0">
          <ConciergeCard />
        </div>
      </div>
    </div>
  );
}

export default BillingPanel;
