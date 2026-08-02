import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
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
import type { Opportunity } from "@/lib/fundingSchema";
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

  // Progress ticker so we can switch copy at 45s.
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
    if (generate.isPending) return; // double-submit guard (UI side)
    lastKeywords.current = raw;
    setOpenKeys(new Set());
    generate.mutate(raw);
  };

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const opps = result?.opportunities ?? [];
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
          Describe your business or the funding you're looking for
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id={inputId}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch(keywords)}
            placeholder="e.g. agritech Nigeria climate grant fellowship"
            maxLength={200}
            className="h-12"
          />
          <Button size="lg" onClick={() => runSearch(keywords)} disabled={generate.isPending}>
            {generate.isPending ? (
              "Curating…"
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" aria-hidden="true" /> Find opportunities
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested keywords">
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

      {/* Progress + live status */}
      <div aria-live="polite" className="min-h-[1.25rem] text-sm text-muted-foreground">
        {generate.isPending ? (
          elapsed >= 45 ? (
            <span>Still working — thanks for your patience.</span>
          ) : (
            <span>
              <strong className="text-ink-strong">This takes about a minute</strong> — we're checking dozens of
              funders.
            </span>
          )
        ) : opps.length > 0 && !generate.isError ? (
          <span>{opps.length} opportunities found.</span>
        ) : null}
      </div>

      {/* Results area */}
      {generate.isPending ? (
        <OpportunityCardSkeletonList count={3} />
      ) : generate.isError ? (
        <ErrorState
          title="We couldn't complete that search"
          message={errorMessage}
          onRetry={() => runSearch(lastKeywords.current || keywords)}
        />
      ) : opps.length > 0 ? (
        <div className="space-y-4">
          {result?.generatedAt && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>Results saved {relativeTime(result.generatedAt)} · cached for 7 days</span>
              <Button variant="outline" size="sm" onClick={() => runSearch(keywords || result.keywordsRaw)}>
                Search again
              </Button>
            </div>
          )}
          <div className="grid gap-6">
            {opps.map((o) => {
              const k = keyOf(o);
              return <OpportunityCard key={k} opportunity={o} open={openKeys.has(k)} onToggle={() => toggle(k)} />;
            })}
          </div>
        </div>
      ) : result ? (
        <EmptyState
          variant="search"
          title="No matches for those keywords"
          description="Try broader terms, or tap one of the suggestions above."
        />
      ) : (
        <EmptyState
          variant="search"
          title="Search for funding"
          description="Enter keywords or tap a suggestion, then press Find opportunities to generate a curated list."
        />
      )}
    </div>
  );
}

export default FundingSearch;
