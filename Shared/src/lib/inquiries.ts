export const SUPPORT_AREAS = [
  { value: "general", label: "General support" },
  { value: "account_profile", label: "Account & profile" },
  { value: "funding_support", label: "Funding support" },
  { value: "membership_billing", label: "Membership & billing" },
  { value: "partnerships", label: "Partnerships" },
  { value: "resources", label: "Resources" },
  { value: "media_events", label: "Media & events" },
] as const;

export type SupportArea = (typeof SUPPORT_AREAS)[number]["value"];

const SUPPORT_AREA_LABELS = new Map<string, string>(
  SUPPORT_AREAS.map((area) => [area.value, area.label]),
);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export interface InquiryDetails {
  area: SupportArea;
  areaLabel: string;
  sector: string | null;
}

export function getInquiryDetails(source: string, metadata: unknown): InquiryDetails {
  const values = record(metadata);
  const rawArea = text(values.support_area);
  const sourceDefault = source === "resource_download" ? "resources" : "general";
  const area = (rawArea && SUPPORT_AREA_LABELS.has(rawArea) ? rawArea : sourceDefault) as SupportArea;

  return {
    area,
    areaLabel: SUPPORT_AREA_LABELS.get(area) ?? "General support",
    sector: text(values.business_sector),
  };
}

export function matchesInquiryClassification(
  lead: { source: string; metadata: unknown },
  filters: { area: string; sector: string },
): boolean {
  const details = getInquiryDetails(lead.source, lead.metadata);
  if (filters.area !== "all" && details.area !== filters.area) return false;
  if (filters.sector !== "all" && details.sector !== filters.sector) return false;
  return true;
}
