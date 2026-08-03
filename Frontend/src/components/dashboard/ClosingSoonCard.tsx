import { Link } from "react-router-dom";
import { CalendarClock, ArrowRight } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { closingSoon, daysUntilDeadline } from "@/lib/dashboard/deadline";
import { DASHBOARD_FUNDING } from "@/lib/dashboard/routes";
import type { FundingOpportunity } from "@/lib/dashboard/types";

/**
 * The one block on Home that earns its place above everything else: money that
 * stops being available soon. Counts and percentages can wait; a deadline can't.
 *
 * Only opportunities with a deadline we could actually parse appear here —
 * `deadline` is free text, so anything ambiguous is silently excluded rather
 * than guessed at. Renders nothing when there's nothing urgent, which is the
 * common case and should cost the user no attention at all.
 */
export function ClosingSoonCard({
  feed,
  withinDays = 21,
}: {
  feed: FundingOpportunity[];
  withinDays?: number;
}) {
  const urgent = closingSoon(feed, withinDays).slice(0, 3);
  if (urgent.length === 0) return null;

  return (
    <section
      aria-labelledby="closing-soon-heading"
      className="rounded-xl border border-primary/30 bg-primary/5 p-6"
    >
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary-dark" aria-hidden="true" />
        <h2
          id="closing-soon-heading"
          className="font-display text-lg font-semibold text-ink-strong"
        >
          Closing soon
        </h2>
      </div>

      <ul className="mt-4 space-y-3">
        {urgent.map((o) => {
          const days = daysUntilDeadline(o.deadline) ?? 0;
          return (
            <li key={o.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-strong">{o.title}</p>
                <p className="truncate text-sm text-muted-foreground">{o.funder}</p>
              </div>
              <span
                className={cn(
                  "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                  days <= 7
                    ? "bg-destructive/10 text-destructive-strong"
                    : "bg-card text-muted-foreground",
                )}
              >
                {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
              </span>
            </li>
          );
        })}
      </ul>

      <Link
        to={DASHBOARD_FUNDING}
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-navy-light dark:text-primary"
      >
        Open the funding radar
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

export default ClosingSoonCard;
