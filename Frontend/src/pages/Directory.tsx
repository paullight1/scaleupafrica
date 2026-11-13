import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { authPathWithNext } from "@shared/lib/routes";
import {
  useDirectorySearch,
  useDirectoryFacets,
  PAGE_SIZE,
  type DirectoryFilters,
} from "@/hooks/queries/directory";
import { DirectoryCard } from "@/components/directory/DirectoryCard";
import { DirectoryFilters as FilterChips } from "@/components/directory/DirectoryFilters";
import { SEO } from "@shared/components/common/SEO";
import { breadcrumbLd, collectionPageLd, itemListLd } from "@shared/lib/structuredData";
import { ErrorState } from "@shared/components/common/ErrorState";
import { EmptyState } from "@shared/components/common/EmptyState";
import { CardSkeleton } from "@shared/components/common/LoadingState";

const Directory = () => {
  const { user } = useAuth();
  const createHref = user
    ? "/dashboard/profile/edit"
    : authPathWithNext({ pathname: "/dashboard/profile/edit", search: "" });

  const [searchParams, setSearchParams] = useSearchParams();
  const country = searchParams.get("country");
  const sector = searchParams.get("sector");
  const urlQ = searchParams.get("q") ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

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
          if (input !== urlQ) next.delete("page");
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const filters: DirectoryFilters = useMemo(
    () => ({ q: debouncedQ, country, sector, page }),
    [debouncedQ, country, sector, page],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useDirectorySearch(filters);

  const facetsQuery = useDirectoryFacets();

  const firstPage = data?.pages[0];
  const rows = useMemo(() => {
    const shuffled = [...(firstPage?.rows ?? [])];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [firstPage?.rows]);
  const count = firstPage?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const hasFilters = !!country || !!sector || debouncedQ.trim().length > 0;

  const setFacet = (key: "country" | "sector") => (value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete("page");
        return next;
      },
      { replace: false },
    );
  };

  const clearFilters = () => {
    setInput("");
    setSearchParams({}, { replace: false });
  };

  const clearFacetFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("country");
        next.delete("sector");
        next.delete("page");
        return next;
      },
      { replace: false },
    );
  };

  useEffect(() => {
    if (count > 0 && page > totalPages) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("page", String(totalPages));
          return next;
        },
        { replace: true },
      );
    }
  }, [count, page, setSearchParams, totalPages]);

  const goToPage = (nextPage: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextPage === 1) next.delete("page");
        else next.set("page", String(nextPage));
        return next;
      },
      { replace: false },
    );
  };

  const directoryDescription =
    "Discover African businesses, suppliers and partners in Cresciva's searchable Pan-African SME directory.";
  const directoryJsonLd = [
    collectionPageLd({
      name: "Pan-African SME Directory",
      description: directoryDescription,
      url: "/directory",
    }),
    breadcrumbLd([
      { name: "Home", url: "/" },
      { name: "SME Directory", url: "/directory" },
    ]),
    ...(rows.length > 0
      ? [itemListLd(rows.map((profile) => ({ name: profile.business_name, url: `/directory/${profile.slug}` })))]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="African SME Directory | Find Pan-African Businesses"
        description={directoryDescription}
        canonical="/directory"
        noindex={Boolean(urlQ || country || sector || page > 1)}
        jsonLd={directoryJsonLd}
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
                className="h-12 bg-card pl-12 pr-24 text-foreground"
              />
              {(facetsQuery.data?.countries.length || facetsQuery.data?.sectors.length) ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <FilterChips
                    countries={facetsQuery.data?.countries ?? []}
                    sectors={facetsQuery.data?.sectors ?? []}
                    selectedCountry={country}
                    selectedSector={sector}
                    onCountry={setFacet("country")}
                    onSector={setFacet("sector")}
                    onClear={clearFacetFilters}
                  />
                </div>
              ) : null}
            </div>
            <Button asChild variant="default" size="lg" className="w-full sm:w-auto">
              <Link to={createHref}>{user ? "Manage my profile" : "Create a profile"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
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
            </div>

            {totalPages > 1 && (
              <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Directory pages">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNumber)}
                    aria-current={pageNumber === page ? "page" : undefined}
                    aria-label={`Page ${pageNumber}`}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Directory;
