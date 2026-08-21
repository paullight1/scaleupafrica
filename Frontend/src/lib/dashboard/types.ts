import type { Tables } from "@shared/integrations/supabase/types";
import type { ProfileSection } from "./routes";

/**
 * Domain type aliases for the dashboard. The generated Supabase snapshot predates
 * several funding_opportunities columns from 20260720140000, so the dashboard
 * extends that one row type locally until the production project is available for
 * a trustworthy type regeneration. This keeps the escape hatch explicit instead
 * of weakening recommendation-engine inputs.
 */
export type Profile = Tables<"profiles">;

type GeneratedFundingOpportunity = Tables<"funding_opportunities">;
export type FundingOpportunity = GeneratedFundingOpportunity & {
  details?: Record<string, unknown> | null;
  last_verified_at?: string | null;
};

/**
 * What a signed-in NON-member may see of the feed — the exact column set the
 * `funding_teaser` RPC returns (20260802120000). Deliberately missing `url`,
 * `summary`, `eligibility`, `amount` and `details`: those are the membership.
 */
export interface TeaserOpportunity {
  id: string;
  title: string;
  funder: string;
  type: string | null;
  deadline: string | null;
}

export interface FundingTeaser {
  items: TeaserOpportunity[];
  totalPublished: number;
}

export type Subscription = Pick<
  Tables<"subscriptions">,
  "has_access" | "expires_at" | "created_at"
>;

export interface SavedOpportunity {
  id: string;
  user_id: string;
  opportunity_id: string;
  created_at: string;
}

export interface SavedOpportunityWithFunding extends SavedOpportunity {
  funding_opportunities: FundingOpportunity | null;
}

export interface UserPreferences {
  user_id: string;
  email_new_funding: boolean;
  email_product_updates: boolean;
  created_at: string;
  updated_at: string;
}

export interface MissingItem {
  key: string;
  label: string;
  weight: number;
  section: ProfileSection;
  href: string;
}

export interface Action {
  key: string;
  title: string;
  why: string;
  href: string;
}
