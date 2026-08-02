import { supabase } from "@shared/integrations/supabase/client";

/**
 * Record an admin action to the audit log. Best-effort; never throws.
 * RLS restricts inserts to staff and reads to admins.
 */
export async function logAdminAction(
  action: string,
  opts: {
    entityType?: string;
    entityId?: string;
    details?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("admin_audit_log").insert({
      actor_id: data.user?.id ?? null,
      actor_email: data.user?.email ?? null,
      action,
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      details: (opts.details ?? {}) as never,
    });
  } catch {
    /* auditing must never break an admin action */
  }
}
