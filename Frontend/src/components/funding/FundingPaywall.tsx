import { useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Lock, AlertTriangle, ShieldAlert } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useBachsCheckout } from "@/hooks/useBachs";
import { isPlanCode, type PlanCode } from "@/lib/billing";

interface FundingPaywallProps {
  userEmail?: string;
}

/**
 * Shown when the subscription status is "inactive" (never on a fetch ERROR — that
 * renders ErrorState instead). Owns the fraud-warning + acknowledgement gate
 * before the Bachs hosted checkout begins.
 *
 * The example-opportunity cards that used to sit at the bottom are gone:
 * FundingTeaserPanel renders real currently-open opportunities directly above
 * this surface instead of mixing invented examples with live listings.
 */
export function FundingPaywall({ userEmail }: FundingPaywallProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [params] = useSearchParams();
  const { startCheckout, isPending } = useBachsCheckout();
  const requestedPlan = params.get("plan");
  const planCode: PlanCode = isPlanCode(requestedPlan) ? requestedPlan : "annual";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border border-border bg-card p-8 shadow-elevated md:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-navy text-white">
          <Lock className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mb-3 text-center font-display text-2xl font-bold text-ink-strong">Members only</h1>
        <p className="mx-auto mb-6 max-w-xl text-center text-muted-foreground">
          Funding opportunities are a benefit for active members. Before you subscribe, please read and accept the
          notice below.
        </p>

        <div className="mb-6 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
            <div className="space-y-2 text-sm text-foreground/80">
              <p>
                <strong>Please note:</strong> a given search may not always surface opportunities you are eligible
                for, or that are open right now. Most reputable grants and fellowships run on an{" "}
                <strong>annual cycle</strong> — if this year's deadline has passed, the same opportunity typically
                reopens next year, so bookmark those that fit you.
              </p>
              <p className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
                <span>
                  <strong>Fraud warning:</strong> opportunities are curated to be real and verifiable, but always do
                  further research. <strong>Never pay a fee to apply for or receive a grant</strong> — that is a
                  strong signal it is fraudulent.
                </span>
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 border-t border-primary/30 pt-3">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(v === true)}
              className="mt-0.5"
              aria-label="I acknowledge the funding notice"
            />
            <span className="text-sm text-foreground/80">
              I understand results may vary by cycle, I will do my own due diligence, and I will never pay to apply
              for or receive a grant.
            </span>
          </label>
        </div>

        <div className="text-center">
          <Button
            size="lg"
            disabled={!acknowledged || isPending}
            onClick={() => startCheckout({ plan_code: planCode, next: "/dashboard/funding?plan=" + planCode })}
          >
            {isPending ? "Starting checkout…" : "See membership"}
          </Button>
        </div>
        {userEmail && (
          <p className="mt-6 text-center text-xs text-muted-foreground">Signed in as {userEmail}</p>
        )}
      </div>
    </div>
  );
}

export default FundingPaywall;
