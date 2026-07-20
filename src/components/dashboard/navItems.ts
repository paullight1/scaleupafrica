import { LayoutDashboard, Store, TrendingUp, CreditCard, type LucideIcon } from "lucide-react";

export interface DashboardNavItem {
  to: string;
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel: string;
  icon: LucideIcon;
  /** Match the route exactly (index route). */
  end?: boolean;
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { to: "/dashboard", label: "Funding home", shortLabel: "Home", icon: LayoutDashboard, end: true },
  { to: "/dashboard/profile", label: "My profile", shortLabel: "Profile", icon: Store },
  { to: "/dashboard/activity", label: "Activity", shortLabel: "Activity", icon: TrendingUp },
  { to: "/dashboard/billing", label: "Account & billing", shortLabel: "Account", icon: CreditCard },
];
