import { Bookmark, BookmarkCheck, CalendarClock, ExternalLink } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { trackEvent } from "@shared/lib/analytics";
import { Badge } from "@shared/components/ui/badge";
import { isNewThisWeek } from "@/lib/dashboard/feed";
import type { FundingOpportunity } from "@/lib/dashboard/types";

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return deadline;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

interface OpportunityRowProps {
  opportunity: FundingOpportunity;
  saved: boolean;
  onToggleSave: () => void;
  savePending?: boolean;
  matchScore?: number;
  confidenceScore?: number;
  matchReasons?: string[];
}

export function OpportunityRow({
  opportunity: o,
  saved,
  onToggleSave,
  savePending = false,
  matchScore,
  confidenceScore,
  matchReasons = [],
}: OpportunityRowProps) {
  const deadline = formatDeadline(o.deadline);
  const isNew = isNewThisWeek(o);
  const BookmarkIcon = saved ? BookmarkCheck : Bookmark;

  const trackSourceClick = () => {
    void trackEvent("opportunity_source_click", {
      entityType: "funding_opportunity",
      entityId: o.id,
      metadata: {
        surface: "dashboard_recommendations",
        match_score: matchScore ?? null,
        confidence_score: confidenceScore ?? null,
      },
    });
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/40">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {typeof matchScore === "number" && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-dark">
              {matchScore}% match
            </span>
          )}
          {o.type && (
            <Badge variant="secondary" className="capitalize">
              {o.type}
            </Badge>
          )}
          {isNew && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-ink-strong">
              New
            </span>
          )}
          {typeof confidenceScore === "number" && confidenceScore < 60 && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-foreground">
              Source needs recheck
            </span>
          )}
        </div>
        <h3 className="truncate font-display text-base font-semibold text-ink-strong">{o.title}</h3>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{o.funder}</p>

        {matchReasons.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-foreground/75" aria-label="Why this matches">
            {matchReasons.slice(0, 2).map((reason) => (
              <li key={reason} className="flex gap-1.5">
                <span aria-hidden="true">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {o.amount && <span className="font-medium text-foreground">{o.amount}</span>}
          {deadline && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              Closes {deadline}
            </span>
          )}
          {o.url && (
            <a
              href={o.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={trackSourceClick}
              className="inline-flex items-center gap-1 font-medium text-navy underline underline-offset-2 hover:text-navy-light dark:text-primary"
            >
              Official source
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleSave}
        disabled={savePending}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${o.title} from saved` : `Save ${o.title}`}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:opacity-50",
          saved
            ? "bg-primary/10 text-ink-strong"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <BookmarkIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default OpportunityRow;
