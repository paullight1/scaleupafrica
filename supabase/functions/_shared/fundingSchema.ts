// MIRROR of src/lib/fundingSchema.ts — change BOTH.
// Deno edge functions cannot import from src/; kept byte-similar with the client copy.
// Plan 07 (NestJS) removes this duplication when the API owns aggregation.
import { z } from "npm:zod@3";

/**
 * Return a safe absolute href only for http/https URLs. Everything else — including
 * `javascript:`, `data:`, `vbscript:`, relative strings, and garbage — becomes null.
 * No model-supplied string may reach an <a href> without passing through here.
 */
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
  url: z.unknown().transform(sanitizeExternalUrl), // nullable — card hides the button if null
  tags: z.array(z.string().trim().max(40)).max(6).default([]),
  funder_about: trimmed(1000).optional(),
  travel_component: trimmed(1000).optional(),
  important_notes: trimmed(1000).optional(),
  sdg_focus: z.array(z.string().trim().max(80)).max(8).default([]),
  past_recipients: z.array(RecipientSchema).max(6).default([]),
  application_tips: z.array(z.string().trim().max(300)).max(8).default([]),
});

export type Recipient = z.infer<typeof RecipientSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;

const MAX_ITEMS = 30;

/**
 * Validate model / cache output into a clean Opportunity[]. Accepts either an array
 * or `{ opportunities: [...] }`. Invalid ITEMS are dropped (an empty array is a valid
 * "no matches" result). A payload missing the shape entirely is an ERROR.
 */
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

/**
 * Deterministic cache key. MUST match the client copy exactly (shared cache keys).
 * "FinTech, Nigeria" and "nigeria fintech" both normalize to "fintech nigeria".
 */
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
