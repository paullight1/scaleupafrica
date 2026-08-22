export type FundingVerificationStatus = "verified" | "stale" | "unverified";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "referrer",
]);

function isTrackingParam(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized.startsWith("utm_") || TRACKING_PARAMS.has(normalized);
}

export function canonicalFundingSourceUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (isTrackingParam(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function hasUsableFundingSource(value: string | null | undefined): boolean {
  return canonicalFundingSourceUrl(value) !== null;
}

export function fundingVerificationStatus(
  sourceUrl: string | null | undefined,
  checkedAt: string | null | undefined,
  now = new Date(),
  verifiedWindowDays = 7,
): FundingVerificationStatus {
  if (!hasUsableFundingSource(sourceUrl) || !checkedAt) return "unverified";
  const checked = new Date(checkedAt).getTime();
  if (Number.isNaN(checked)) return "unverified";
  const ageDays = Math.max(0, (now.getTime() - checked) / 86_400_000);
  return ageDays <= verifiedWindowDays ? "verified" : "stale";
}
