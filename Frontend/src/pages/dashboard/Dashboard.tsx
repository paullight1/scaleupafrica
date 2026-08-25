import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { LoadingState } from "@shared/components/common/LoadingState";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

const DashboardHome = lazy(() => import("./DashboardHome"));
const DashboardFunding = lazy(() => import("./DashboardFunding"));
const DashboardProfile = lazy(() => import("./DashboardProfile"));
const DashboardAccount = lazy(() => import("./DashboardAccount"));

// The editor pulls in react-hook-form, zod resolvers and the image cropper —
// none of which a returning member who never opens it should have to download.
const DashboardProfileEdit = lazy(() => import("./DashboardProfileEdit"));

/**
 * Dashboard shell. Mounted by the orchestrator at `/dashboard/*` inside
 * <RequireAuth> + <SiteLayout>. The global navy AppHeader + AppFooter come from
 * SiteLayout; this adds a left section-nav on larger screens and owns its own
 * nested routing. Mobile dashboard destinations live in the global side drawer.
 *
 * `newCount` is read once here rather than in each page so the nav badge and the
 * pages can never disagree about what "new this week" means. For a non-member
 * the feed read returns nothing (RLS), so the count is 0 — correct: they have no
 * visibility into what arrived, and the Funding tab sells that rather than
 * badging it.
 */
export default function Dashboard() {
  const newCount = 0;

  return (
    <>
      <SEO title="Dashboard" description="Your Cresciva dashboard." noindex />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5 md:px-6 md:py-10">
        <div className="md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-6 lg:gap-8">
          <DashboardNav newCount={newCount} />

          <div className="min-w-0">
            <Suspense fallback={<LoadingState className="min-h-[40vh]" label="Loading…" />}>
              <Routes>
                <Route index element={<DashboardHome />} />
                <Route path="funding" element={<DashboardFunding />} />
                <Route path="profile" element={<DashboardProfile />} />
                <Route path="profile/edit" element={<DashboardProfileEdit />} />
                <Route path="account/*" element={<DashboardAccount />} />

                {/* Retired routes. `replace` so Back doesn't bounce the user
                    straight back into the redirect. */}
                <Route path="activity" element={<Navigate to="/dashboard" replace />} />
                <Route path="billing" element={<Navigate to="/dashboard/account/membership" replace />} />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
