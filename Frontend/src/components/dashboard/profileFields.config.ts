import type { ProfileSection } from "@/lib/dashboard/routes";
import type { ProfileFormValues } from "@/lib/validation/profile";

export const SECTION_FIELDS: Record<ProfileSection, (keyof ProfileFormValues)[]> = {
  identity: ["business_name", "founder_name", "country", "sector", "logo_url", "founder_photo_url"],
  story: ["short_description", "long_description", "target_customers", "offerings"],
  matching: [
    "keywords", "business_stage", "funding_target_usd", "preferred_funding_types",
    "application_readiness", "organisation_type", "operating_countries", "founding_year",
  ],
  contact: [
    "website", "email", "phone", "whatsapp", "show_email", "show_phone", "show_whatsapp",
    "instagram", "linkedin", "twitter", "acquisition_source", "acquisition_source_other",
  ],
};
