import { useState } from "react";
import { CalendarClock, CheckCircle2, ExternalLink, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { LoadingState } from "@shared/components/common/LoadingState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { useSubscription } from "@/lib/subscription";
import { createPortalSession } from "@/lib/bachs";
import { formatPlanPrice, MEMBERSHIP_FEATURES, PLAN_TERM_MONTHS } from "@/lib/billing";
import { CheckoutButton } from "@/components/billing/CheckoutButton";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function planLabel(plan: string | null | undefined): string {
  return plan === "monthly" ? "Monthly" : plan === "quarterly" ? "Quarterly" : plan === "annual" ? "Annual" : "Membership";
}

export function CurrentPlanCard() {
  const { status, data, active, refetch } = useSubscription();
  const [portalPending, setPortalPending] = useState(false);

  if (status === "loading") return <div className="rounded-xl border border-border bg-card p-6 shadow-soft"><LoadingState label="Loading your membership…" /></div>;
  if (status === "error") return <ErrorState title="Couldn't load your membership" message="We couldn't check your membership. Check your connection and try again — your access is safe." onRetry={refetch} />;

  const expiresAt = data?.expires_at;
  const billingStatus = data?.billing_status?.toLowerCase();
  const hasBillingAccount = Boolean(data?.bachs_subscription_id);
  const isPastDue = billingStatus === "past_due" || billingStatus === "unpaid";
  const isCanceled = billingStatus === "canceled";
  const neverSubscribed = !data?.has_access && !expiresAt;
  const price = formatPlanPrice("annual", "USD");

  async function openPortal() {
    setPortalPending(true);
    const result = await createPortalSession();
    if (result.portal_url) window.location.assign(result.portal_url);
    else toast.error(result.error || "Could not open billing management. Please try again.");
    setPortalPending(false);
  }

  return (
    <section aria-labelledby="current-plan-heading" className="rounded-xl border border-border bg-card p-4 sm:p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-navy">{planLabel(data?.plan_code)}</p>
          <h2 id="current-plan-heading" className="mt-1 font-display text-2xl font-bold text-ink-strong">The Collective</h2>
        </div>
        {active ? <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Active</Badge>
          : isPastDue ? <Badge variant="warning">Payment needs attention</Badge>
          : isCanceled ? <Badge variant="warning">Canceled</Badge>
          : expiresAt ? <Badge variant="warning">Expired</Badge>
          : <Badge variant="secondary">Not a member</Badge>}
      </div>

      <div className="mt-4 flex items-start gap-2 text-sm text-foreground">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        {active ? <p>Your membership is active until <strong>{formatDate(expiresAt)}</strong>{data?.next_payment_at && !data.cancel_at_period_end ? <>. Next payment: <strong>{formatDate(data.next_payment_at)}</strong>.</> : "."}</p>
          : isPastDue ? <p>Your latest recurring payment needs attention. Update your payment method in the Bachs billing portal.</p>
          : expiresAt ? <p>Your membership ended on <strong>{formatDate(expiresAt)}</strong>. Choose a plan to restore the Funding Radar.</p>
          : <p>You're not a member yet. Choose a recurring plan to unlock the Funding Radar.</p>}
      </div>

      {neverSubscribed && <ul className="mt-5 grid gap-x-5 gap-y-2 sm:grid-cols-2">{MEMBERSHIP_FEATURES.map((feature) => <li key={feature} className="flex min-w-0 items-start gap-2 text-sm leading-5 text-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" /><span>{feature}</span></li>)}</ul>}

      {hasBillingAccount && <Button variant="outline" className="mt-6 w-full sm:w-auto" onClick={openPortal} disabled={portalPending}>{portalPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening billing…</> : <><ExternalLink className="h-4 w-4" /> Manage billing</>}</Button>}

      {!hasBillingAccount && !active && <div className="mt-6 rounded-lg border border-border bg-surface-subtle p-4"><p className="font-display text-xl font-bold text-ink-strong">{price}<span className="ml-1 text-sm font-normal text-muted-foreground">/ {PLAN_TERM_MONTHS.annual / 12} year</span></p><p className="mt-1 text-xs text-muted-foreground">Recurring USD card subscription through Bachs.</p><CheckoutButton currency="USD" next="/dashboard/account/membership" className="mt-4 w-full sm:w-auto">Start annual membership</CheckoutButton></div>}

      <p className="mt-6 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>Plans renew automatically through Bachs. Manage or cancel your subscription from the Bachs billing portal. Cresciva does not receive your card details.</span></p>
    </section>
  );
}

export default CurrentPlanCard;
