import { Link } from "react-router-dom";
import { Lock, Compass } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { deadlineLabel } from "@/lib/dashboard/deadline";
import { DASHBOARD_ACCOUNT_BILLING } from "@/lib/dashboard/routes";
import type { FundingTeaser } from "@/lib/dashboard/types";

/**
 * What a signed-in non-member sees of the feed: a few REAL opportunities
 * (title, funder, deadline) with everything else locked.
 *
 * Before this, RLS returned them zero rows and the UI rendered "the curated
 * feed is being prepared" — telling a prospective customer the product was
 * unfinished. Real titles with a locked link is both honest and a far better
 * argument for paying than an example card ever was.
 *
 * Data comes from the `funding_teaser` RPC, which returns the advertising
 * columns only; there is no client-side hiding here to bypass.
 */
export function FundingTeaserPanel({
  teaser,
  heading = "This week's funding",
}: {
  teaser: FundingTeaser;
  heading?: string;
}) {
  const { items, totalPublished } = teaser;
  const remaining = Math.max(totalPublished - items.length, 0);

  return (
    <section
      aria-labelledby="teaser-heading"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"
    >
      <div className="flex items-center gap-2 border-b border-border px-6 py-4">
        <Compass className="h-4 w-4 text-primary-dark" aria-hidden="true" />
        <h2 id="teaser-heading" className="font-display text-lg font-semibold text-ink-strong">
          {heading}
        </h2>
      </div>

      {items.length === 0 ? (
        // Genuinely nothing published yet. This is the ONE case where "being
        // prepared" is the truth rather than an RLS artefact.
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            The first curated batch is being verified. Members are emailed as soon as it lands.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((o) => {
            const closes = deadlineLabel(o.deadline);
            return (
              <li key={o.id} className="flex items-center gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold text-ink-strong">
                    {o.title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{o.funder}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {o.type && (
                    <Badge variant="secondary" className="hidden capitalize sm:inline-flex">
                      {o.type}
                    </Badge>
                  )}
                  {closes && (
                    <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                      {closes}
                    </span>
                  )}
                  <Lock className="h-4 w-4 text-muted-foreground" aria-label="Members only" />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-border bg-surface-subtle px-6 py-5 text-center">
        {remaining > 0 && (
          <p className="mb-3 text-sm font-medium text-foreground">
            +{remaining} more {remaining === 1 ? "opportunity" : "opportunities"} — with amounts,
            eligibility and the funder's own link.
          </p>
        )}
        <Button asChild>
          <Link to={DASHBOARD_ACCOUNT_BILLING}>See membership</Link>
        </Button>
      </div>
    </section>
  );
}

export default FundingTeaserPanel;
