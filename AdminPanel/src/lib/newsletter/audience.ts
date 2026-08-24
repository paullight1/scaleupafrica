import type { AudienceFilter, AudienceSubscriber } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function optionalDate(value: unknown, label: string): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    throw new Error(`${label} must be a valid date`);
  }
  return value;
}

export function validateAudienceFilter(value: unknown): AudienceFilter {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Choose a valid audience");
  }

  const input = value as Record<string, unknown>;
  if (input.mode === "all") {
    return { mode: "all", sources: [], joinedAfter: null, joinedBefore: null };
  }
  if (input.mode !== "segment") throw new Error("Choose a valid audience");

  const rawSources = input.sources == null ? [] : input.sources;
  if (!Array.isArray(rawSources) || rawSources.some((source) => typeof source !== "string")) {
    throw new Error("Audience sources must be a list");
  }
  const sources = [...new Set(rawSources.map((source) => source.trim()).filter(Boolean))].slice(0, 50);
  const joinedAfter = optionalDate(input.joinedAfter, "Joined after");
  const joinedBefore = optionalDate(input.joinedBefore, "Joined before");
  if (joinedAfter && joinedBefore && joinedAfter > joinedBefore) {
    throw new Error("Joined after must be on or before joined before");
  }

  return { mode: "segment", sources, joinedAfter, joinedBefore };
}

export function matchesAudience(subscriber: AudienceSubscriber, filter: AudienceFilter): boolean {
  if (subscriber.status !== "subscribed") return false;
  if (filter.mode === "all") return true;

  if (filter.sources.length > 0 && (!subscriber.source || !filter.sources.includes(subscriber.source))) {
    return false;
  }
  const joinedDate = subscriber.subscribedAt?.slice(0, 10) ?? null;
  if (filter.joinedAfter && (!joinedDate || joinedDate < filter.joinedAfter)) return false;
  if (filter.joinedBefore && (!joinedDate || joinedDate > filter.joinedBefore)) return false;
  return true;
}
