import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { LoadingState } from "@shared/components/common/LoadingState";
import { useFundingFeed } from "@/hooks/queries/dashboard";
import { countNewThisWeek } from "@/lib/dashboard/feed";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardMobileNav } from "@/components/dashboard/DashboardMobileNav";
import DashboardHome from "./DashboardHome";
import DashboardFunding from "./DashboardFunding";
import DashboardProfile from "./DashboardProfile";
import DashboardAccount from "./DashboardAccount";

// The editor pulls in react-hook-form, zod resolvers and the image cropper —
// none of which a returning member who never opens it should have to download.
const DashboardProfileEdit = lazy(() => import("./DashboardProfileEdit"));

/**
 * Dashboard shell. Mounted by the orchestrator at `/dashboard/*` inside
 * <RequireAuth> + <SiteLayout>. The global navy AppHeader + AppFooter come from
 * SiteLayout; this adds a left section-nav (md+) and a mobile bottom tab bar,
 * and owns its own nested routing.
 *
 * `newCount` is read once here rather than in each page so the nav badge and the
 * pages can never disagree about what "new this week" means. For a non-member
 * the feed read returns nothing (RLS), so the count is 0 — correct: they have no
 * visibility into what arrived, and the Funding tab sells that rather than
 * badging it.
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
            <Suspense fallback={<LoadingState className="min-h-[40vh]" label="Loading…" />}>
              <Routes>
                <Route index element={<DashboardHome />} />
                <Route path="funding" element={<DashboardFunding />} />
                <Route path="profile" element={<DashboardProfile />} />
                <Route path="profile/edit" element={<DashboardProfileEdit />} />
                <Route path="account" element={<DashboardAccount />} />

                {/* Retired routes. `replace` so Back doesn't bounce the user
                    straight back into the redirect. */}
                <Route path="activity" element={<Navigate to="/dashboard" replace />} />
                <Route path="billing" element={<Navigate to="/dashboard/account#billing" replace />} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </div>

      <DashboardMobileNav newCount={newCount} />
    </>
  );
}
