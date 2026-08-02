import { Link } from "react-router-dom";
import { Button } from "@shared/components/ui/button";

/**
 * Non-subscriber nudge (plan 03 §4.5). Navy panel, orange CTA with navy label.
 * Only rendered when the subscription is genuinely inactive — never on a fetch
 * error (the parent guards this).
 */
export function UpgradeBanner() {
  return (
    <div className="rounded-xl bg-navy p-6 text-white shadow-medium md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-xl font-semibold text-white">
            See every opportunity that fits you
          </h2>
          <p className="mt-2 text-sm text-white/80">
            Members get the full AI-curated radar. The list above is our free curated feed — the
            member radar goes wider and updates more often.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to="/dashboard/billing#billing">Become a member</Link>
        </Button>
      </div>
    </div>
  );
}

export default UpgradeBanner;
