import { useMemo, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { OpportunityCardSkeletonList } from "@/components/funding/OpportunityCardSkeleton";
import { FundingSearch } from "@/components/funding/FundingSearch";
import { BusinessEnrichmentPanel } from "@/components/funding/BusinessEnrichmentPanel";
import { useFundingFeed, useFundingProfile, type FeedItem } from "@/hooks/queries/funding";
import { useConfirmedBusinessIdentity } from "@/hooks/queries/businessEnrichment";
import {
  rankRecommendations,
  type RecommendationProfile,
  type RecommendationResult,
} from "@/lib/funding/recommendationEngine";
import { Telescope } from "lucide-react";

function matches(item: FeedItem, q: string): boolean {
  if (!q) return true;
  return [item.title ?? "", item.funder ?? "", item.summary ?? "", ...(item.tags ?? [])]
    .join(" ")
    .toLowerCase()
    .includes(q.toLowerCase());
}

type FeedRecommendation = RecommendationResult<FeedItem>;

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((v) => v.trim()).filter(Boolean) : [];
}

export function FundingWorkspace() {
  const feed = useFundingFeed();
  const profileQuery = useFundingProfile();
  const identityQuery = useConfirmedBusinessIdentity();
  const [filter, setFilter] = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [showDeepSearch, setShowDeepSearch] = useState(false);

  const items = useMemo(() => feed.data ?? [], [feed.data]);
  const profile = profileQuery.data ?? null;
  const identity = identityQuery.data ?? null;

  const effectiveProfile = useMemo<RecommendationProfile | null>(() => {
    if (!profile && !identity) return null;
    const enriched = identity?.enrichedProfile ?? {};
    const enrichedCountries = stringArray(enriched.operating_countries);
    const enrichedSectors = stringArray(enriched.sectors);
    const enrichedKeywords = stringArray(enriched.keywords);
    return {
      country: profile?.country || identity?.country || enrichedCountries[0] || null,
      sector: profile?.sector || enrichedSectors[0] || null,
      keywords: profile?.keywords?.length ? profile.keywords : enrichedKeywords,
      shortDescription: profile?.short_description || identity?.summary || null,
      longDescription: profile?.long_description ?? null,
      businessStage: profile?.business_stage ?? null,
      preferredFundingTypes: profile?.preferred_funding_types ?? [],
      fundingTargetUsd: profile?.funding_target_usd ?? null,
      applicationReadiness: profile?.application_readiness ?? null,
    };
  }, [identity, profile]);

  const recommendations = useMemo<FeedRecommendation[]>(() => {
    if (!effectiveProfile) return [];
    const itemById = new Map(items.map((item) => [item.id, item]));
    const candidates = items.map((item) => ({
      id: item.id,
      title: item.title ?? "",
      funder: item.funder ?? "",
      type: item.type ?? null,
      summary: item.summary ?? "",
      eligibility: item.eligibility ?? "",
      url: item.url ?? null,
      deadline: item.deadline ?? "",
      tags: item.tags ?? [],
      countryFocus: item.countryFocus,
      featured: item.featured,
      lastVerifiedAt: item.lastVerifiedAt,
      sourceUrl: item.sourceUrl,
      verificationStatus: item.verificationStatus,
      applicationStatus: item.applicationStatus,
      statusCheckedAt: item.statusCheckedAt,
      statusEvidenceUrl: item.statusEvidenceUrl,
      opensAt: item.opensAt,
      deadlineAt: item.deadlineAt,
      deadlineTimezone: item.deadlineTimezone,
      deadlineStatus: item.deadlineStatus,
      currentCycleLabel: item.currentCycleLabel,
      applicationUrl: item.applicationUrl,
      details: item.details,
    }));
    return rankRecommendations(effectiveProfile, candidates).flatMap((result) => {
      const original = result.opportunity.id ? itemById.get(result.opportunity.id) : undefined;
      return original ? [{ ...result, opportunity: original }] : [];
    });
  }, [effectiveProfile, items]);

  const recommendationById = useMemo(
    () => new Map(recommendations.map((recommendation) => [recommendation.opportunity.id, recommendation])),
    [recommendations],
  );

  const rankedItems = useMemo<FeedItem[]>(() => {
    if (recommendations.length === 0) return items;
    const matchedIds = new Set(recommendations.map((recommendation) => recommendation.opportunity.id));
    return [...recommendations.map((recommendation) => recommendation.opportunity), ...items.filter((item) => !matchedIds.has(item.id))];
  }, [items, recommendations]);

  const filtered = useMemo(() => rankedItems.filter((item) => matches(item, filter)), [rankedItems, filter]);

  const toggle = (key: string) => setOpenKeys((previous) => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  if (feed.isPending) return <OpportunityCardSkeletonList count={4} />;
  if (feed.isError) return <ErrorState title="We couldn't load the funding feed" message="This is a connection problem. Your membership is unaffected — please retry." onRetry={() => feed.refetch()} />;

  const enrichmentPrompt = !identityQuery.isPending && !identity ? <BusinessEnrichmentPanel initialBusinessName={profile?.business_name} /> : null;

  if (items.length === 0) return <div className="space-y-6">{enrichmentPrompt}<FundingSearch /></div>;

  return (
    <div className="space-y-8">
      {enrichmentPrompt}
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <label htmlFor="funding-feed-filter" className="sr-only">Filter the funding feed</label>
            <Input id="funding-feed-filter" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter by keyword, funder or tag…" className="h-11" />
          </div>
          <Button variant="outline" onClick={() => setShowDeepSearch((value) => !value)} aria-expanded={showDeepSearch}>
            <Telescope className="mr-2 h-4 w-4" aria-hidden="true" />{showDeepSearch ? "Hide opportunity search" : "Opportunity search"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {recommendations.length > 0
            ? "Best matches are ranked using your confirmed organisation evidence plus your funding-profile details. Current-cycle status is checked separately and never changes the underlying fit score."
            : effectiveProfile
              ? "Add more funding-profile details to improve eligibility and personalized ranking."
              : "Confirm your organisation or complete your business profile to personalize this feed."}
        </p>
      </div>

      {showDeepSearch ? <div className="rounded-xl border border-border bg-surface-subtle p-6"><h2 className="mb-1 font-display text-lg font-semibold text-ink-strong">Opportunity search</h2><p className="mb-5 text-sm text-muted-foreground">Search the verified Cresciva feed first, then use AI-assisted discovery for long-tail needs. AI discoveries stay unverified with unknown application status until authoritative evidence is checked.</p><FundingSearch /></div> : null}

      <div aria-live="polite" className="sr-only">{filtered.length} opportunities shown.</div>

      {filtered.length === 0 ? <EmptyState variant="search" title="No feed items match that filter" description="Clear the filter, or try Opportunity search for a niche request." /> : (
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
                applicationStatus={recommendation?.applicationStatus ?? item.applicationStatus}
                statusCheckedAt={item.statusCheckedAt}
                applicationUrl={item.applicationUrl}
                deadlineAt={item.deadlineAt}
                deadlineStatus={item.deadlineStatus}
                primaryApplyEligible={recommendation?.primaryApplyEligible ?? false}
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