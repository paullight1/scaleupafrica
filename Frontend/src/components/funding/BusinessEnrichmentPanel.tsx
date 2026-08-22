import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BusinessEnrichmentStart } from "./BusinessEnrichmentStart";
import { BusinessIdentityConfirm } from "./BusinessIdentityConfirm";
import {
  useConfirmBusinessIdentity,
  useStartBusinessEnrichment,
} from "@/hooks/queries/businessEnrichment";
import type { BusinessEnrichmentResponse } from "@/lib/api/types";
import { BusinessEnrichmentError } from "@/lib/api/businessEnrichment";
import { editProfileHref } from "@/lib/dashboard/routes";

export function BusinessEnrichmentPanel({ initialBusinessName }: { initialBusinessName?: string | null }) {
  const navigate = useNavigate();
  const start = useStartBusinessEnrichment();
  const confirm = useConfirmBusinessIdentity();
  const [result, setResult] = useState<BusinessEnrichmentResponse | null>(null);

  const error = start.isError
    ? enrichmentErrorMessage(start.error)
    : confirm.isError
      ? "We couldn't save that confirmation. Your current profile is unchanged. Please try again."
      : null;

  if (result) {
    return (
      <BusinessIdentityConfirm
        result={result}
        busy={confirm.isPending}
        onConfirm={async (candidateId) => {
          await confirm.mutateAsync({
            runId: result.runId,
            candidateId,
            accepted: true,
          });
          setResult(null);
        }}
        onReject={async (candidateId) => {
          if (candidateId) {
            await confirm.mutateAsync({
              runId: result.runId,
              candidateId,
              accepted: false,
            });
          }
          setResult(null);
        }}
        onEdit={() => navigate(editProfileHref("identity"))}
      />
    );
  }

  return (
    <BusinessEnrichmentStart
      initialBusinessName={initialBusinessName}
      busy={start.isPending}
      error={error}
      onStart={async (input) => {
        const next = await start.mutateAsync(input);
        setResult(next);
      }}
    />
  );
}

function enrichmentErrorMessage(error: Error): string {
  if (error instanceof BusinessEnrichmentError && error.code === "provider_unavailable") {
    return "Organisation research is not configured right now. Your current profile is unchanged — you can continue manually.";
  }
  return "We couldn't research your organisation right now. Your current profile is unchanged. Please try again or continue manually.";
}

export default BusinessEnrichmentPanel;
