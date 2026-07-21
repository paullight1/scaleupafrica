import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authPathWithNext } from "@/lib/routes";
import {
  useDirectorySearch,
  useDirectoryFacets,
  type DirectoryFilters,
} from "@/hooks/queries/directory";
import { DirectoryCard } from "@/components/directory/DirectoryCard";
import { DirectoryFilters as FilterChips } from "@/components/directory/DirectoryFilters";
import { SEO } from "@/components/common/SEO";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { CardSkeleton } from "@/components/common/LoadingState";

const Directory = () => {
  const { user } = useAuth();
  const createHref = user
    ? "/directory/create"
    : authPathWithNext({ pathname: "/directory/create", search: "" });

  const [searchParams, setSearchParams] = useSearchParams();
  const country = searchParams.get("country");
  const sector = searchParams.get("sector");
  const urlQ = searchParams.get("q") ?? "";

  // Local input mirrors the URL `q` but is debounced before it reaches the query.
  const [input, setInput] = useState(urlQ);
  const [debouncedQ, setDebouncedQ] = useState(urlQ);

  // Keep the input in sync when the URL changes externally (back button, chip clears).
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

  const filters: DirectoryFilters = useMemo(
    () => ({ q: debouncedQ, country, sector }),
    [debouncedQ, country, sector],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDirectorySearch(filters);

  const facetsQuery = useDirectoryFacets();

  const rows = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);
  const count = data?.pages[0]?.count ?? 0;
  const hasFilters = !!country || !!sector || debouncedQ.trim().length > 0;

  const setFacet = (key: "country" | "sector") => (value: string | null) => {
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
    ? "Loading the directory…"
    : `${count.toLocaleString()} ${count === 1 ? "business" : "businesses"}`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="SME Directory"
        description="A public, searchable directory of African founders and their businesses. Find suppliers, discover partners, and connect for cross-border trade."
      />

      <header className="bg-navy px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-3 font-display text-4xl font-bold text-white md:text-5xl">
            The Pan-African <span className="text-primary">SME Directory</span>
          </h1>
          <p className="mb-8 max-w-2xl text-white/80">
            A public, searchable directory of African founders and their businesses. Find
            suppliers, discover partners, and connect for cross-border trade.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Search the directory"
                placeholder="Search by name, sector, keyword…"
                className="h-12 bg-card pl-12 text-foreground"
              />
            </div>
            <Button asChild variant="default" size="lg" className="w-full sm:w-auto">
              <Link to={createHref}>{user ? "Manage my profile" : "Create a profile"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {/* Filter chips */}
        {(facetsQuery.data?.countries.length || facetsQuery.data?.sectors.length) ? (
          <div className="mb-8">
            <FilterChips
              countries={facetsQuery.data?.countries ?? []}
              sectors={facetsQuery.data?.sectors ?? []}
              selectedCountry={country}
              selectedSector={sector}
              onCountry={setFacet("country")}
              onSector={setFacet("sector")}
            />
          </div>
        ) : null}

        <p className="mb-6 text-sm text-muted-foreground" aria-live="polite" role="status">
          {statusLine}
        </p>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} lines={3} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load the directory"
            message="Something went wrong fetching businesses. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : count === 0 && hasFilters ? (
          <EmptyState
            variant="search"
            title="No businesses match"
            description="Try a different search or clear the filters to see everyone."
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        ) : count === 0 ? (
          <EmptyState
            variant="firstRun"
            title="No profiles yet"
            description="Be the first to list your business in the pan-African directory."
            action={{ label: "Create the first profile", to: createHref }}
          />
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((p) => (
                <DirectoryCard key={p.id} profile={p} />
              ))}
              {isFetchingNextPage &&
                Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={`s-${i}`} lines={3} />)}
            </div>

            {/* Sentinel + reduced-JS/keyboard fallback */}
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
    </div>
  );
};

export default Directory;
