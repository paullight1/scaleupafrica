import type { FundingOpportunity } from "./types";

/**
 * Deadline urgency, computed client-side.
 *
 * `funding_opportunities.deadline` is TEXT, not a date — curators type things
 * like "31 March 2026", "2026-03-31" or "Rolling". So urgency is best-effort by
 * construction: an entry we cannot parse is simply not urgent, never a guess.
 * That asymmetry is deliberate. Showing "closes in 3 days" for a misparsed
 * string would push someone to drop everything for a deadline that isn't real;
 * omitting a real deadline only costs us a nudge.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a free-text deadline. Returns null when it isn't a real, single date. */
export function parseDeadline(raw: string | null | undefined): Date | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;

  // "Rolling", "Ongoing", "Varies" etc. are valid curator entries and are not
  // dates. Reject anything without a digit before handing it to Date.
  if (!/\d/.test(value)) return null;

  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;

  // Date.parse("2026") === Jan 1 2026, which would invent a deadline out of a
  // bare year. Require something more specific than 4 digits.
  if (/^\d{4}$/.test(value)) return null;

  return new Date(t);
}

/**
 * Whole days from `now` until the deadline. Negative once it has passed, null
 * when unparseable. Uses calendar-day granularity so "closes today" doesn't
 * flip to "closes in 0 days" depending on the hour.
 */
export function daysUntilDeadline(
  raw: string | null | undefined,
  now: number = Date.now(),
): number | null {
  const d = parseDeadline(raw);
  if (!d) return null;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDeadline = new Date(d);
  startOfDeadline.setHours(0, 0, 0, 0);
  return Math.round((startOfDeadline.getTime() - startOfToday.getTime()) / DAY_MS);
}

/** Human urgency label, or null when there's nothing trustworthy to say. */
export function deadlineLabel(
  raw: string | null | undefined,
  now: number = Date.now(),
): string | null {
  const days = daysUntilDeadline(raw, now);
  if (days === null) return null;
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  return `${days} days left`;
}

/** True when the deadline is real, still open, and within `withinDays`. */
export function isClosingSoon(
  raw: string | null | undefined,
  withinDays = 30,
  now: number = Date.now(),
): boolean {
  const days = daysUntilDeadline(raw, now);
  return days !== null && days >= 0 && days <= withinDays;
}

/**
 * Opportunities closing within `withinDays`, soonest first. Anything with an
 * unparseable or passed deadline is excluded rather than sorted arbitrarily.
 */
export function closingSoon<T extends Pick<FundingOpportunity, "deadline">>(
  items: T[],
  withinDays = 30,
  now: number = Date.now(),
): T[] {
  return items
    .map((item) => ({ item, days: daysUntilDeadline(item.deadline, now) }))
    .filter((x): x is { item: T; days: number } => x.days !== null && x.days >= 0 && x.days <= withinDays)
    .sort((a, b) => a.days - b.days)
    .map((x) => x.item);
}
