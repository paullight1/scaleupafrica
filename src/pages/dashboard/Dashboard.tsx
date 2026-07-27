import { Navigate, Route, Routes } from "react-router-dom";
import { SEO } from "@/components/common/SEO";
import { useFundingFeed } from "@/hooks/queries/dashboard";
import { countNewThisWeek } from "@/lib/dashboard/feed";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";
import DashboardHome from "./DashboardHome";
import DashboardProfile from "./DashboardProfile";
import DashboardBilling from "./DashboardBilling";
import DashboardActivity from "./DashboardActivity";

/**
 * Dashboard shell (plan 03). Mounted by the orchestrator at `/dashboard/*`
 * inside <RequireAuth> + <SiteLayout>. The global navy AppHeader + AppFooter
 * come from SiteLayout; this adds a HubSpot-style left section-nav (md+) and a
 * mobile bottom tab bar, and owns its own nested routing.
 */
export default function Dashboard() {
  const feedQ = useFundingFeed();
  const newCount = feedQ.data ? countNewThisWeek(feedQ.data) : 0;

  return (
    <>
      <SEO title="Dashboard" description="Your Cresciva dashboard." noindex />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <div className="md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
          <DashboardNav newCount={newCount} />

          <div className="min-w-0 pb-24 md:pb-0">
            <Routes>
              <Route index element={<DashboardHome />} />
              <Route path="profile" element={<DashboardProfile />} />
              <Route path="billing" element={<DashboardBilling />} />
              <Route path="activity" element={<DashboardActivity />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>

      <DashboardMobileNav newCount={newCount} />
    </>
  );
}
