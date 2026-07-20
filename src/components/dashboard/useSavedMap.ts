import { useMemo } from "react";
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

  function toggle(opportunityId: string) {
    const savedId = savedMap.get(opportunityId);
    if (savedId) unsave.mutate(savedId);
    else save.mutate(opportunityId);
  }

  return {
    savedMap,
    toggle,
    pending: save.isPending || unsave.isPending,
    query: saved,
  };
}
