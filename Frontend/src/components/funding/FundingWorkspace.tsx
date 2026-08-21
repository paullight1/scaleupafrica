import { useMemo, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { OpportunityCardSkeletonList } from "@/components/funding/OpportunityCardSkeleton";
import { FundingSearch } from "@/components/funding/FundingSearch";
import {
  useFundingFeed,
  useFundingProfile,
  type FeedItem,
} from "@/hooks/queries/funding";
import { rankRecommendations } from "@/lib/funding/recommendationEngine";
import { Telescope } from "lucide-react";

function matches(item: FeedItem, q: string): boolean {
  if (!q) return true;
  const hay = [item.title, item.funder, item.summary, ...item.tags].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

/**
 * Active-member view. PRIMARY: the shared verified feed ranked to the member's
 * profile when enough information exists. SECONDARY: explicit Deep Search for
 * niche needs. All feed items remain discoverable; recommendations are ordered
 * first rather than silently deleting unrelated opportunities from Explore.
 */
export function FundingWorkspace() {
  const feed = useFundingFeed();
  const profileQuery = useFundingProfile();
  const [filter, setFilter] = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [showDeepSearch, setShowDeepSearch] = useState(false);

  const items = useMemo(() => feed.data ?? [], [feed.data]);
  const profile = profileQuery.data ?? null;

  const recommendations = useMemo(() => {
    if (!profile) return [];
    return rankRecommendations(
      {
        country: profile.country,
        sector: profile.sector,
        keywords: profile.keywords,
        shortDescription: profile.short_description,
        longDescription: profile.long_description,
      },
      items,
    );
  }, [items, profile]);

  const recommendationById = useMemo(
    () => new Map(recommendations.map((recommendation) => [recommendation.opportunity.id, recommendation])),
    [recommendations],
  );

  const rankedItems = useMemo(() => {
    if (recommendations.length === 0) return items;
    const matchedIds = new Set(recommendations.map((recommendation) => recommendation.opportunity.id));
    return [
      ...recommendations.map((recommendation) => recommendation.opportunity),
      ...items.filter((item) => !matchedIds.has(item.id)),
    ];
  }, [items, recommendations]);

  const filtered = useMemo(
    () => rankedItems.filter((item) => matches(item, filter)),
    [rankedItems, filter],
  );

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (feed.isPending) {
    return <OpportunityCardSkeletonList count={4} />;
  }

  if (feed.isError) {
    return (
      <ErrorState
        title="We couldn't load the funding feed"
        message="This is a connection problem. Your membership is unaffected — please retry."
        onRetry={() => feed.refetch()}
      />
    );
  }

  if (items.length === 0) {
    return <FundingSearch />;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <label htmlFor="funding-feed-filter" className="sr-only">
              Filter the funding feed
            </label>
            <Input
              id="funding-feed-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by keyword, funder or tag…"
              className="h-11"
            />
          </div>
          <Button variant="outline" onClick={() => setShowDeepSearch((v) => !v)} aria-expanded={showDeepSearch}>
            <Telescope className="mr-2 h-4 w-4" aria-hidden="true" />
            {showDeepSearch ? "Hide opportunity search" : "Opportunity search"}
          </Button>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {recommendations.length > 0
            ? "Best profile matches are ranked first using your geography, sector, keywords and business description."
            : profile
              ? "Complete your sector, country, keywords or business description to improve personalized ranking."
              : "Create your business profile to rank this verified feed to your company."}
        </p>
      </div>

      {showDeepSearch && (
        <div className="rounded-xl border border-border bg-surface-subtle p-6">
          <h2 className="mb-1 font-display text-lg font-semibold text-ink-strong">Opportunity search</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Search the verified Cresciva feed first, then use AI-assisted discovery for long-tail needs. Results are cached for 7 days.
          </p>
          <FundingSearch />
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {filtered.length} opportunities shown.
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          variant="search"
          title="No feed items match that filter"
          description="Clear the filter, or try Opportunity search for a niche request."
        />
      ) : (
        <div className="grid gap-6">
          {filtered.map((item) => {
            const recommendation = recommendationById.get(item.id);
            return (
              <OpportunityCard
                key={item.id}
                opportunity={item}
                opportunityId={item.id}
                open={openKeys.has(item.id)}
                onToggle={() => toggle(item.id)}
                lastVerifiedAt={item.lastVerifiedAt}
                verificationStatus={item.verificationStatus}
                matchScore={recommendation?.matchScore}
                confidenceScore={recommendation?.confidenceScore}
                matchReasons={recommendation?.reasons}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FundingWorkspace;
