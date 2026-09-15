import type { EngineGrant } from "./fundingEngineApi";

export type FundingImportPayload = {
  title: string;
  funder: string;
  type: string;
  summary: string | null;
  deadline: string | null;
  url: string | null;
  tags: string[];
  country_focus: string[];
  status: "draft";
  featured: false;
  details: Record<string, unknown>;
  source: "ai";
  source_name: "Edutu Engine";
  source_url: string | null;
  verification_status: "unverified";
  application_status: "unknown";
  deadline_status: "unknown";
};

function firstUrl(...values: Array<string | null | undefined>): string | null {
  return values.find((value) => typeof value === "string" && /^https?:\/\//i.test(value)) ?? null;
}

export function buildFundingImportPayload(grant: EngineGrant): FundingImportPayload {
  const applicationUrl = firstUrl(grant.application_url, grant.apply_url, grant.canonical_url, grant.source_url);
  const sourceUrl = firstUrl(grant.source_url, grant.canonical_url, grant.application_url, grant.apply_url);
  const tags = [...new Set([...(grant.tags ?? []), "grants"].map((tag) => tag.trim()).filter(Boolean))];

  return {
    title: grant.title.trim(),
    funder: grant.organization?.trim() || "Edutu Engine discovery",
    type: "grant",
    summary: grant.summary?.trim() || null,
    deadline: grant.close_date?.trim() || null,
    url: applicationUrl,
    tags,
    country_focus: [],
    status: "draft",
    featured: false,
    details: {
      discovery_source: "edutu_engine",
      edutu_opportunity_id: grant.id,
      canonical_url: grant.canonical_url ?? null,
      application_url: grant.application_url ?? grant.apply_url ?? null,
      imported_at: new Date().toISOString(),
    },
    source: "ai",
    source_name: "Edutu Engine",
    source_url: sourceUrl,
    verification_status: "unverified",
    application_status: "unknown",
    deadline_status: "unknown",
  };
}
