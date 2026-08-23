import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { isStatusFresh } from "@shared/lib/fundingStatus";
import { trackEvent } from "@shared/lib/analytics";
import { OpportunityCard } from "@/components/funding/OpportunityCard";
import { OpportunityCardSkeletonList } from "@/components/funding/OpportunityCardSkeleton";
import {
  useFundingProfile,
  useFundingResult,
  useGenerateFunding,
  buildKeywordChips,
  fundingErrorMessage,
  FundingError,
} from "@/hooks/queries/funding";
import type { ApplicationStatus, Opportunity } from "@/lib/fundingSchema";
import { Search } from "lucide-react";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function keyOf(o: Opportunity) {
  return `${o.title}|${o.funder}`;
}

/**
 * Older cached searches predate trust metadata and were AI-generated. Treat them
 * conservatively as AI-assisted and current-status unknown rather than letting
 * missing/legacy metadata look authoritative.
 */
function withConservativeTrust(opportunity: Opportunity): Opportunity {
  if (opportunity.discovery_source) return opportunity;
  return {
    ...opportunity,
    discovery_source: "ai_assisted",
    verification_status: "unverified",
    source_checked_at: undefined,
    application_status: "unknown",
    status_checked_at: undefined,
    application_url: null,
    deadline_at: undefined,
    deadline_status: "unknown",
  };
}

function normalizedStatus(value: Opportunity["application_status"]): ApplicationStatus {
  return value === "open" || value === "closing_soon" || value === "rolling" || value === "upcoming" || value === "closed" || value === "paused"
    ? value
    : "unknown";
}

function isVerifiedCurrent(opportunity: Opportunity, now = new Date()): boolean {
  if (opportunity.discovery_source !== "verified_feed" || opportunity.verification_status !== "verified") return false;
  const status = normalizedStatus(opportunity.application_status);
  if (status !== "open" && status !== "closing_soon" && status !== "rolling") return false;
  return isStatusFresh(status, opportunity.status_checked_at, now);
}

function SearchGroup({
  title,
  description,
  opportunities,
  openKeys,
  toggle,
}: {
  title: string;
  description: string;
  opportunities: Opportunity[];
  openKeys: Set<string>;
  toggle: (key: string) => void;
}) {
  if (!opportunities.length) return null;
  return (
    <section className="space-y-4" aria-labelledby={`search-group-${title.replace(/\W+/g, "-").toLowerCase()}`}>
      <div>
        <h3 id={`search-group-${title.replace(/\W+/g, "-").toLowerCase()}`} className="font-display text-lg font-semibold text-ink-strong">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-6">
        {opportunities.map((opportunity) => {
          const key = keyOf(opportunity);
          return (
            <OpportunityCard
              key={key}
              opportunity={opportunity}
              open={openKeys.has(key)}
              onToggle={() => toggle(key)}
              lastVerifiedAt={opportunity.source_checked_at}
              verificationStatus={opportunity.verification_status}
              applicationStatus={normalizedStatus(opportunity.application_status)}
              statusCheckedAt={opportunity.status_checked_at}
              applicationUrl={opportunity.application_url}
              deadlineAt={opportunity.deadline_at}
              deadlineStatus={opportunity.deadline_status}
              primaryApplyEligible={false}
              matchReasons={opportunity.match_reasons}
            />
          );
        })}
      </div>
    </section>
  );
}

export function FundingSearch() {
  const inputId = useId();
  const [keywords, setKeywords] = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);

  const { data: profile } = useFundingProfile();
  const chips = useMemo(() => buildKeywordChips(profile), [profile]);

  const { data: result } = useFundingResult();
  const generate = useGenerateFunding();
  const lastKeywords = useRef("");
  const lastTrackedGeneration = useRef("");

  useEffect(() => {
    if (!generate.isPending) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [generate.isPending]);

  const runSearch = (raw: string) => {
    if (generate.isPending) return;
    lastKeywords.current = raw;
    setOpenKeys(new Set());
    generate.mutate(raw);
  };

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const opps = useMemo(
    () => (result?.opportunities ?? []).map(withConservativeTrust),
    [result?.opportunities],
  );

  const groups = useMemo(() => {
    const current: Opportunity[] = [];
    const verifiedWatchlist: Opportunity[] = [];
    const ai: Opportunity[] = [];
    const now = new Date();
    for (const opportunity of opps) {
      if (opportunity.discovery_source === "ai_assisted") {
        ai.push({
          ...opportunity,
          verification_status: "unverified",
          application_status: "unknown",
          status_checked_at: undefined,
          application_url: null,
        });
      } else if (isVerifiedCurrent(opportunity, now)) {
        current.push(opportunity);
      } else {
        verifiedWatchlist.push(opportunity);
      }
    }
    return { current, verifiedWatchlist, ai };
  }, [opps]);

  const verifiedCount = groups.current.length + groups.verifiedWatchlist.length;
  const aiCount = groups.ai.length;

  useEffect(() => {
    if (!generate.isSuccess || !result?.generatedAt) return;
    if (lastTrackedGeneration.current === result.generatedAt) return;
    lastTrackedGeneration.current = result.generatedAt;
    void trackEvent("funding_search", {
      entityType: "funding_search",
      metadata: {
        result_count: opps.length,
        verified_current_count: groups.current.length,
        verified_watchlist_count: groups.verifiedWatchlist.length,
        verified_count: verifiedCount,
        ai_count: aiCount,
        cached: result.cached,
      },
    });
  }, [aiCount, generate.isSuccess, groups.current.length, groups.verifiedWatchlist.length, opps.length, result?.cached, result?.generatedAt, verifiedCount]);

  const errorMessage =
    generate.error instanceof FundingError
      ? generate.error.message
      : generate.isError
        ? fundingErrorMessage("unknown")
        : "";

  return (
    <div className="space-y-8">
      <div>
        <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-ink-strong">
          What kind of opportunity are you looking for?
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id={inputId}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch(keywords)}
            placeholder="e.g. climate grant for Nigerian agritech expansion"
            maxLength={200}
            className="h-12"
          />
          <Button size="lg" onClick={() => runSearch(keywords)} disabled={generate.isPending}>
            {generate.isPending ? (
              "Searching…"
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" aria-hidden="true" /> Find opportunities
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested searches">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setKeywords(chip)}
              className="min-h-[44px] rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-secondary-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="min-h-[1.25rem] text-sm text-muted-foreground">
        {generate.isPending ? (
          elapsed >= 45 ? (
            <span>Still searching — verified matches will be shown even if AI discovery takes longer.</span>
          ) : (
            <span>
              <strong className="text-ink-strong">Matching your request</strong> against Cresciva's funding intelligence…
            </span>
          )
        ) : opps.length > 0 && !generate.isError ? (
          <span>
            {opps.length} {opps.length === 1 ? "result" : "results"} · {groups.current.length} verified current · {groups.verifiedWatchlist.length} verified watchlist · {aiCount} AI {aiCount === 1 ? "discovery" : "discoveries"}
          </span>
        ) : null}
      </div>

      {generate.isPending ? (
        <OpportunityCardSkeletonList count={3} />
      ) : generate.isError ? (
        <ErrorState
          title="We couldn't complete that search"
          message={errorMessage}
          onRetry={() => runSearch(lastKeywords.current || keywords)}
        />
      ) : opps.length > 0 ? (
        <div className="space-y-8">
          {result?.generatedAt && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                Results prepared {relativeTime(result.generatedAt)}
                {result.cached ? " · saved result" : ""}
              </span>
              <Button variant="outline" size="sm" onClick={() => runSearch(keywords || result.keywordsRaw)}>
                Search again
              </Button>
            </div>
          )}
          <SearchGroup
            title="Verified current matches"
            description="Source-verified Cresciva records with a fresh open, closing-soon or rolling current cycle. Search results remain exploratory until your eligibility profile is applied in Funding Radar."
            opportunities={groups.current}
            openKeys={openKeys}
            toggle={toggle}
          />
          <SearchGroup
            title="Other verified records"
            description="Curated Cresciva records that are upcoming, closed, stale, status-unknown or otherwise outside the verified-current search group."
            opportunities={groups.verifiedWatchlist}
            openKeys={openKeys}
            toggle={toggle}
          />
          <SearchGroup
            title="AI discoveries"
            description="Long-tail candidates discovered with AI. Cresciva has not verified these records or their current application cycle."
            opportunities={groups.ai}
            openKeys={openKeys}
            toggle={toggle}
          />
        </div>
      ) : result ? (
        <EmptyState
          variant="search"
          title="No reliable matches for that search"
          description="Try broader terms or one of the suggestions above. Cresciva will not pad the list with uncertain opportunities."
        />
      ) : (
        <EmptyState
          variant="search"
          title="Explore funding opportunities"
          description="Enter a request or tap a suggestion. Cresciva searches verified opportunities first and uses AI only for long-tail discovery."
        />
      )}
    </div>
  );
}

export default FundingSearch;
