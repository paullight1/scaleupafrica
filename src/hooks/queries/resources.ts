import {
  useInfiniteQuery,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public Resource Library data layer. All server reads go through TanStack Query.
 * RLS returns only `status = 'published'` rows to anonymous visitors, but every
 * query still filters `status = 'published'` explicitly so the intent is clear.
 * ALWAYS `if (error) throw error;` — never swallow (ErrorState renders on failure).
 */

export const RESOURCE_TYPES = [
  "template",
  "playbook",
  "guide",
  "ebook",
  "article",
  "checklist",
  "toolkit",
  "webinar",
  "case-study",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

/** Type filter values surfaced as chips on the hub (footer deep-links to these). */
export const RESOURCE_TYPE_FILTERS: { value: ResourceType; label: string }[] = [
  { value: "template", label: "Templates" },
  { value: "playbook", label: "Playbooks" },
  { value: "guide", label: "Guides" },
  { value: "ebook", label: "Ebooks" },
  { value: "article", label: "Articles" },
  { value: "checklist", label: "Checklists" },
];

/** Human labels for every known type (used on cards / detail). */
export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  template: "Template",
  playbook: "Playbook",
  guide: "Guide",
  ebook: "Ebook",
  article: "Article",
  checklist: "Checklist",
  toolkit: "Toolkit",
  webinar: "Webinar",
  "case-study": "Case study",
};

export function resourceTypeLabel(type: string): string {
  return RESOURCE_TYPE_LABELS[type] ?? type;
}

export const PAGE_SIZE = 12;

export type ResourceFilters = {
  q: string;
  type: string | null;
  topic: string | null;
};

export const resourceKeys = {
  all: ["resources"] as const,
  list: (f: ResourceFilters) => ["resources", "list", f] as const,
  featured: ["resources", "featured"] as const,
  topics: ["resources", "topics"] as const,
  detail: (slug: string) => ["resources", "detail", slug] as const,
  related: (type: string, excludeId: string) =>
    ["resources", "related", type, excludeId] as const,
};

export type ResourceCardRow = {
  id: string;
  title: string;
  slug: string;
  type: string;
  category: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size_kb: number | null;
  topics: string[];
  gated: boolean;
  featured: boolean;
  read_time_min: number | null;
  view_count: number;
  download_count: number;
  published_at: string | null;
};

export type ResourceDetailRow = ResourceCardRow & {
  content: string | null;
  author_name: string | null;
  created_at: string;
};

const CARD_COLUMNS =
  "id, title, slug, type, category, excerpt, cover_image_url, file_url, file_name, file_size_kb, topics, gated, featured, read_time_min, view_count, download_count, published_at";

const DETAIL_COLUMNS = `${CARD_COLUMNS}, content, author_name, created_at`;

/**
 * Sanitize a search term for PostgREST `or()` + `ilike`: strip the delimiters
 * that would break the or-filter syntax and escape the ilike wildcards.
 */
export function sanitizeTerm(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/[%_]/g, (m) => `\\${m}`)
    .replace(/\s+/g, " ")
    .trim();
}

export type ResourcePage = {
  rows: ResourceCardRow[];
  count: number;
  nextOffset: number;
};

export function resourceNextPageParam(last: ResourcePage): number | undefined {
  return last.rows.length === PAGE_SIZE ? last.nextOffset : undefined;
}

/** Paginated, filtered listing of published resources. */
export function useResources(filters: ResourceFilters) {
  return useInfiniteQuery({
    queryKey: resourceKeys.list(filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ResourcePage> => {
      let query = supabase
        .from("resources")
        .select(CARD_COLUMNS, { count: "exact" })
        .eq("status", "published");

      if (filters.type) query = query.eq("type", filters.type);
      if (filters.topic) query = query.contains("topics", [filters.topic]);

      const term = sanitizeTerm(filters.q ?? "");
      if (term) {
        const like = `%${term}%`;
        query = query.or(`title.ilike.${like},excerpt.ilike.${like}`);
      }

      const { data, error, count } = await query
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) throw error;
      return {
        rows: (data ?? []) as ResourceCardRow[],
        count: count ?? 0,
        nextOffset: pageParam + PAGE_SIZE,
      };
    },
    getNextPageParam: resourceNextPageParam,
    placeholderData: keepPreviousData,
  });
}

/** Featured strip — larger cards shown above the grid. */
export function useFeaturedResources(limit = 3) {
  return useQuery<ResourceCardRow[]>({
    queryKey: resourceKeys.featured,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select(CARD_COLUMNS)
        .eq("status", "published")
        .eq("featured", true)
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ResourceCardRow[];
    },
  });
}

/** Distinct topics across all published resources, sorted by frequency. */
export function useResourceTopics() {
  return useQuery<string[]>({
    queryKey: resourceKeys.topics,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("topics")
        .eq("status", "published");
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of (data ?? []) as { topics: string[] | null }[]) {
        for (const t of row.topics ?? []) {
          const key = t.trim();
          if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value]) => value);
    },
  });
}

/** Single resource by slug. Returns null on a genuine miss (do not 500). */
export function useResourceBySlug(slug: string | undefined) {
  return useQuery<ResourceDetailRow | null>({
    queryKey: resourceKeys.detail(slug ?? ""),
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select(DETAIL_COLUMNS)
        .eq("slug", slug as string)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ResourceDetailRow | null;
    },
  });
}

/** Related resources: same type, excluding the current one. */
export function useRelatedResources(
  type: string | undefined,
  excludeId: string | undefined,
  limit = 3,
) {
  return useQuery<ResourceCardRow[]>({
    queryKey: resourceKeys.related(type ?? "", excludeId ?? ""),
    enabled: !!type && !!excludeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select(CARD_COLUMNS)
        .eq("status", "published")
        .eq("type", type as string)
        .neq("id", excludeId as string)
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ResourceCardRow[];
    },
  });
}
