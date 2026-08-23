import {
  effectiveFundingVerificationStatus,
  type FundingVerificationStatus,
} from "@shared/lib/fundingTrust";

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
