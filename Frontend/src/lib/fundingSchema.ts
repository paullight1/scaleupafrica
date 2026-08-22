// MIRROR of supabase/functions/_shared/fundingSchema.ts — change BOTH.
// Edge (Deno) functions cannot import from src/; keep the schemas equivalent.
import { z } from "zod";

export function sanitizeExternalUrl(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  try {
    const url = new URL(String(raw).trim());
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    return null;
  } catch {
    return null;
  }
}

const trimmed = (max: number) => z.string().trim().max(max);

export const DiscoverySourceSchema = z.enum(["verified_feed", "ai_assisted"]);
export const VerificationStatusSchema = z.enum(["verified", "unverified", "stale"]);
export const ApplicationStatusSchema = z.enum(["open", "closing_soon", "rolling", "upcoming", "closed", "paused", "unknown"]);
export const DeadlineStatusSchema = z.enum(["confirmed", "rolling", "unknown"]);
export type DiscoverySource = z.infer<typeof DiscoverySourceSchema>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type DeadlineStatus = z.infer<typeof DeadlineStatusSchema>;

export const RecipientSchema = z.object({
  business_name: z.string().trim().min(1).max(200),
  founder_name: trimmed(300).default(""),
  note: trimmed(300).default(""),
  website: z.unknown().transform(sanitizeExternalUrl),
});

export const OpportunitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  funder: z.string().trim().min(1).max(200),
  type: trimmed(40).optional(),
  summary: trimmed(1000).default(""),
  amount: trimmed(100).default(""),
  opens: trimmed(300).default(""),
  deadline: trimmed(300).default(""),
  eligibility: trimmed(300).default(""),
  url: z.unknown().transform(sanitizeExternalUrl),
  tags: z.array(z.string().trim().max(40)).max(6).default([]),
  funder_about: trimmed(1000).optional(),
  travel_component: trimmed(1000).optional(),
  important_notes: trimmed(1000).optional(),
  sdg_focus: z.array(z.string().trim().max(80)).max(8).default([]),
  past_recipients: z.array(RecipientSchema).max(6).default([]),
  application_tips: z.array(z.string().trim().max(300)).max(8).default([]),
  discovery_source: DiscoverySourceSchema.optional(),
  verification_status: VerificationStatusSchema.optional(),
  source_checked_at: trimmed(100).optional(),
  application_status: ApplicationStatusSchema.optional(),
  status_checked_at: trimmed(100).optional(),
  status_evidence_url: z.unknown().transform(sanitizeExternalUrl).optional(),
  opens_at: trimmed(100).optional(),
  deadline_at: trimmed(100).optional(),
  deadline_timezone: trimmed(80).optional(),
  deadline_status: DeadlineStatusSchema.optional(),
  current_cycle_label: trimmed(120).optional(),
  application_url: z.unknown().transform(sanitizeExternalUrl).optional(),
  match_reasons: z.array(z.string().trim().max(240)).max(6).default([]),
});

export type Recipient = z.infer<typeof RecipientSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;

const MAX_ITEMS = 30;

export function parseOpportunities(input: unknown): Opportunity[] {
  let items: unknown[];
  if (Array.isArray(input)) {
    items = input;
  } else if (
    input &&
    typeof input === "object" &&
    Array.isArray((input as { opportunities?: unknown[] }).opportunities)
  ) {
    items = (input as { opportunities: unknown[] }).opportunities;
  } else {
    throw new Error("invalid_opportunities_payload");
  }

  const out: Opportunity[] = [];
  let dropped = 0;
  for (const item of items.slice(0, MAX_ITEMS)) {
    const result = OpportunitySchema.safeParse(item);
    if (result.success) out.push(result.data);
    else dropped++;
  }
  if (dropped > 0) console.warn(`[fundingSchema] dropped ${dropped} invalid opportunity item(s)`);
  return out;
}

export function normalizeKeywords(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ")
    .slice(0, 200);
}