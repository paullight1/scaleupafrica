import { Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@shared/components/common/ErrorBoundary";
import { SkipLink } from "@/components/common/SkipLink";
import { AppHeader } from "@/components/common/AppHeader";
import { AppFooter } from "@/components/common/AppFooter";

/**
 * Global chrome for every non-admin route: skip link, auth-aware header,
 * focusable main content region, and footer. Used as a layout route element.
 *
 * The boundary sits inside <main> so a render-time throw degrades to a panel
 * with the header and footer intact — the user can still navigate out. Keying
 * it on the pathname clears the error on navigation, which is why it needs no
 * onReset: leaving the broken route is the recovery.
 */
export function SiteLayout() {
  const { pathname } = useLocation();

  return (
    <>
      <SkipLink />
      <AppHeader />
      <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <AppFooter />
    </>
  );
}

export default SiteLayout;
