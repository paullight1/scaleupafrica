import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, ShieldCheck, LayoutDashboard, UserRound, Compass, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@shared/components/ui/sheet";
import { useAuth } from "@shared/hooks/useAuth";
import { useRole } from "@shared/hooks/useRole";
import { UserMenu } from "@/components/common/UserMenu";
import { authPathWithNext, DEFAULT_AUTHED_ROUTE } from "@shared/lib/routes";
import { adminUrl } from "@shared/lib/crossApp";
import { mapAuthError } from "@/lib/authErrors";

const navLinks = [
  { label: "Directory", to: "/directory" },
  { label: "Funding", to: "/dashboard/funding" },
  { label: "Resources", to: "/resources" },
  { label: "Blog", to: "/blog" },
  { label: "Pricing", to: "/#pricing" },
];

/**
 * Persistent, auth-aware header for every non-admin route. Solid navy always.
 * Fixes: transparent-on-scroll bug, full-reload <a> nav, invisible mobile Sign in.
 */
export function AppHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { isStaff } = useRole();

  // Close the drawer on route change.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const signInHref = authPathWithNext(location);
  const showDashboard = DEFAULT_AUTHED_ROUTE === "/dashboard";

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out.");
      navigate("/");
    } catch (err) {
      toast.error(mapAuthError(err).message);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="font-display text-xl font-bold text-white">
          Cresciva<span className="text-primary">.</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isStaff && (
            // Real document navigation — /admin is the other bundle, not a route here.
            <a
              href={adminUrl()}
              className="flex items-center gap-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </a>
          )}

          {loading ? (
            <div className="h-8 w-8 rounded-full bg-white/10" aria-hidden="true" />
          ) : user ? (
            <>
              {showDashboard && (
                <Button asChild variant="default" size="sm">
                  <Link to="/dashboard">My dashboard</Link>
                </Button>
              )}
              <UserMenu />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                <Link to={signInHref}>Sign in</Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link to="/auth/signup?next=/dashboard/profile/edit">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="rounded-lg p-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          id="mobile-nav"
          side="left"
          className="w-[min(86vw,22rem)] overflow-y-auto border-white/10 bg-navy-dark p-0 text-white lg:hidden [&>button]:right-5 [&>button]:top-5 [&>button]:text-white [&>button]:opacity-80"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex min-h-full flex-col">
            <div className="flex h-16 items-center border-b border-white/10 px-5">
              <Link to="/" className="font-display text-xl font-bold text-white">
                Cresciva<span className="text-primary">.</span>
              </Link>
            </div>

            <nav aria-label="Mobile navigation" className="flex flex-1 flex-col px-5 py-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Explore</p>
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="flex min-h-11 items-center border-b border-white/10 py-3 text-sm font-medium text-white/80 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}

              {isStaff && (
                <a
                  href={adminUrl()}
                  className="flex min-h-11 items-center gap-2 border-b border-white/10 py-3 text-sm font-medium text-white/80 hover:text-white"
                >
                  <ShieldCheck className="h-4 w-4" /> Admin panel
                </a>
              )}

              <div className="mt-6 flex flex-col gap-1">
                {loading ? null : user ? (
                  <>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Your account</p>
                    {showDashboard && (
                      <Link
                        to="/dashboard"
                        className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
                      >
                        <LayoutDashboard className="h-4 w-4" /> My dashboard
                      </Link>
                    )}
                    <Link
                      to="/dashboard/profile/edit"
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
                    >
                      <UserRound className="h-4 w-4" /> My profile
                    </Link>
                    <Link
                      to="/dashboard/funding"
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
                    >
                      <Compass className="h-4 w-4" /> Funding
                    </Link>
                    <Link
                      to="/dashboard/account/membership"
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white"
                    >
                      <Settings className="h-4 w-4" /> Account
                    </Link>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-white/10 hover:text-primary-hover"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Button
                      asChild
                      variant="secondary"
                      className="w-full border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                      <Link to={signInHref}>Sign in</Link>
                    </Button>
                    <Button asChild variant="default" className="w-full">
                      <Link to="/auth/signup?next=/dashboard/profile/edit">Get started</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

export default AppHeader;
