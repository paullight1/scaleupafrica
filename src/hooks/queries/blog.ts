import { useInfiniteQuery, useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public blog data layer. All reads go through TanStack Query. RLS on
 * `blog_posts` returns only rows with `status = 'published'`, but every query
 * still asserts it explicitly so intent is clear at the call site.
 * ALWAYS `if (error) throw error;` — never swallow a fetch failure.
 */

export const PAGE_SIZE = 9;

export type BlogFilters = {
  q: string;
  category: string | null;
};

export type BlogCardRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  read_time_min: number | null;
  author_name: string | null;
  published_at: string | null;
  featured: boolean;
};

export type BlogPostDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  read_time_min: number | null;
  view_count: number;
  author_name: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
};

const CARD_COLUMNS =
  "id,title,slug,excerpt,cover_image_url,category,tags,read_time_min,author_name,published_at,featured";

const DETAIL_COLUMNS =
  "id,title,slug,excerpt,content,cover_image_url,category,tags,read_time_min,view_count,author_name,seo_title,seo_description,published_at,created_at";

export const blogKeys = {
  all: ["blog"] as const,
  list: (f: BlogFilters) => ["blog", "list", f] as const,
  featured: ["blog", "featured"] as const,
  categories: ["blog", "categories"] as const,
  post: (slug: string) => ["blog", "post", slug] as const,
  related: (category: string | null, excludeId: string) =>
    ["blog", "related", category, excludeId] as const,
};

/**
 * Sanitize a search term for a PostgREST `or()` + `ilike` filter: drop the
 * `,` `(` `)` delimiters that break the or-syntax, escape the `%` `_` wildcards,
 * and collapse whitespace.
 */
export function sanitizeTerm(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .replace(/\s+/g, " ")
    .trim();
}

export type BlogPage = {
  rows: BlogCardRow[];
  count: number;
  nextOffset: number;
};

/** A short final page (< PAGE_SIZE) means we've reached the end. */
export function blogNextPageParam(last: BlogPage): number | undefined {
  return last.rows.length === PAGE_SIZE ? last.nextOffset : undefined;
}

/** Paginated, filterable list of published posts, newest first. */
export function useBlogList(filters: BlogFilters) {
  return useInfiniteQuery({
    queryKey: blogKeys.list(filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<BlogPage> => {
      let query = supabase
        .from("blog_posts")
        .select(CARD_COLUMNS, { count: "exact" })
        .eq("status", "published");

      if (filters.category) query = query.eq("category", filters.category);

      const term = sanitizeTerm(filters.q ?? "");
      if (term) {
        const like = `%${term}%`;
        query = query.or(`title.ilike.${like},excerpt.ilike.${like}`);
      }

      const { data, error, count } = await query
        .order("published_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (error) throw error;

      return {
        rows: (data ?? []) as BlogCardRow[],
        count: count ?? 0,
        nextOffset: pageParam + PAGE_SIZE,
      };
    },
    getNextPageParam: blogNextPageParam,
    placeholderData: keepPreviousData,
  });
}

/** The featured hero post: the most recent `featured=true`, else the newest post. */
export function useFeaturedPost() {
  return useQuery<BlogCardRow | null>({
    queryKey: blogKeys.featured,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const featured = await supabase
        .from("blog_posts")
        .select(CARD_COLUMNS)
        .eq("status", "published")
        .eq("featured", true)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (featured.error) throw featured.error;
      if (featured.data) return featured.data as BlogCardRow;

      const newest = await supabase
        .from("blog_posts")
        .select(CARD_COLUMNS)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (newest.error) throw newest.error;
      return (newest.data ?? null) as BlogCardRow | null;
    },
  });
}

/** Distinct categories across published posts (for filter chips). */
export function useBlogCategories() {
  return useQuery<string[]>({
    queryKey: blogKeys.categories,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("category")
        .eq("status", "published")
        .not("category", "is", null);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of (data ?? []) as { category: string | null }[]) {
        if (row.category) set.add(row.category);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
  });
}

/** Load a single published post by slug. Returns null when not found. */
export function useBlogPost(slug: string | undefined) {
  return useQuery<BlogPostDetail | null>({
    queryKey: blogKeys.post(slug ?? ""),
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(DETAIL_COLUMNS)
        .eq("slug", slug as string)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BlogPostDetail | null;
    },
  });
}

/** Up to `limit` other published posts in the same category. */
export function useRelatedPosts(
  category: string | null | undefined,
  excludeId: string | undefined,
  limit = 3,
) {
  return useQuery<BlogCardRow[]>({
    queryKey: blogKeys.related(category ?? null, excludeId ?? ""),
    enabled: !!category && !!excludeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(CARD_COLUMNS)
        .eq("status", "published")
        .eq("category", category as string)
        .neq("id", excludeId as string)
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as BlogCardRow[];
    },
  });
}
