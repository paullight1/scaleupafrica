import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, AlertTriangle, ShieldAlert } from "lucide-react";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { SAMPLE_OPPS } from "@/components/funding/sampleData";
// SIBLING CONTRACT (Plan 06 / payments): usePaystackCheckout() returns
//   { startCheckout: (opts?: { next?: string }) => void; isPending: boolean }
// This module is owned by Plan 06 and may not exist yet during Wave 3 — tsc will
// report "Cannot find module '@/hooks/usePaystack'" until it lands. The
// orchestrator's post-wave typecheck resolves it. (Previously this CTA linked to
// /#pricing; Plan 06 repoints it at real checkout with a ?next=/funding return.)
import { usePaystackCheckout } from "@/hooks/usePaystack";

interface FundingPaywallProps {
  userEmail?: string;
}

/**
 * Shown when the subscription status is "inactive" (never on a fetch ERROR — that
 * renders ErrorState instead, IMPROVEMENTS §2.1). Keeps the fraud-warning +
 * acknowledgement flow, and shows clearly-labelled Example cards (this replaces the
 * old `?preview=1` bypass honestly).
 */
export function FundingPaywall({ userEmail }: FundingPaywallProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { startCheckout, isPending } = usePaystackCheckout();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
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
            onClick={() => startCheckout({ next: "/funding" })}
          >
            {isPending ? "Starting checkout…" : "See membership"}
          </Button>
        </div>
        {userEmail && (
          <p className="mt-6 text-center text-xs text-muted-foreground">Signed in as {userEmail}</p>
        )}
      </div>

      <div className="mt-10">
        <p className="mb-4 text-center text-sm font-semibold text-muted-foreground">
          A preview of what members see — these are example opportunities, not live results.
        </p>
        <div className="grid gap-6">
          {SAMPLE_OPPS.map((o) => (
            <OpportunityCard key={`${o.title}|${o.funder}`} opportunity={o} open={false} onToggle={() => {}} sample />
          ))}
        </div>
      </div>
    </div>
  );
}

export default FundingPaywall;
