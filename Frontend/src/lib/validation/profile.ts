import { z } from "zod";
import { sanitizeUrl } from "@/lib/url";

export const BUSINESS_STAGE_OPTIONS = ["idea", "early", "growth", "scale"] as const;
export const APPLICATION_READINESS_OPTIONS = ["exploring", "preparing", "ready"] as const;
export const FUNDING_TYPE_OPTIONS = [
  "grant",
  "competition",
  "accelerator",
  "incubator",
  "development finance",
  "equity",
  "debt",
] as const;

/**
 * Profile form schema (Plan 04). Named, human messages per field — never a bare "Required".
 * Shared with tests and importable by Plan 07's DTOs.
 */
export const profileSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, "Business name is required")
    .max(120, "Keep the business name under 120 characters"),
  founder_name: z
    .string()
    .trim()
    .max(120, "Keep the founder name under 120 characters")
    .optional()
    .or(z.literal("")),
  country: z.string().min(1, "Choose a country"),
  sector: z.string().min(1, "Choose a sector"),
  short_description: z
    .string()
    .trim()
    .max(180, "Keep the one-liner under 180 characters")
    .optional()
    .or(z.literal("")),
  long_description: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2000 characters")
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(255, "That web address is too long")
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || sanitizeUrl(v) !== null,
      "Enter a valid web address like https://example.com",
    ),
  email: z
    .string()
    .trim()
    .max(255, "That email is too long")
    .email("That email doesn't look right")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(40, "That phone number is too long").optional().or(z.literal("")),
  whatsapp: z
    .string()
    .trim()
    .max(40, "That WhatsApp number is too long")
    .optional()
    .or(z.literal("")),
  instagram: z.string().trim().max(120).optional().or(z.literal("")),
  linkedin: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || sanitizeUrl(v) !== null,
      "Enter a valid LinkedIn address like https://linkedin.com/in/you",
    ),
  twitter: z.string().trim().max(120).optional().or(z.literal("")),
  logo_url: z.string().trim().max(500).optional().or(z.literal("")),
  founder_photo_url: z.string().trim().max(500).optional().or(z.literal("")),
  keywords: z
    .array(
      z
        .string()
        .trim()
        .min(2, "Keywords need at least 2 characters")
        .max(30, "Keep keywords under 30 characters"),
    )
    .max(10, "Up to 10 keywords")
    .default([]),
  business_stage: z.enum(BUSINESS_STAGE_OPTIONS).nullable().optional(),
  funding_target_usd: z
    .number({ invalid_type_error: "Enter a funding target as a number" })
    .positive("Funding target must be greater than zero")
    .max(1_000_000_000, "Funding target is too large")
    .nullable()
    .optional(),
  preferred_funding_types: z
    .array(z.string().trim().min(1).max(60))
    .max(7, "Choose up to 7 funding types")
    .default([]),
  application_readiness: z.enum(APPLICATION_READINESS_OPTIONS).nullable().optional(),
  show_email: z.boolean().default(true),
  show_phone: z.boolean().default(true),
  show_whatsapp: z.boolean().default(true),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const profileFormDefaults: ProfileFormValues = {
  business_name: "",
  founder_name: "",
  country: "",
  sector: "",
  short_description: "",
  long_description: "",
  website: "",
  email: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  linkedin: "",
  twitter: "",
  logo_url: "",
  founder_photo_url: "",
  keywords: [],
  business_stage: null,
  funding_target_usd: null,
  preferred_funding_types: [],
  application_readiness: null,
  show_email: true,
  show_phone: true,
  show_whatsapp: true,
};

/**
 * Normalize validated form values into the DB payload: canonicalize URLs to their `https://`
 * form and lowercase/trim/dedupe keywords and funding preferences. `slug` is never sent — the
 * DB trigger owns it.
 */
export function normalizeProfileInput(v: ProfileFormValues) {
  const keywords = Array.from(
    new Set((v.keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean)),
  );
  const preferredFundingTypes = Array.from(
    new Set(
      (v.preferred_funding_types ?? [])
        .map((type) => type.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  return {
    business_name: v.business_name.trim(),
    founder_name: v.founder_name || null,
    country: v.country,
    sector: v.sector,
    short_description: v.short_description || null,
    long_description: v.long_description || null,
    website: v.website ? sanitizeUrl(v.website) ?? v.website : null,
    email: v.email || null,
    phone: v.phone || null,
    whatsapp: v.whatsapp || null,
    instagram: v.instagram || null,
    linkedin: v.linkedin ? sanitizeUrl(v.linkedin) ?? v.linkedin : null,
    twitter: v.twitter || null,
    logo_url: v.logo_url || null,
    founder_photo_url: v.founder_photo_url || null,
    keywords,
    business_stage: v.business_stage ?? null,
    funding_target_usd: v.funding_target_usd ?? null,
    preferred_funding_types: preferredFundingTypes,
    application_readiness: v.application_readiness ?? null,
    show_email: v.show_email,
    show_phone: v.show_phone,
    show_whatsapp: v.show_whatsapp,
  };
}
