import type { Tables } from "@/integrations/supabase/types";

/**
 * Domain type aliases for the dashboard. Sourced from the generated Supabase
 * types where the table exists. `saved_opportunities` and `user_preferences`
 * are added by 20260720160000_dashboard_tables.sql; until the generated types
 * are regenerated (a manual post-migration step — see HANDOFF), they are
 * declared locally here and the query layer casts the client for those two
 * tables only. Plan 07 re-points these aliases at API DTOs in one place.
 */
export type Profile = Tables<"profiles">;
export type FundingOpportunity = Tables<"funding_opportunities">;

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

/** Saved row joined with its funding opportunity (may be null if the opp was deleted). */
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

/** A missing profile field, deep-linkable into the create-profile form. */
export interface MissingItem {
  key: string;
  label: string;
  weight: number;
  href: string;
}

/** A next-best-action guidance item. */
export interface Action {
  key: string;
  title: string;
  why: string;
  href: string;
}
