import { supabase } from "@shared/integrations/supabase/client";
import type {
  BusinessEnrichmentRequest,
  BusinessEnrichmentResponse,
  BusinessIdentityConfirmation,
} from "./types";

export interface BusinessIdentityConfirmationResult {
  runId: string;
  candidateId: string;
  state: "confirmed" | "rejected";
  profileUpdated: boolean;
}

export class BusinessEnrichmentError extends Error {
  constructor(readonly code: string, message = "Business enrichment failed") {
    super(message);
    this.name = "BusinessEnrichmentError";
  }
}

export async function startBusinessEnrichment(
  input: BusinessEnrichmentRequest,
): Promise<BusinessEnrichmentResponse> {
  const { data, error } = await supabase.functions.invoke<BusinessEnrichmentResponse & { error?: string }>(
    "business-enrichment",
    { body: input },
  );
  if (error || !data) {
    throw new BusinessEnrichmentError(await edgeErrorCode(error), "We couldn't research that organisation right now.");
  }
  if (data.state === "failed") {
    throw new BusinessEnrichmentError(data.errorCode ?? data.error ?? "business_enrichment_failed");
  }
  return data;
}

export async function confirmBusinessIdentity(
  input: BusinessIdentityConfirmation,
): Promise<BusinessIdentityConfirmationResult> {
  const { data, error } = await supabase.functions.invoke<BusinessIdentityConfirmationResult & { error?: string }>(
    "business-enrichment",
    { body: input },
  );
  if (error || !data || (data.state !== "confirmed" && data.state !== "rejected")) {
    throw new BusinessEnrichmentError(await edgeErrorCode(error), "We couldn't save that organisation confirmation.");
  }
  return data;
}

async function edgeErrorCode(error: unknown): Promise<string> {
  if (!error || typeof error !== "object") return "unavailable";
  const context = (error as { context?: unknown }).context;
  if (!context || typeof context !== "object") return "unavailable";
  const json = (context as { json?: unknown }).json;
  if (typeof json !== "function") return "unavailable";
  try {
    const body = await (json as () => Promise<unknown>)();
    if (body && typeof body === "object") {
      const value = (body as Record<string, unknown>).error;
      if (typeof value === "string") return value;
    }
  } catch {
    // Upstream error body is best-effort; keep the stable fallback code.
  }
  return "unavailable";
}
