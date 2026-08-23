import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { trackEvent } from "@shared/lib/analytics";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { OpportunityCardSkeletonList } from "@/components/funding/OpportunityCardSkeleton";
import { FundingIssueReport } from "@/components/funding/FundingIssueReport";
import { FundingSearch } from "@/components/funding/FundingSearch";
import { BusinessEnrichmentPanel } from "@/components/funding/BusinessEnrichmentPanel";
import { FundingRadarTabs, type FundingRadarTabItem } from "@/components/funding/FundingRadarTabs";
import { FundingProfilePrompt } from "@/components/funding/FundingProfilePrompt";
import { FundingNotificationPreferences } from "@/components/funding/FundingNotificationPreferences";
import { useFundingFeed, useFundingProfile, type FeedItem } from "@/hooks/queries/funding";
import { useConfirmedBusinessIdentity } from "@/hooks/queries/businessEnrichment";
import {
  useMemberOpportunityStates,
  useSetMemberOpportunityState,
  type MemberOpportunityState,
  type MemberOpportunityStateName,
} from "@/hooks/queries/memberOpportunityState";
import {
  recommendOpportunity,
  type RecommendationProfile,
  type RecommendationResult,
} from "@/lib/funding/recommendationEngine";
import {
  classifyFundingSurface,
  type FundingSurface,
  type PrimaryFundingGateInput,
} from "@/lib/funding/primaryFundingGate";
import { Bell, Telescope } from "lucide-react";

function matches(item: FeedItem, q: string): boolean {
  if (!q) return true;
  return [item.title ?? "", item.funder ?? "", item.summary ?? "", ...(item.tags ?? [])]
    .join(" ")
    .toLowerCase()
    .includes(q.toLowerCase());
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((v) => v.trim()).filter(Boolean) : [];
}

function validYear(value: unknown): number | null {
  const year = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(year) && year >= 1800 && year <= new Date().getUTCFullYear() ? year : null;
}

type FeedRecommendation = RecommendationResult<FeedItem>;
type EvaluatedItem = {
  item: FeedItem;
  recommendation: FeedRecommendation;
  gate: PrimaryFundingGateInput;
  surfaces: FundingSurface[];
};

function toRecommendationInput(item: FeedItem) {
  return {
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
  };
}

function surfaceDescription(surface: FundingSurface): string {
  switch (surface) {
    case "open_for_you": return "Verified, current opportunities where your known eligibility passes the primary gate.";
    case "closing_soon": return "Your verified eligible opportunities with source-confirmed deadlines within 14 days.";
    case "watchlist": return "Verified opportunities worth watching because they are upcoming, paused, stale, unknown, or need more eligibility details.";
    case "explore": return "Other verified records plus clearly separated AI discoveries. Explore never promotes these into Apply now.";
  }
}

function sortSurface(a: EvaluatedItem, b: EvaluatedItem): number {
  if (b.recommendation.matchScore !== a.recommendation.matchScore) return b.recommendation.matchScore - a.recommendation.matchScore;
  if (b.recommendation.confidenceScore !== a.recommendation.confidenceScore) return b.recommendation.confidenceScore - a.recommendation.confidenceScore;
  return Number(Boolean(b.item.featured)) - Number(Boolean(a.item.featured));
}

export function FundingWorkspace() {
  const feed = useFundingFeed();
  const profileQuery = useFundingProfile();
  const identityQuery = useConfirmedBusinessIdentity();
  const memberStateQuery = useMemberOpportunityStates();
  const setMemberState = useSetMemberOpportunityState();
  const impressionKeys = useRef(new Set<string>());
  const [filter, setFilter] = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [showDeepSearch, setShowDeepSearch] = useState(false);
  const [surface, setSurface] = useState<FundingSurface>("open_for_you");

  const items = useMemo(() => feed.data ?? [], [feed.data]);
  const profile = profileQuery.data ?? null;
  const identity = identityQuery.data ?? null;

  const effectiveProfile = useMemo<RecommendationProfile | null>(() => {
    if (!profile && !identity) return null;
    const enriched = identity?.enrichedProfile ?? {};
    const enrichedCountries = stringArray(enriched.operating_countries);
    const enrichedSectors = stringArray(enriched.sectors);
    const enrichedKeywords = stringArray(enriched.keywords);
    const enrichedOrganisationType = typeof enriched.organisation_type === "string" && enriched.organisation_type.trim() ? enriched.organisation_type.trim() : null;
    const enrichedFoundingYear = validYear(enriched.founding_year);
    return {
      country: profile?.country || identity?.country || enrichedCountries[0] || null,
      operatingCountries: profile?.operating_countries?.length ? profile.operating_countries : enrichedCountries,
      organisationType: profile?.organisation_type || enrichedOrganisationType,
      foundingYear: profile?.founding_year ?? enrichedFoundingYear,
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

  const evaluated = useMemo<EvaluatedItem[]>(() => {
    if (!effectiveProfile) return [];
    return items.map((item) => {
      const raw = recommendOpportunity(effectiveProfile, toRecommendationInput(item));
      const recommendation: FeedRecommendation = { ...raw, opportunity: item };
      const gate: PrimaryFundingGateInput = {
        verificationStatus: item.verificationStatus,
        applicationStatus: recommendation.applicationStatus,
        eligibilityStatus: recommendation.eligibilityStatus,
        statusFresh: recommendation.applicationStatusFresh,
        discoverySource: item.discovery_source === "ai_assisted" ? "ai_assisted" : "verified_feed",
      };
      return { item, recommendation, gate, surfaces: classifyFundingSurface(gate) };
    });
  }, [effectiveProfile, items]);

  const tabItems = useMemo<FundingRadarTabItem[]>(() => evaluated.map(({ item, gate }) => ({ id: item.id, gate })), [evaluated]);
  const memberStateByOpportunity = useMemo(() => {
    const map = new Map<string, MemberOpportunityState>();
    for (const row of memberStateQuery.data ?? []) map.set(row.opportunityId, row);
    return map;
  }, [memberStateQuery.data]);
  const surfaceItems = useMemo(() => evaluated.filter((entry) => entry.surfaces.includes(surface)).sort(sortSurface), [evaluated, surface]);
  const filtered = useMemo(() => surfaceItems.filter(({ item }) => matches(item, filter)), [surfaceItems, filter]);

  useEffect(() => {
    for (const { item, recommendation } of filtered) {
      const key = `${surface}:${item.id}`;
      if (impressionKeys.current.has(key)) continue;
      impressionKeys.current.add(key);
      void trackEvent("recommendation_impression", {
        entityType: "funding_opportunity",
        entityId: item.id,
        metadata: {
          surface,
          match_score: recommendation.matchScore,
          confidence_score: recommendation.confidenceScore,
          verification_status: item.verificationStatus,
          application_status: recommendation.applicationStatus,
          eligibility_status: recommendation.eligibilityStatus,
          primary_apply_eligible: recommendation.primaryApplyEligible,
        },
      });
    }
  }, [filtered, surface]);

  const toggle = (key: string) => setOpenKeys((previous) => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const setWorkflowState = (opportunityId: string, state: MemberOpportunityStateName) => setMemberState.mutate({ opportunityId, state });

  if (feed.isPending || memberStateQuery.isPending) return <OpportunityCardSkeletonList count={4} />;
  if (feed.isError) return <ErrorState title="We couldn't load the funding feed" message="This is a connection problem. Your membership is unaffected — please retry." onRetry={() => feed.refetch()} />;
  if (memberStateQuery.isError) return <ErrorState title="We couldn't load your funding workflow" message="Your opportunity data is still intact. Retry before changing saved/application states." onRetry={() => memberStateQuery.refetch()} />;

  const enrichmentPrompt = !identityQuery.isPending && !identity ? <BusinessEnrichmentPanel initialBusinessName={profile?.business_name} /> : null;
  if (!effectiveProfile) {
    return <div className="space-y-6">{enrichmentPrompt}<div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Confirm your organisation or enter your business details before Cresciva assigns eligibility-based funding recommendations.</div><FundingSearch /></div>;
  }

  return (
    <div className="space-y-8">
      {enrichmentPrompt}
      <FundingRadarTabs items={tabItems} active={surface} onChange={setSurface} />
      <FundingProfilePrompt profile={effectiveProfile} />

      <details className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-medium text-ink-strong"><Bell className="h-4 w-4 text-primary-dark" aria-hidden="true" />Funding alerts</summary>
        <div className="mt-4"><FundingNotificationPreferences /></div>
      </details>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-strong">{surface === "open_for_you" ? "Open for you" : surface === "closing_soon" ? "Closing soon" : surface === "watchlist" ? "Watchlist" : "Explore"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{surfaceDescription(surface)}</p>
          </div>
          <Button variant="outline" onClick={() => setShowDeepSearch((value) => !value)} aria-expanded={showDeepSearch}><Telescope className="mr-2 h-4 w-4" aria-hidden="true" />{showDeepSearch ? "Hide opportunity search" : "Opportunity search"}</Button>
        </div>
        <div className="mt-4 w-full sm:max-w-sm"><label htmlFor="funding-feed-filter" className="sr-only">Filter this Funding Radar view</label><Input id="funding-feed-filter" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter by keyword, funder or tag…" className="h-11" /></div>
      </div>

      {showDeepSearch ? <div className="rounded-xl border border-border bg-surface-subtle p-6"><h2 className="mb-1 font-display text-lg font-semibold text-ink-strong">Opportunity search</h2><p className="mb-5 text-sm text-muted-foreground">Search verified Cresciva records first, then separately labelled AI discoveries. AI results cannot enter the primary paid Apply experience until authoritative verification succeeds.</p><FundingSearch /></div> : null}

      <div aria-live="polite" className="sr-only">{filtered.length} opportunities shown.</div>

      {surfaceItems.length === 0 && surface === "open_for_you" ? (
        <EmptyState variant="search" title="You’re not currently eligible for any verified open opportunities." description="We’ll keep checking verified sources. Review Watchlist for upcoming programs or missing profile details." action={{ label: "Review Watchlist", onClick: () => setSurface("watchlist") }} />
      ) : surfaceItems.length === 0 ? (
        <EmptyState variant="search" title={surface === "closing_soon" ? "Nothing is closing soon for you right now" : surface === "watchlist" ? "Your Watchlist is clear" : "Nothing else to explore right now"} description={surface === "closing_soon" ? "This view only contains verified eligible opportunities whose confirmed deadline is within 14 days." : surface === "watchlist" ? "Upcoming, uncertain, stale, paused and eligibility-incomplete verified opportunities will appear here." : "Try Opportunity search for a niche request; AI discoveries will remain clearly separated and unverified."} />
      ) : filtered.length === 0 ? (
        <EmptyState variant="search" title="No opportunities match that filter" description="Clear the filter to see the full view." />
      ) : (
        <div className="grid gap-6">
          {filtered.map(({ item, recommendation }) => {
            const memberState = memberStateByOpportunity.get(item.id);
            return (
              <div key={item.id}>
                <OpportunityCard
                  opportunity={item}
                  opportunityId={item.id}
                  open={openKeys.has(item.id)}
                  onToggle={() => toggle(item.id)}
                  lastVerifiedAt={item.lastVerifiedAt}
                  verificationStatus={item.verificationStatus}
                  applicationStatus={recommendation.applicationStatus}
                  statusCheckedAt={item.statusCheckedAt}
                  applicationUrl={item.applicationUrl}
                  deadlineAt={item.deadlineAt}
                  deadlineStatus={item.deadlineStatus}
                  primaryApplyEligible={recommendation.primaryApplyEligible}
                  matchScore={recommendation.matchScore}
                  confidenceScore={recommendation.confidenceScore}
                  matchReasons={recommendation.reasons}
                  eligibilityStatus={recommendation.eligibilityStatus}
                  eligibilityBlockers={recommendation.blockers}
                  missingInformation={recommendation.missingInformation}
                  memberState={memberState?.state ?? null}
                  onMemberStateChange={(state) => setWorkflowState(item.id, state)}
                  memberStatePending={setMemberState.isPending}
                />
                <FundingIssueReport opportunityId={item.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FundingWorkspace;
