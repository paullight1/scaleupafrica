import { useEffect } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { CreditCard, Database, Bell, ShieldCheck } from "lucide-react";
import { PageHeader } from "@shared/components/common/PageHeader";
import { cn } from "@shared/lib/utils";
import BillingPanel from "@/components/billing/BillingPanel";
import { SecurityCard } from "@/components/dashboard/SecurityCard";
import { MfaCard } from "@/components/dashboard/MfaCard";
import { NotificationPrefsCard } from "@/components/dashboard/NotificationPrefsCard";
import { FundingNotificationPreferences } from "@/components/funding/FundingNotificationPreferences";
import { DataRightsCard } from "@/components/dashboard/DataRightsCard";
import { SignOutCard } from "@/components/dashboard/SignOutCard";
import {
  DASHBOARD_DATA,
  DASHBOARD_MEMBERSHIP,
  DASHBOARD_NOTIFICATIONS,
  DASHBOARD_SECURITY,
} from "@/lib/dashboard/routes";

const ACCOUNT_SECTIONS = [
  { to: DASHBOARD_MEMBERSHIP, label: "Membership", icon: CreditCard },
  { to: DASHBOARD_SECURITY, label: "Security", icon: ShieldCheck },
  { to: DASHBOARD_NOTIFICATIONS, label: "Notifications", icon: Bell },
  { to: DASHBOARD_DATA, label: "Data & account", icon: Database },
] as const;

function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-xl font-semibold text-ink-strong">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/** Account settings split into focused routes so membership opens immediately. */
export function DashboardAccount() {
  useEffect(() => {
    document.title = "Account — Cresciva";
  }, []);

  return (
    <div className="space-y-7">
      <PageHeader title="Account" subtitle="Your membership, security, preferences and data rights." />

      <nav
        aria-label="Mobile account sections"
        className="sticky top-16 z-30 -mx-4 overflow-x-auto overscroll-x-contain border-y border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-5 sm:px-5 md:hidden"
      >
        <div className="flex min-w-max gap-2">
          {ACCOUNT_SECTIONS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                "flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "border-primary bg-primary/10 text-navy"
                  : "border-border bg-card text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="md:grid md:grid-cols-[170px_minmax(0,1fr)] md:gap-6 lg:gap-8">
        <nav aria-label="Account sections" className="hidden md:block">
          <div className="sticky top-24 space-y-1 rounded-xl border border-border bg-card p-2 shadow-soft">
            {ACCOUNT_SECTIONS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-navy" : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          <Routes>
            <Route index element={<Navigate to="membership" replace />} />
            <Route path="membership" element={<BillingPanel showHeader={false} />} />
            <Route path="security" element={<><PanelHeading title="Security" description="Your password and two-factor authentication." /><div className="grid gap-6 xl:grid-cols-2"><SecurityCard /><MfaCard /></div></>} />
            <Route path="notifications" element={<><PanelHeading title="Notifications" description="Choose what Cresciva may email you about." /><div className="grid gap-6 xl:grid-cols-2"><NotificationPrefsCard /><FundingNotificationPreferences /></div></>} />
            <Route path="data" element={<><PanelHeading title="Data & account" description="Access your data or permanently close your Cresciva account." /><div className="space-y-6"><DataRightsCard /><div className="border-t border-border pt-6"><SignOutCard /></div></div></>} />
            <Route path="*" element={<Navigate to="membership" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default DashboardAccount;
