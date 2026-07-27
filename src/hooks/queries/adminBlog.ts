import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/audit";
import { slugify } from "@/lib/analytics";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

/**
 * Admin Blog CMS data layer. All reads/writes go through TanStack Query.
 * `blog_posts` RLS: staff manage all rows; the public can read published posts.
 */

export type BlogPost = Tables<"blog_posts">;
export type BlogStatus = "draft" | "published" | "archived";

/** Postgres unique-violation code — raised when a slug collides. */
export const PG_UNIQUE_VIOLATION = "23505";

/** True when a Supabase error is a slug (or other) unique-constraint violation. */
export function isDuplicateSlugError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}

export const blogKeys = {
  all: ["admin", "blog"] as const,
  lists: () => [...blogKeys.all, "list"] as const,
  detail: (id: string) => [...blogKeys.all, "detail", id] as const,
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** All posts, newest-edited first. Filtering/search is done client-side in the list. */
export function useAdminBlogPosts() {
  return useQuery<BlogPost[]>({
    queryKey: blogKeys.lists(),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** A single post for the editor. `enabled` is false for the "new" route. */
export function useAdminBlogPost(id: string | undefined) {
  return useQuery<BlogPost | null>({
    queryKey: id ? blogKeys.detail(id) : blogKeys.detail("new"),
    enabled: !!id,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type SaveBlogInput = {
  id?: string;
  values: TablesInsert<"blog_posts">;
};

/** Insert (new) or update (existing). Returns the persisted row. */
export function useSaveBlogPost() {
  const qc = useQueryClient();
  return useMutation<BlogPost, unknown, SaveBlogInput>({
    mutationFn: async ({ id, values }) => {
      if (id) {
        const { data, error } = await supabase
          .from("blog_posts")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("blog_posts")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row, { id }) => {
      void logAdminAction(id ? "post_update" : "post_create", {
        entityType: "blog_post",
        entityId: row.id,
      });
      qc.invalidateQueries({ queryKey: blogKeys.lists() });
      qc.invalidateQueries({ queryKey: blogKeys.detail(row.id) });
    },
  });
}

/** Toggle published <-> draft. Sets published_at on first publish. */
export function useTogglePublish() {
  const qc = useQueryClient();
  return useMutation<BlogPost, unknown, BlogPost>({
    mutationFn: async (post) => {
      const publishing = post.status !== "published";
      const patch: Partial<TablesInsert<"blog_posts">> = {
        status: publishing ? "published" : "draft",
        updated_at: new Date().toISOString(),
      };
      if (publishing && !post.published_at) {
        patch.published_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("blog_posts")
        .update(patch)
        .eq("id", post.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      void logAdminAction(
        row.status === "published" ? "post_publish" : "post_unpublish",
        { entityType: "blog_post", entityId: row.id },
      );
      qc.invalidateQueries({ queryKey: blogKeys.lists() });
      qc.invalidateQueries({ queryKey: blogKeys.detail(row.id) });
    },
  });
}

/** Duplicate a post as a fresh draft with a "-copy" slug (deduped on collision). */
export function useDuplicateBlogPost() {
  const qc = useQueryClient();
  return useMutation<BlogPost, unknown, BlogPost>({
    mutationFn: async (post) => {
      const base = slugify(`${post.slug || slugify(post.title)}-copy`);

      // Fetch existing slugs that share the base so we can append -2, -3, ….
      const { data: clashes, error: clashErr } = await supabase
        .from("blog_posts")
        .select("slug")
        .like("slug", `${base}%`);
      if (clashErr) throw clashErr;
      const taken = new Set((clashes ?? []).map((r) => r.slug));
      let slug = base;
      let n = 2;
      while (taken.has(slug)) slug = `${base}-${n++}`;

      const insert: TablesInsert<"blog_posts"> = {
        title: `${post.title} (copy)`,
        slug,
        excerpt: post.excerpt,
        content: post.content,
        cover_image_url: post.cover_image_url,
        category: post.category,
        tags: post.tags,
        status: "draft",
        featured: false,
        read_time_min: post.read_time_min,
        author_id: post.author_id,
        author_name: post.author_name,
        seo_title: post.seo_title,
        seo_description: post.seo_description,
      };
      const { data, error } = await supabase
        .from("blog_posts")
        .insert(insert)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => {
      void logAdminAction("post_duplicate", {
        entityType: "blog_post",
        entityId: row.id,
      });
      qc.invalidateQueries({ queryKey: blogKeys.lists() });
    },
  });
}

/** Permanently delete a post. */
export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation<string, unknown, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      void logAdminAction("post_delete", {
        entityType: "blog_post",
        entityId: id,
      });
      qc.invalidateQueries({ queryKey: blogKeys.lists() });
    },
  });
}
