import { z } from "zod";

/**
 * Profile / directory contracts. Public directory responses intentionally exclude
 * private Funding Intelligence fields. The strict owner write contract accepts
 * only member-editable values; enrichment provenance stamps remain server-owned.
 */

export const BUSINESS_STAGE_VALUES = ["idea", "early", "growth", "scale"] as const;
export const APPLICATION_READINESS_VALUES = ["exploring", "preparing", "ready"] as const;

export function sanitizeWebUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t);
  const candidate = hasScheme ? t : `https://${t}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const optStr = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || undefined);

const webUrl = (max: number, msg: string) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || sanitizeWebUrl(v) !== null, msg)
    .transform((v) => (v ? sanitizeWebUrl(v) ?? undefined : undefined));

export const ProfileUpsertSchema = z
  .object({
    business_name: z
      .string()
      .trim()
      .min(1, "Business name is required")
      .max(120, "Keep the business name under 120 characters"),
    founder_name: optStr(120),
    country: z.string().trim().min(1, "Choose a country"),
    sector: z.string().trim().min(1, "Choose a sector"),
    short_description: optStr(180),
    long_description: optStr(2000),
    website: webUrl(255, "Enter a valid web address like https://example.com"),
    email: z
      .string()
      .trim()
      .max(255)
      .email("That email doesn't look right")
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
    phone: optStr(40),
    whatsapp: optStr(40),
    instagram: optStr(120),
    linkedin: webUrl(255, "Enter a valid LinkedIn address like https://linkedin.com/in/you"),
    twitter: optStr(120),
    logo_url: webUrl(500, "That logo URL is invalid"),
    founder_photo_url: webUrl(500, "That photo URL is invalid"),
    keywords: z
      .array(z.string().trim().min(2).max(30))
      .max(10, "Up to 10 keywords")
      .default([])
      .transform((arr) =>
        Array.from(new Set(arr.map((k) => k.trim().toLowerCase()).filter(Boolean))),
      ),
    business_stage: z.enum(BUSINESS_STAGE_VALUES).nullable().optional(),
    funding_target_usd: z.number().positive().max(1_000_000_000).nullable().optional(),
    preferred_funding_types: z
      .array(z.string().trim().min(1).max(60))
      .max(7)
      .default([])
      .transform((arr) =>
        Array.from(new Set(arr.map((v) => v.trim().toLowerCase()).filter(Boolean))),
      ),
    application_readiness: z.enum(APPLICATION_READINESS_VALUES).nullable().optional(),
    organisation_type: optStr(80),
    operating_countries: z
      .array(z.string().trim().min(1).max(120))
      .max(30)
      .default([])
      .transform((arr) => Array.from(new Set(arr.map((v) => v.trim()).filter(Boolean)))),
    founding_year: z.number().int().min(1800).max(2100).nullable().optional(),
    show_email: z.boolean().default(true),
    show_phone: z.boolean().default(true),
    show_whatsapp: z.boolean().default(true),
  })
  .strict();

export type ProfileUpsertInput = z.infer<typeof ProfileUpsertSchema>;

export const ProfileListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  country: z.string().trim().max(120).optional(),
  sector: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(60).default(24),
  sort: z.enum(["newest", "featured"]).default("featured"),
});
export type ProfileListQuery = z.infer<typeof ProfileListQuerySchema>;

export interface ProfileCard {
  id: string;
  slug: string;
  business_name: string;
  founder_name: string | null;
  logo_url: string | null;
  country: string;
  sector: string;
  short_description: string | null;
  featured: boolean;
  created_at: string;
}

/** Public directory profile. Funding targeting/readiness/provenance is private. */
export interface ProfileDetail {
  id: string;
  slug: string;
  business_name: string;
  founder_name: string | null;
  founder_photo_url: string | null;
  logo_url: string | null;
  country: string;
  sector: string;
  short_description: string | null;
  long_description: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  keywords: string[];
  status: string;
  featured: boolean;
  view_count: number;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  show_email: boolean;
  show_phone: boolean;
  show_whatsapp: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivateFundingProfileFields {
  business_stage: (typeof BUSINESS_STAGE_VALUES)[number] | null;
  funding_target_usd: number | null;
  preferred_funding_types: string[];
  application_readiness: (typeof APPLICATION_READINESS_VALUES)[number] | null;
  organisation_type: string | null;
  operating_countries: string[];
  founding_year: number | null;
  business_identity_confirmed_at: string | null;
  business_identity_source_urls: string[];
  business_identity_run_id: string | null;
  business_identity_candidate_id: string | null;
}

/** Owner-only response. */
export type OwnProfile = ProfileDetail & PrivateFundingProfileFields & { user_id: string };
