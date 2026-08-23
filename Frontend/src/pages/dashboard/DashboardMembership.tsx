import BillingPanel from "@/components/billing/BillingPanel";

export function DashboardMembership() {
  return (
    <section aria-labelledby="membership-heading">
      <div className="mb-5 md:mb-6">
        <h2 id="membership-heading" className="font-display text-2xl font-semibold text-ink-strong">Membership</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your plan, payments and receipts.</p>
      </div>
      <BillingPanel showHeader={false} />
    </section>
  );
}

export default DashboardMembership;
