import { apiRequest } from "./client";
import type { FundingSearchResult, CuratedOpportunity } from "./types";

export function searchFunding(keywords: string): Promise<FundingSearchResult> {
  return apiRequest<FundingSearchResult>("/funding/search", {
    method: "POST",
    body: { keywords },
  });
}

/** Returns null when there is no unexpired cached result (API sends an empty 200). */
export function getLatestFunding(): Promise<FundingSearchResult | null> {
  return apiRequest<FundingSearchResult | null>("/funding/latest").then((r) => r ?? null);
}

export function listCuratedFunding(): Promise<CuratedOpportunity[]> {
  return apiRequest<CuratedOpportunity[]>("/funding/opportunities");
}
