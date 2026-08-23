import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { PageHeader } from "@shared/components/common/PageHeader";
import { SEO } from "@shared/components/common/SEO";
import { ErrorState } from "@shared/components/common/ErrorState";
import { EmptyState } from "@shared/components/common/EmptyState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { ResourceCard } from "@/components/resources/ResourceCard";
import {
  useResources,
  useFeaturedResources,
  useResourceTopics,
  RESOURCE_TYPE_FILTERS,
  type ResourceFilters,
} from "@/hooks/queries/resources";
import { cn } from "@shared/lib/utils";
import { authPathWithNext } from "@shared/lib/routes";
import { useAuth } from "@shared/hooks/useAuth";
import { ResourceAccessModal } from "@/components/resources/ResourceAccessModal";
import { ADVISORS_PLAYBOOK_SLUG } from "@/content/hardcodedResources";

const ALL_TOPICS = "__all__";

const TYPE_CHIPS = [{ value: "", label: "All" }, ...RESOURCE_TYPE_FILTERS];

const Resources = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type");
  const topic = searchParams.get("topic");
  const urlQ = searchParams.get("q") ?? "";

  // Local input mirrors the URL `q` but is debounced before it reaches the query.
  const [input, setInput] = useState(urlQ);
  const [debouncedQ, setDebouncedQ] = useState(urlQ);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || user || window.localStorage.getItem("cresciva-resource-welcome-seen")) return;
    const timer = window.setTimeout(() => setWelcomeOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [authLoading, user]);

  const closeWelcome = (open: boolean) => {
    setWelcomeOpen(open);
    if (!open) window.localStorage.setItem("cresciva-resource-welcome-seen", "1");
  };

  useEffect(() => {
    setInput(urlQ);
    setDebouncedQ(urlQ);
  }, [urlQ]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(input);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (input) next.set("q", input);
          else next.delete("q");
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const filters: ResourceFilters = useMemo(
    () => ({ q: debouncedQ, type, topic }),
    [debouncedQ, type, topic],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useResources(filters);

  const topicsQuery = useResourceTopics();
  const featuredQuery = useFeaturedResources(3);

  const rows = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);
  const count = data?.pages[0]?.count ?? 0;
  const hasFilters = !!type || !!topic || debouncedQ.trim().length > 0;

  // Featured strip only when browsing unfiltered.
  const featured = !hasFilters ? featuredQuery.data ?? [] : [];

  const setParam = (key: string, value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: false },
    );
  };

  const clearFilters = () => {
    setInput("");
    setSearchParams({}, { replace: false });
  };

  // Infinite-scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const statusLine = isLoading
    ? "Loading resources…"
    : `${count.toLocaleString()} ${count === 1 ? "resource" : "resources"}`;

  return (
    <>
      <SEO
        title="Resource Library"
        description="Free templates, playbooks and guides to help African SMEs get funded and grow."
      />

      {/* Navy hero */}
      <section className="bg-navy px-6 py-14 md:py-16">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            onDark
            title="Resource Library"
            subtitle="Free templates, playbooks and guides to help you grow."
          />
          <div className="relative mt-8 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Search resources"
              placeholder="Search templates, guides, playbooks…"
              className="h-12 bg-card pl-12 text-foreground"
            />
          </div>
        </div>
      </section>

      <ResourceAccessModal open={welcomeOpen} onOpenChange={closeWelcome} title="The Advisor's Playbook" onSignIn={() => navigate(`/auth?next=/resources/${ADVISORS_PLAYBOOK_SLUG}`)} onCreateAccount={() => navigate(`/auth/signup?next=/resources/${ADVISORS_PLAYBOOK_SLUG}`)} />

      <section className="mx-auto max-w-6xl px-6 py-10">
        {/* Type chips + topic filter */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
            role="group"
            aria-label="Filter by resource type"
          >
            {TYPE_CHIPS.map((chip) => {
              const active = (type ?? "") === chip.value;
              return (
                <button
                  key={chip.value || "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setParam("type", chip.value || null)}
                  className={cn(
                    "min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "border-transparent bg-navy text-white"
                      : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary-dark",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {(topicsQuery.data?.length ?? 0) > 0 && (
            <div className="w-full sm:w-64">
              <label htmlFor="topic-filter" className="sr-only">
                Filter by topic
              </label>
              <Select
                value={topic ?? ALL_TOPICS}
                onValueChange={(v) =>
                  setParam("topic", v === ALL_TOPICS ? null : v)
                }
              >
                <SelectTrigger id="topic-filter" className="h-11">
                  <SelectValue placeholder="All topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TOPICS}>All topics</SelectItem>
                  {topicsQuery.data?.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Featured strip */}
        {featured.length > 0 && !isLoading && (
          <div className="mb-12">
            <h2 className="mb-4 font-display text-xl font-bold text-ink-strong">
              Featured
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((r) => (
                <ResourceCard key={r.id} resource={r} featured />
              ))}
            </div>
          </div>
        )}

        <p
          className="mb-6 text-sm text-muted-foreground"
          aria-live="polite"
          role="status"
        >
          {statusLine}
        </p>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} media lines={3} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load resources"
            message="Something went wrong fetching the library. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : count === 0 ? (
          <EmptyState
            variant="search"
            title={hasFilters ? "No resources match" : "Sign in to view more"}
            description={
              hasFilters
                ? "Try a different search or clear the filters to see everything."
                : "Sign in to access more resources, guides and playbooks for growing your business."
            }
            action={
              hasFilters
                ? { label: "Clear filters", onClick: clearFilters }
                : { label: "Sign in", to: authPathWithNext(location) }
            }
          />
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
              {isFetchingNextPage &&
                Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={`s-${i}`} media lines={3} />
                ))}
            </div>

            <div ref={sentinelRef} aria-hidden className="h-px" />
            {hasNextPage && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
};

export default Resources;
