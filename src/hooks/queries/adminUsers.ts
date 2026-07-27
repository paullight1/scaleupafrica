import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/audit";

/**
 * Data layer for the admin User-management and Directory-moderation pages.
 * All server reads/writes go through TanStack Query per FOUNDATION §4.
 *
 * `admin_list_users` (RPC) and the `profiles.slug` column are not present in the
 * generated `src/integrations/supabase/types.ts`, so — following the convention in
 * `src/hooks/queries/directory.ts` — we use a loosely-typed client alias for those
 * calls so this module type-checks without hand-editing the generated file.
 */
const db = supabase as unknown as SupabaseClient;

/* ------------------------------------------------------------------ *
 * Query keys
 * ------------------------------------------------------------------ */

export const adminUserKeys = {
  all: ["admin", "users"] as const,
  list: (search: string) => ["admin", "users", "list", search] as const,
};

export const adminProfileKeys = {
  all: ["admin", "profiles"] as const,
  list: () => ["admin", "profiles", "list"] as const,
};

/* ------------------------------------------------------------------ *
 * Row types
 * ------------------------------------------------------------------ */

export type AdminUserRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  business_name: string | null;
  country: string | null;
  has_access: boolean | null;
  expires_at: string | null;
  is_admin: boolean;
  is_editor: boolean;
};

export type AdminProfileRow = {
  id: string;
  slug: string | null;
  business_name: string;
  founder_name: string | null;
  country: string | null;
  sector: string | null;
  status: string;
  featured: boolean;
  view_count: number;
  created_at: string;
  logo_url: string | null;
};

export type AppRole = "admin" | "editor";

const PROFILE_COLUMNS =
  "id, slug, business_name, founder_name, country, sector, status, featured, view_count, created_at, logo_url";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** An access grant is live when has_access is true and expiry is null or future. */
export function subscriptionActive(
  row: Pick<AdminUserRow, "has_access" | "expires_at">,
): boolean {
  if (!row.has_access) return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

/** ISO timestamp exactly one year from now — the default access window on grant. */
export function oneYearFromNowISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

function errMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/* ------------------------------------------------------------------ *
 * Queries
 * ------------------------------------------------------------------ */

export function useAdminUsers(search: string) {
  return useQuery<AdminUserRow[]>({
    queryKey: adminUserKeys.list(search),
    queryFn: async () => {
      const { data, error } = await db.rpc("admin_list_users", {
        _search: search || null,
        _limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
  });
}

/**
 * Full moderation roster (newest first). Filtering by status/sector/search is done
 * client-side in the page so a single cached query backs both the table and the
 * sector-filter options; the admin-only moderation set is small.
 */
export function useAdminProfiles() {
  return useQuery<AdminProfileRow[]>({
    queryKey: adminProfileKeys.list(),
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminProfileRow[];
    },
  });
}

/* ------------------------------------------------------------------ *
 * User mutations
 * ------------------------------------------------------------------ */

/** Grant (1-year window) or revoke a user's directory/funding access. */
export function useSetAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      const expiresAt = grant ? oneYearFromNowISO() : null;
      const { error } = await supabase
        .from("subscriptions")
        .upsert(
          { user_id: userId, has_access: grant, expires_at: expiresAt },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      return { expiresAt };
    },
    onSuccess: (res, { userId, grant }) => {
      qc.invalidateQueries({ queryKey: adminUserKeys.all });
      void logAdminAction(grant ? "grant_access" : "revoke_access", {
        entityType: "user",
        entityId: userId,
        details: { expires_at: res.expiresAt },
      });
      toast.success(grant ? "Access granted for 1 year" : "Access revoked");
    },
    onError: (e) => toast.error(errMessage(e, "Could not update access")),
  });
}

/** Update the expiry date on an existing subscription. */
export function useSetExpiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, expiresAt }: { userId: string; expiresAt: string }) => {
      const { error } = await supabase
        .from("subscriptions")
        .upsert(
          { user_id: userId, has_access: true, expires_at: expiresAt },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: (_res, { userId, expiresAt }) => {
      qc.invalidateQueries({ queryKey: adminUserKeys.all });
      void logAdminAction("grant_access", {
        entityType: "user",
        entityId: userId,
        details: { expires_at: expiresAt, reason: "set_expiry" },
      });
      toast.success("Expiry updated");
    },
    onError: (e) => toast.error(errMessage(e, "Could not update expiry")),
  });
}

/** Add or remove an admin/editor role for a user. */
export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      role,
      add,
    }: {
      userId: string;
      role: AppRole;
      add: boolean;
    }) => {
      if (add) {
        const { error } = await db.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await db
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: (_res, { userId, role, add }) => {
      qc.invalidateQueries({ queryKey: adminUserKeys.all });
      void logAdminAction(add ? "add_role" : "remove_role", {
        entityType: "user",
        entityId: userId,
        details: { role },
      });
      toast.success(add ? `Added ${role} role` : `Removed ${role} role`);
    },
    onError: (e) => toast.error(errMessage(e, "Could not update role")),
  });
}

/* ------------------------------------------------------------------ *
 * Profile moderation mutations
 * ------------------------------------------------------------------ */

/** Apply a moderation patch (feature / hide / flag) to a profile row. */
export function useModerateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Record<string, unknown>;
      action: string;
      successMessage: string;
    }) => {
      const { error } = await db.from("profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_res, { id, action, patch, successMessage }) => {
      qc.invalidateQueries({ queryKey: adminProfileKeys.all });
      void logAdminAction(action, {
        entityType: "profile",
        entityId: id,
        details: patch,
      });
      toast.success(successMessage);
    },
    onError: (e) => toast.error(errMessage(e, "Could not update profile")),
  });
}

/** Permanently delete a directory profile. */
export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; businessName: string }) => {
      const { error } = await db.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_res, { id, businessName }) => {
      qc.invalidateQueries({ queryKey: adminProfileKeys.all });
      void logAdminAction("delete_profile", {
        entityType: "profile",
        entityId: id,
        details: { business_name: businessName },
      });
      toast.success("Profile deleted");
    },
    onError: (e) => toast.error(errMessage(e, "Could not delete profile")),
  });
}
