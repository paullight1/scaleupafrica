import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@shared/components/common/EmptyState";
import { recommendFundingOpportunities } from "@/lib/dashboard/matchOpportunities";
import { DASHBOARD_FUNDING, DASHBOARD_PROFILE_EDIT } from "@/lib/dashboard/routes";
import type { FundingOpportunity, Profile } from "@/lib/dashboard/types";
import { OpportunityRow } from "./OpportunityRow";
import { useSavedMap } from "./useSavedMap";

interface MatchedOpportunitiesProps {
  profile: Profile | null;
  feed: FundingOpportunity[];
}

/**
 * Pillar A "Matched to your business". Recommendation V2 applies conservative
 * geography eligibility, normalized fit and confidence scoring. When there is no
 * usable match it falls back to the newest feed rather than pretending generic
 * opportunities are personalized.
 */
export function MatchedOpportunities({ profile, feed }: MatchedOpportunitiesProps) {
  const { savedMap, toggle, pending } = useSavedMap();

  const matched = recommendFundingOpportunities(profile, feed);
  const hasMatches = matched.length > 0;
  const heading = hasMatches ? "Matched to your business" : "Newest opportunities";

  return (
    <section aria-labelledby="matched-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="matched-heading" className="font-display text-xl font-semibold text-ink-strong">
            {heading}
          </h2>
          {hasMatches && (
            <p className="mt-1 text-sm text-muted-foreground">
              Ranked from your country, sector, keywords and business description.
            </p>
          )}
        </div>
        <Link
          to={DASHBOARD_FUNDING}
          className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-navy-light dark:text-primary"
        >
          All opportunities
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {!profile ? (
        <EmptyState
          variant="firstRun"
          title="Match funding to your business"
          description="Create your profile and we'll match opportunities to your sector, country, keywords and business description."
          action={{ label: "Create your profile", to: DASHBOARD_PROFILE_EDIT }}
        />
      ) : (
        <div className="space-y-3">
          {hasMatches
            ? matched.slice(0, 5).map((recommendation) => {
                const o = recommendation.opportunity;
                return (
                  <OpportunityRow
                    key={o.id}
                    opportunity={o}
                    saved={savedMap.has(o.id)}
                    onToggleSave={() => toggle(o.id)}
                    savePending={pending}
                    matchScore={recommendation.matchScore}
                    confidenceScore={recommendation.confidenceScore}
                    matchReasons={recommendation.reasons}
                  />
                );
              })
            : feed.slice(0, 5).map((o) => (
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
