import type { FundingOpportunity } from "./types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** True when the opportunity was created within the last 7 days. */
export function isNewThisWeek(o: { created_at: string }, now: number = Date.now()): boolean {
  const t = new Date(o.created_at).getTime();
  if (Number.isNaN(t)) return false;
  return now - t < WEEK_MS;
}

/** Count feed items created within the last 7 days. */
export function countNewThisWeek(feed: FundingOpportunity[], now: number = Date.now()): number {
  return feed.reduce((n, o) => (isNewThisWeek(o, now) ? n + 1 : n), 0);
}
