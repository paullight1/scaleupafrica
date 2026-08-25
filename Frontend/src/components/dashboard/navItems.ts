import { Home, Compass, Store, Settings, type LucideIcon } from "lucide-react";
import {
  DASHBOARD_ACCOUNT,
  DASHBOARD_FUNDING,
  DASHBOARD_HOME,
  DASHBOARD_PROFILE,
} from "@/lib/dashboard/routes";

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match the route exactly (index route). */
  end?: boolean;
  /** Carries the "new this week" dot. */
  badge?: boolean;
}

/**
 * Four tabs, four jobs — no two tabs answer the same question.
 *
 *   Home     what should I do right now?
 *   Funding  find and track money
 *   Profile  be findable
 *   Account  membership, security, preferences
 *
 * The old "Activity" tab is gone: it re-derived Home's data, and its only unique
 * content (onboarding, profile views) now sits where it is actionable — on Home
 * and on Profile respectively. The new-this-week dot moved from Home to Funding,
 * where the opportunities it counts actually live.
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { to: DASHBOARD_HOME, label: "Home", icon: Home, end: true },
  { to: DASHBOARD_FUNDING, label: "Funding", icon: Compass, badge: true },
  { to: DASHBOARD_PROFILE, label: "My profile", icon: Store },
  { to: DASHBOARD_ACCOUNT, label: "Account", icon: Settings },
];
