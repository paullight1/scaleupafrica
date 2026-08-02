import { useState } from "react";
import { CalendarClock, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { LoadingState } from "@shared/components/common/LoadingState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { useSubscription } from "@/lib/subscription";
import { defaultCurrency, formatPlanPrice, MEMBERSHIP_FEATURES, PLAN_TERM_YEARS, type Currency } from "@/lib/billing";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { CurrencyToggle } from "@/components/billing/CurrencyToggle";

const DAY = 86_400_000;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Current membership status + renew CTA (Plan 06 §5.6). TanStack Query via
 * useSubscription — a fetch error surfaces ErrorState + Retry, NEVER a false
 * "no plan". Renew extends the current expiry by a year (adds-a-year copy).
 */
export function CurrentPlanCard() {
  const { status, data, active, refetch } = useSubscription();
  const [currency, setCurrency] = useState<Currency>(defaultCurrency());

  if (status === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <LoadingState label="Loading your membership…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Couldn't load your membership"
        message="We couldn't check your subscription. Check your connection and try again — your access is safe."
        onRetry={refetch}
      />
    );
  }

  const expiresAt = data?.expires_at ?? null;
  const daysLeft = expiresAt ? (new Date(expiresAt).getTime() - Date.now()) / DAY : null;
  const expiringSoon = active && daysLeft !== null && daysLeft <= 60;
  const neverSubscribed = !data?.has_access && !expiresAt;

  const price = formatPlanPrice(currency);
  const renewLabel = active ? "Renew membership" : "Become a member";

  return (
    <section
      aria-labelledby="current-plan-heading"
      className="rounded-xl border border-border bg-card p-6 shadow-soft md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-navy">Annual Membership</p>
          <h2 id="current-plan-heading" className="mt-1 font-display text-2xl font-bold text-ink-strong">
            The Collective
          </h2>
        </div>
        {active ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Active
          </Badge>
        ) : expiresAt ? (
          <Badge variant="warning">Expired</Badge>
        ) : (
          <Badge variant="secondary">Not a member</Badge>
        )}
      </div>

      {/* Status line */}
      <div className="mt-4 flex items-start gap-2 text-sm text-foreground">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        {active ? (
          <p>
            Your membership is active until <strong>{formatDate(expiresAt)}</strong>.
          </p>
        ) : expiresAt ? (
          <p>
            Your membership expired on <strong>{formatDate(expiresAt)}</strong>. Renew to restore the Funding
            Radar.
          </p>
        ) : (
          <p>You're not a member yet. Join to unlock the Funding Radar for a full year.</p>
        )}
      </div>

      {/* Never-subscribed: show the pitch */}
      {neverSubscribed && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {MEMBERSHIP_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" />
              {f}
            </li>
          ))}
        </ul>
      )}

      {/* CTA: show on inactive OR when active and expiring soon */}
      {(!active || expiringSoon) && (
        <div className="mt-6 rounded-lg border border-border bg-surface-subtle p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl font-bold text-ink-strong">
                {price}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / {PLAN_TERM_YEARS} year
                </span>
              </p>
              {active && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Renewing early adds a year to your current expiry — you don't lose remaining days.
                </p>
              )}
            </div>
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </div>
          <div className="mt-4">
            <CheckoutButton currency={currency} next="/dashboard/billing" className="w-full sm:w-auto">
              {renewLabel}
            </CheckoutButton>
          </div>
        </div>
      )}

      {/* No-auto-renew explanation (Plan 06 §5.4) */}
      <p className="mt-6 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Your membership <strong>does not auto-renew</strong> — we never store your card or charge you
          again. Access simply runs until it expires; renew any time. No partial refunds.
        </span>
      </p>
    </section>
  );
}

export default CurrentPlanCard;
