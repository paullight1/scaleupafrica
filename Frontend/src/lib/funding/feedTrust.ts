import {
  effectiveFundingVerificationStatus,
  type FundingVerificationStatus,
} from "@shared/lib/fundingTrust";
import { effectiveFundingStatus } from "@shared/lib/fundingStatus";

export type FeedApplicationTrustStatus =
  | "open"
  | "closing_soon"
  | "rolling"
  | "upcoming"
  | "closed"
  | "paused"
  | "unknown";

/**
 * The canonical database/API trust state is the ceiling. Client freshness logic
 * may downgrade a verified record as evidence ages, but must never re-promote a
 * row that the database explicitly marked stale or unverified.
 */
export function resolveFeedVerificationStatus(
  storedStatus: unknown,
  sourceUrl: string | null | undefined,
  checkedAt: string | null | undefined,
  now = new Date(),
): FundingVerificationStatus {
  return effectiveFundingVerificationStatus(storedStatus, sourceUrl, checkedAt, now);
}

function normalizeApplicationStatus(value: unknown): FeedApplicationTrustStatus {
  return value === "open" ||
    value === "closing_soon" ||
    value === "rolling" ||
    value === "upcoming" ||
    value === "closed" ||
    value === "paused"
    ? value
    : "unknown";
}

/**
 * Current-cycle claims cannot be stronger than the opportunity's effective
 * verification state. Even a recently checked stored OPEN row is hidden as
 * unknown after provenance is stale/unverified.
 */
export function resolveFeedApplicationStatus(
  verificationStatus: FundingVerificationStatus,
  storedStatus: unknown,
  checkedAt: string | null | undefined,
  now = new Date(),
): FeedApplicationTrustStatus {
  if (verificationStatus !== "verified") return "unknown";
  return effectiveFundingStatus(normalizeApplicationStatus(storedStatus), checkedAt, now);
}
