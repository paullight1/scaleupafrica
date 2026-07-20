import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "editor" | "moderator" | "user";

type RoleState = {
  roles: AppRole[];
  isAdmin: boolean;
  isEditor: boolean;
  /** admin OR editor — the set of users allowed into the content CMS */
  isStaff: boolean;
  loading: boolean;
};

/**
 * Resolves the current user's roles from `user_roles`.
 * Roles are the source of truth for admin access — never trust client state
 * alone; every table is also protected by RLS using is_admin()/is_staff().
 */
export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!active) return;
      setRoles((data ?? []).map((r) => r.role as AppRole));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const isAdmin = roles.includes("admin");
  const isEditor = roles.includes("editor");

  return {
    roles,
    isAdmin,
    isEditor,
    isStaff: isAdmin || isEditor,
    loading: authLoading || loading,
  };
}
