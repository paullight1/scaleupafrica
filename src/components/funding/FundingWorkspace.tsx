import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { OpportunityCardSkeletonList } from "@/components/funding/OpportunityCardSkeleton";
import { FundingSearch } from "@/components/funding/FundingSearch";
import { useFundingFeed, type FeedItem } from "@/hooks/queries/funding";
import { Telescope } from "lucide-react";

function matches(item: FeedItem, q: string): boolean {
  if (!q) return true;
  const hay = [item.title, item.funder, item.summary, ...item.tags].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

/**
 * Active-member view. PRIMARY: the shared, weekly-verified feed (fast Postgres
 * read, admin spot-checked). SECONDARY: per-user AI deep search for the long tail.
 * When no feed batch has been published yet, we fall back to deep-search-first so
 * Phase A behaviour is preserved.
 */
export function FundingWorkspace() {
  const feed = useFundingFeed();
  const [filter, setFilter] = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [showDeepSearch, setShowDeepSearch] = useState(false);

  const items = feed.data ?? [];
  const filtered = useMemo(() => items.filter((i) => matches(i, filter)), [items, filter]);

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
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

  // No published batch yet → deep-search-first (Phase A fallback).
  if (items.length === 0) {
    return <FundingSearch />;
  }

  return (
    <div className="space-y-8">
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
          {showDeepSearch ? "Hide AI deep search" : "AI deep search"}
        </Button>
      </div>

      {showDeepSearch && (
        <div className="rounded-xl border border-border bg-surface-subtle p-6">
          <h2 className="mb-1 font-display text-lg font-semibold text-ink-strong">AI deep search</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            For niche needs not in the feed. Results are cached for 7 days, so repeats are free.
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
          description="Clear the filter, or try the AI deep search for niche opportunities."
        />
      ) : (
        <div className="grid gap-6">
          {filtered.map((item) => (
            <OpportunityCard
              key={item.id}
              opportunity={item}
              open={openKeys.has(item.id)}
              onToggle={() => toggle(item.id)}
              lastVerifiedAt={item.lastVerifiedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FundingWorkspace;
