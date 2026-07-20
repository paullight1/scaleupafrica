import { Outlet } from "react-router-dom";
import { SkipLink } from "@/components/common/SkipLink";
import { AppHeader } from "@/components/common/AppHeader";
import { AppFooter } from "@/components/common/AppFooter";

/**
 * Global chrome for every non-admin route: skip link, auth-aware header,
 * focusable main content region, and footer. Used as a layout route element.
 */
export function SiteLayout() {
  return (
    <>
      <SkipLink />
      <AppHeader />
      <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
        <Outlet />
      </main>
      <AppFooter />
    </>
  );
}

export default SiteLayout;
