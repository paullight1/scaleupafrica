import { useEffect } from "react";
import { PageHeader } from "@/components/common/PageHeader";
// Plan 06 owns src/components/billing/BillingPanel.tsx (FOUNDATION §8.2). This
// import is the fixed seam — it may not resolve until plan 06 lands (sibling
// tsc error, expected during Wave 3). The billing panel renders subscription
// state + upgrade/pay (Paystack) and invalidates qk.mySubscription on success.
import BillingPanel from "@/components/billing/BillingPanel";
import { SecurityCard } from "@/components/dashboard/SecurityCard";
import { NotificationPrefsCard } from "@/components/dashboard/NotificationPrefsCard";
import { SignOutCard } from "@/components/dashboard/SignOutCard";

export function DashboardBilling() {
  useEffect(() => {
    document.title = "Account & billing — Cresciva";
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader title="Account & billing" subtitle="Your membership, security and preferences." />

      <div id="billing" className="scroll-mt-24">
        <BillingPanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SecurityCard />
        <NotificationPrefsCard />
      </div>

      <SignOutCard />
    </div>
  );
}

export default DashboardBilling;
