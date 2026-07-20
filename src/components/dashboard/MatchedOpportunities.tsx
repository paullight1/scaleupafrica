import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { matchOpportunities } from "@/lib/dashboard/matchOpportunities";
import type { FundingOpportunity, Profile } from "@/lib/dashboard/types";
import { OpportunityRow } from "./OpportunityRow";
import { useSavedMap } from "./useSavedMap";

interface MatchedOpportunitiesProps {
  profile: Profile | null;
  feed: FundingOpportunity[];
}

/**
 * Pillar A "Matched to your business". Falls back to newest feed items when the
 * user has a profile but zero matches, and to a firstRun EmptyState when there
 * is no profile at all.
 */
export function MatchedOpportunities({ profile, feed }: MatchedOpportunitiesProps) {
  const { savedMap, toggle, pending } = useSavedMap();

  const matched = matchOpportunities(profile, feed);
  const hasMatches = matched.length > 0;
  const rows = (hasMatches ? matched : feed).slice(0, 5);
  const heading = hasMatches ? "Matched to your business" : "Newest opportunities";

  return (
    <section aria-labelledby="matched-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 id="matched-heading" className="font-display text-xl font-semibold text-ink-strong">
          {heading}
        </h2>
        <Link
          to="/funding"
          className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-navy-light dark:text-primary"
        >
          Full Funding Radar
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {!profile ? (
        <EmptyState
          variant="firstRun"
          title="Match funding to your business"
          description="Create your profile and we'll match opportunities to your sector, country and keywords."
          action={{ label: "Create your profile", to: "/directory/create" }}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((o) => (
            <OpportunityRow
              key={o.id}
              opportunity={o}
              saved={savedMap.has(o.id)}
              onToggleSave={() => toggle(o.id)}
              savePending={pending}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default MatchedOpportunities;
