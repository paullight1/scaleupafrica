import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import type {
  BusinessEnrichmentRequest,
  BusinessEnrichmentResponse,
  BusinessIdentityCandidate,
  BusinessIdentityConfirmation,
} from "@/lib/api/types";
import {
  confirmBusinessIdentity,
  startBusinessEnrichment,
  type BusinessIdentityConfirmationResult,
} from "@/lib/api/businessEnrichment";

// Generated Supabase types intentionally lag new Funding Intelligence migrations.
// Keep this escape hatch confined to the new data seam until the live project can
// regenerate types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export const businessEnrichmentKeys = {
  all: ["business-enrichment"] as const,
  confirmed: (userId: string | undefined) => ["business-enrichment", "confirmed", userId] as const,
};

export function useStartBusinessEnrichment() {
  return useMutation<BusinessEnrichmentResponse, Error, BusinessEnrichmentRequest>({
    mutationFn: startBusinessEnrichment,
  });
}

export function useConfirmBusinessIdentity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation<BusinessIdentityConfirmationResult, Error, BusinessIdentityConfirmation>({
    mutationFn: confirmBusinessIdentity,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: businessEnrichmentKeys.all });
      void qc.invalidateQueries({ queryKey: ["funding", "profile", user?.id] });
      void qc.invalidateQueries({ queryKey: ["directory", "own", user?.id] });
    },
  });
}

export function useConfirmedBusinessIdentity() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery<BusinessIdentityCandidate | null>({
    queryKey: businessEnrichmentKeys.confirmed(userId),
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("business_enrichment_candidates")
        .select(
          "id,canonical_name,website,country,summary,identity_confidence,source_urls,enriched_profile,field_evidence,member_state,created_at",
        )
        .eq("member_state", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: String(data.id),
        canonicalName: String(data.canonical_name ?? ""),
        website: typeof data.website === "string" ? data.website : null,
        country: typeof data.country === "string" ? data.country : null,
        summary: typeof data.summary === "string" ? data.summary : null,
        identityConfidence: Number(data.identity_confidence ?? 0),
        sourceUrls: Array.isArray(data.source_urls) ? data.source_urls.map(String) : [],
        enrichedProfile:
          data.enriched_profile && typeof data.enriched_profile === "object" && !Array.isArray(data.enriched_profile)
            ? (data.enriched_profile as Record<string, unknown>)
            : {},
        fieldEvidence:
          data.field_evidence && typeof data.field_evidence === "object" && !Array.isArray(data.field_evidence)
            ? (data.field_evidence as Record<string, unknown>)
            : {},
        memberState: "confirmed",
      };
    },
  });
}
