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
export const ACQUISITION_SOURCE_OPTIONS = ["linkedin", "whatsapp", "founders_webinar", "instagram", "facebook", "other"] as const;
const offeringSchema = z.object({ name: z.string().trim().min(1, "Add a name").max(120), description: z.string().trim().max(500).optional().or(z.literal("")), url: z.string().trim().max(500).optional().or(z.literal("")).refine((v) => !v || sanitizeUrl(v) !== null, "Enter a valid product or service link") });

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
  target_customers: z.string().trim().max(1000, "Keep this under 1000 characters").optional().or(z.literal("")),
  offerings: z.array(offeringSchema).max(10, "Add up to 10 products or services").default([]),
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
  organisation_type: z.string().trim().max(80, "Keep organisation type under 80 characters").optional().or(z.literal("")),
  operating_countries: z
    .array(z.string().trim().min(1).max(120))
    .max(30, "Choose up to 30 operating countries")
    .default([]),
  founding_year: z
    .number({ invalid_type_error: "Enter a four-digit founding year" })
    .int("Enter a four-digit founding year")
    .min(1800, "Founding year is too early")
    .max(2100, "Founding year is too late")
    .nullable()
    .optional(),
  acquisition_source: z.enum(ACQUISITION_SOURCE_OPTIONS).nullable().optional(),
  acquisition_source_other: z.string().trim().max(160).optional().or(z.literal("")),
  show_email: z.boolean().default(true),
  show_phone: z.boolean().default(true),
  show_whatsapp: z.boolean().default(true),
}).superRefine((value, ctx) => { if (value.acquisition_source === "other" && !value.acquisition_source_other?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["acquisition_source_other"], message: "Tell us where you heard about Cresciva" }); });

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const profileFormDefaults: ProfileFormValues = {
  business_name: "",
  founder_name: "",
  country: "",
  sector: "",
  short_description: "",
  long_description: "",
  target_customers: "",
  offerings: [],
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
  organisation_type: "",
  operating_countries: [],
  founding_year: null,
  acquisition_source: null,
  acquisition_source_other: "",
  show_email: true,
  show_phone: true,
  show_whatsapp: true,
};

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
  const operatingCountries = Array.from(
    new Set((v.operating_countries ?? []).map((country) => country.trim()).filter(Boolean)),
  );
  return {
    business_name: v.business_name.trim(),
    founder_name: v.founder_name || null,
    country: v.country,
    sector: v.sector,
    short_description: v.short_description || null,
    long_description: v.long_description || null,
    target_customers: v.target_customers || null,
    offerings: (v.offerings ?? []).map((item) => ({ name: item.name.trim(), description: item.description?.trim() || undefined, url: item.url ? sanitizeUrl(item.url) ?? undefined : undefined })),
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
    organisation_type: v.organisation_type?.trim() || null,
    operating_countries: operatingCountries,
    founding_year: v.founding_year ?? null,
    acquisition_source: v.acquisition_source ?? null,
    acquisition_source_other: v.acquisition_source === "other" ? v.acquisition_source_other?.trim() || null : null,
    show_email: v.show_email,
    show_phone: v.show_phone,
    show_whatsapp: v.show_whatsapp,
  };
}
