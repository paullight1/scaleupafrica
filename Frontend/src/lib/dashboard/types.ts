import type { Tables } from "@shared/integrations/supabase/types";
import type { ProfileSection } from "./routes";

/** Domain aliases keep database rows aligned with the dashboard's validated unions. */
type GeneratedProfile = Tables<"profiles">;
type ProfileRow = Omit<
  GeneratedProfile,
  "application_readiness" | "business_stage" | "preferred_funding_types" | "funding_target_usd"
>;
export type Profile = ProfileRow & {
  business_stage?: string | null;
  funding_target_usd?: number | null;
  preferred_funding_types?: string[] | null;
  application_readiness?: "exploring" | "preparing" | "ready" | null;
};

type GeneratedFundingOpportunity = Tables<"funding_opportunities">;
export type FundingOpportunity = GeneratedFundingOpportunity & {
  details?: Record<string, unknown> | null;
  last_verified_at?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  verification_status?: "verified" | "stale" | "unverified" | null;
};

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
