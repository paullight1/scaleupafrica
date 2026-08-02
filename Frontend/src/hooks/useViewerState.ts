import { useAuth } from "@shared/hooks/useAuth";
import { useSubscription } from "@/lib/subscription";
import { useMyProfile } from "@/hooks/queries/dashboard";
import type { ActionSpec } from "@shared/components/common/types";

export type ViewerKind = "anonymous" | "no-profile" | "no-membership" | "member";

/**
 * Who is looking at the landing page. PRESENTATION ONLY — no guard, gate, or
 * access decision reads this. The database remains the boundary.
 *
 * TRUST-CRITICAL: `useSubscription` throws on a failed read and surfaces
 * `status: "error"`. That case, and the loading case, resolve to "anonymous"
 * so a paying member on a flaky connection is never shown an upgrade prompt.
 * The landing page must also stay readable without waiting on the network,
 * which is the second reason loading maps to the signed-out copy rather than
 * to a spinner.
 *
 * An active subscriber is "member" regardless of whether they have a listing:
 * they have already converted, and the dashboard's onboarding checklist owns
 * profile completion.
 */
export function useViewerState(): ViewerKind {
  const { user, loading } = useAuth();
  const subscription = useSubscription();
  const profile = useMyProfile();

  if (loading || !user) return "anonymous";
  if (subscription.status === "error" || subscription.status === "loading") return "anonymous";
  if (subscription.active) return "member";
  if (profile.isPending) return "anonymous";
  return profile.data ? "no-membership" : "no-profile";
}

/** The CTA pair each viewer sees. One place to change the copy. */
export const VIEWER_CTA: Record<ViewerKind, { primary: ActionSpec; secondary: ActionSpec }> = {
  anonymous: {
    primary: { label: "List your business — free", to: "/auth?next=/directory/create" },
    secondary: { label: "See how funding works", to: "/funding" },
  },
  "no-profile": {
    primary: { label: "Finish your listing", to: "/directory/create" },
    secondary: { label: "Browse the directory", to: "/directory" },
  },
  "no-membership": {
    primary: { label: "Unlock the Funding Radar", to: "/#pricing" },
    secondary: { label: "Go to dashboard", to: "/dashboard" },
  },
  member: {
    primary: { label: "Go to dashboard", to: "/dashboard" },
    secondary: { label: "Browse the directory", to: "/directory" },
  },
};
