import { useMemo } from "react";
import { trackEvent } from "@shared/lib/analytics";
import {
  useSaveOpportunity,
  useSavedOpportunities,
  useUnsaveOpportunity,
} from "@/hooks/queries/dashboard";

/**
 * UI convenience over the saved-opportunity hooks: exposes a
 * opportunity_id → saved-row-id map and a single toggle that saves or unsaves.
 */
export function useSavedMap() {
  const saved = useSavedOpportunities();
  const save = useSaveOpportunity();
  const unsave = useUnsaveOpportunity();

  const savedMap = useMemo(() => {
    const m = new Map<string, string>();
    (saved.data ?? []).forEach((s) => m.set(s.opportunity_id, s.id));
    return m;
  }, [saved.data]);

  function toggle(opportunityId: string, metadata: Record<string, unknown> = {}) {
    const savedId = savedMap.get(opportunityId);
    if (savedId) {
      unsave.mutate(savedId);
      return;
    }

    save.mutate(opportunityId, {
      onSuccess: () => {
        void trackEvent("recommendation_save", {
          entityType: "funding_opportunity",
          entityId: opportunityId,
          metadata,
        });
      },
    });
  }

  return {
    savedMap,
    toggle,
    pending: save.isPending || unsave.isPending,
    query: saved,
  };
}
