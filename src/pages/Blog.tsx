import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Search, Clock, ArrowRight } from "lucide-react";
import { SEO } from "@/components/common/SEO";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { CardSkeleton } from "@/components/common/LoadingState";
import { BlogCard } from "@/components/blog/BlogCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useBlogList,
  useBlogCategories,
  useFeaturedPost,
  type BlogFilters,
  type BlogCardRow,
} from "@/hooks/queries/blog";

/** Large hero card for the featured/most-recent post. */
function FeaturedHero({ post }: { post: BlogCardRow }) {
  const dateLabel = post.published_at
    ? format(new Date(post.published_at), "MMM d, yyyy")
    : null;

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group mb-12 grid overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all hover:border-primary/40 hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:grid-cols-2"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-surface-muted md:aspect-auto md:h-full">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-navy font-display text-5xl font-bold text-primary-foreground">
            {post.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center p-8 md:p-10">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="navy">Featured</Badge>
          {post.category && <Badge variant="accent">{post.category}</Badge>}
        </div>
        <h2 className="mb-3 font-display text-2xl font-bold text-ink-strong md:text-3xl">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mb-5 line-clamp-3 text-foreground/80">{post.excerpt}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {post.author_name && <span className="font-medium">{post.author_name}</span>}
          {dateLabel && (
            <>
              {post.author_name && <span aria-hidden>·</span>}
              <time dateTime={post.published_at ?? undefined}>{dateLabel}</time>
            </>
          )}
          {post.read_time_min ? (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {post.read_time_min} min read
              </span>
            </>
          ) : null}
        </div>
        <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-navy transition-colors group-hover:text-primary-dark dark:text-primary">
          Read article
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category");
  const urlQ = searchParams.get("q") ?? "";

  // Local input mirrors the URL `q`, debounced before it reaches the query.
  const [input, setInput] = useState(urlQ);
  const [debouncedQ, setDebouncedQ] = useState(urlQ);

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

  const filters: BlogFilters = useMemo(
    () => ({ q: debouncedQ, category }),
    [debouncedQ, category],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBlogList(filters);

  const categoriesQuery = useBlogCategories();
  const featuredQuery = useFeaturedPost();

  const rows = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);
  const count = data?.pages[0]?.count ?? 0;
  const hasFilters = !!category || debouncedQ.trim().length > 0;

  const setCategory = (value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("category", value);
        else next.delete("category");
        return next;
      },
      { replace: false },
    );
  };

  const clearFilters = () => {
    setInput("");
    setSearchParams({}, { replace: false });
  };

  const categories = categoriesQuery.data ?? [];
  const showFeatured = !hasFilters && !!featuredQuery.data;

  return (
    <>
      <SEO
        title="Blog"
        description="Insights, playbooks and founder stories from across Africa — funding, growth, and running a credible business."
      />

      <div className="bg-navy px-6 py-14 md:py-16">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Blog"
            subtitle="Insights, playbooks and founder stories from across Africa."
            onDark
          />
          <div className="relative mt-8 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Search articles"
              placeholder="Search articles by title or summary…"
              className="h-12 bg-card pl-12 text-foreground"
            />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {showFeatured && featuredQuery.data && (
          <FeaturedHero post={featuredQuery.data} />
        )}

        {/* Category filter chips */}
        {categories.length > 0 && (
          <div
            className="mb-8 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by category"
          >
            <button
              type="button"
              onClick={() => setCategory(null)}
              aria-pressed={!category}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                !category
                  ? "border-transparent bg-navy text-white"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              All
            </button>
            {categories.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(active ? null : c)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    active
                      ? "border-transparent bg-navy text-white"
                      : "border-border bg-card text-foreground hover:border-primary/40",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}

        <p
          className="mb-6 text-sm text-muted-foreground"
          aria-live="polite"
          role="status"
        >
          {isLoading
            ? "Loading articles…"
            : `${count.toLocaleString()} ${count === 1 ? "article" : "articles"}`}
        </p>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} media lines={3} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load the blog"
            message="Something went wrong fetching articles. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : count === 0 && hasFilters ? (
          <EmptyState
            variant="search"
            title="No articles match"
            description="Try a different search or clear the filters to see everything."
            action={{ label: "Clear filters", onClick: clearFilters }}
          />
        ) : count === 0 ? (
          <EmptyState
            variant="default"
            title="No articles yet"
            description="We're working on the first stories. Check back soon."
          />
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
              {isFetchingNextPage &&
                Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={`s-${i}`} media lines={3} />
                ))}
            </div>

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

export default Blog;
