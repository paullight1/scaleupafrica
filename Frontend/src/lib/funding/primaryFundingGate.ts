export type FundingSurface = "open_for_you" | "closing_soon" | "watchlist" | "explore";

export interface PrimaryFundingGateInput {
  verificationStatus: "verified" | "stale" | "unverified";
  applicationStatus: "open" | "closing_soon" | "rolling" | "upcoming" | "closed" | "paused" | "unknown";
  eligibilityStatus: "eligible" | "possibly_eligible" | "insufficient_information" | "ineligible";
  statusFresh: boolean;
  discoverySource: "verified_feed" | "ai_assisted";
}

/**
 * Single source of truth for paid Funding Radar surface membership.
 * Fit score is intentionally absent: relevance controls ordering inside a surface,
 * never permission to enter the primary Apply experience.
 */
export function classifyFundingSurface(input: PrimaryFundingGateInput): FundingSurface[] {
  if (input.discoverySource === "ai_assisted" || input.verificationStatus !== "verified") {
    return ["explore"];
  }

  if (input.eligibilityStatus === "ineligible") return ["explore"];

  if (!input.statusFresh) return ["watchlist"];

  if (input.eligibilityStatus !== "eligible") return ["watchlist"];

  if (input.applicationStatus === "closing_soon") {
    return ["open_for_you", "closing_soon"];
  }

  if (input.applicationStatus === "open" || input.applicationStatus === "rolling") {
    return ["open_for_you"];
  }

  if (
    input.applicationStatus === "upcoming" ||
    input.applicationStatus === "unknown" ||
    input.applicationStatus === "paused"
  ) {
    return ["watchlist"];
  }

  return ["explore"];
}