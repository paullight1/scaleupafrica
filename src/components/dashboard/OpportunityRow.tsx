import { Bookmark, BookmarkCheck, CalendarClock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
}

export function OpportunityRow({
  opportunity: o,
  saved,
  onToggleSave,
  savePending = false,
}: OpportunityRowProps) {
  const deadline = formatDeadline(o.deadline);
  const isNew = isNewThisWeek(o);
  const BookmarkIcon = saved ? BookmarkCheck : Bookmark;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/40">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {o.type && (
            <Badge variant="secondary" className="capitalize">
              {o.type}
            </Badge>
          )}
          {isNew && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              New
            </span>
          )}
        </div>
        <h3 className="truncate font-display text-base font-semibold text-ink-strong">{o.title}</h3>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{o.funder}</p>
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
              className="inline-flex items-center gap-1 font-medium text-navy underline underline-offset-2 hover:text-navy-light dark:text-primary"
            >
              Details
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
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <BookmarkIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default OpportunityRow;
