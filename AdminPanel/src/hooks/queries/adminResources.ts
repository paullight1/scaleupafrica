import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/integrations/supabase/client";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@shared/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ResourceRow = Tables<"resources">;
export type ResourceInsert = TablesInsert<"resources">;
export type ResourceUpdate = TablesUpdate<"resources">;

export type ResourceType =
  | "template"
  | "playbook"
  | "guide"
  | "ebook"
  | "article"
  | "checklist"
  | "toolkit"
  | "webinar"
  | "case-study";

export type ResourceStatus = "draft" | "published" | "archived";

export const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "template", label: "Template" },
  { value: "playbook", label: "Playbook" },
  { value: "guide", label: "Guide" },
  { value: "ebook", label: "Ebook" },
  { value: "article", label: "Article" },
  { value: "checklist", label: "Checklist" },
  { value: "toolkit", label: "Toolkit" },
  { value: "webinar", label: "Webinar" },
  { value: "case-study", label: "Case study" },
];

export const RESOURCE_STATUSES: { value: ResourceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export function resourceTypeLabel(type: string): string {
  return RESOURCE_TYPES.find((t) => t.value === type)?.label ?? type;
}

/**
 * Raised when a slug collides with the DB unique constraint (Postgres 23505)
 * so the form can surface a friendly, field-level message instead of the raw
 * database error.
 */
export class SlugConflictError extends Error {
  constructor() {
    super("That slug is already in use. Please choose a different one.");
    this.name = "SlugConflictError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const resourceKeys = {
  all: ["admin", "resources"] as const,
  list: () => [...resourceKeys.all, "list"] as const,
  detail: (id: string) => [...resourceKeys.all, "detail", id] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
/** All resources (any status) ordered by most recently updated. */
export function useAdminResources() {
  return useQuery<ResourceRow[]>({
    queryKey: resourceKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** A single resource for the edit form. Disabled when no id (create mode). */
export function useAdminResource(id: string | undefined) {
  return useQuery<ResourceRow | null>({
    queryKey: resourceKeys.detail(id ?? ""),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
/** Insert a new resource, mapping slug collisions to SlugConflictError. */
export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation<ResourceRow, Error, ResourceInsert>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from("resources")
        .insert(payload)
        .select("*")
        .single();
      if (error) {
        if (isUniqueViolation(error)) throw new SlugConflictError();
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

/** Update an existing resource, mapping slug collisions to SlugConflictError. */
export function useUpdateResource() {
  const qc = useQueryClient();
  return useMutation<ResourceRow, Error, { id: string; values: ResourceUpdate }>({
    mutationFn: async ({ id, values }) => {
      const { data, error } = await supabase
        .from("resources")
        .update(values)
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        if (isUniqueViolation(error)) throw new SlugConflictError();
        throw error;
      }
      return data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
      qc.invalidateQueries({ queryKey: resourceKeys.detail(row.id) });
    },
  });
}

/** Toggle a resource between published and draft, stamping published_at once. */
export function useToggleResourceStatus() {
  const qc = useQueryClient();
  return useMutation<
    ResourceRow,
    Error,
    { row: ResourceRow; publish: boolean }
  >({
    mutationFn: async ({ row, publish }) => {
      const values: ResourceUpdate = {
        status: publish ? "published" : "draft",
      };
      if (publish && !row.published_at) {
        values.published_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("resources")
        .update(values)
        .eq("id", row.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

/** Insert a draft copy of a resource with a unique "-copy" slug. */
export function useDuplicateResource() {
  const qc = useQueryClient();
  return useMutation<ResourceRow, Error, ResourceRow>({
    mutationFn: async (row) => {
      const base = `${row.slug}-copy`;
      // Probe for a free slug so repeated duplicates don't collide.
      let slug = base;
      for (let i = 2; i < 50; i++) {
        const { data: existing, error: checkError } = await supabase
          .from("resources")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (checkError) throw checkError;
        if (!existing) break;
        slug = `${base}-${i}`;
      }

      const payload: ResourceInsert = {
        title: `${row.title} (copy)`,
        slug,
        type: row.type,
        category: row.category,
        excerpt: row.excerpt,
        content: row.content,
        cover_image_url: row.cover_image_url,
        file_url: row.file_url,
        file_name: row.file_name,
        file_size_kb: row.file_size_kb,
        topics: row.topics,
        gated: row.gated,
        featured: false,
        read_time_min: row.read_time_min,
        author_id: row.author_id,
        author_name: row.author_name,
        status: "draft",
        published_at: null,
      };
      const { data, error } = await supabase
        .from("resources")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

/** Permanently delete a resource. */
export function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}
