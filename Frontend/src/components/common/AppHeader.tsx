import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShieldCheck, LayoutDashboard, UserRound, Compass, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@shared/components/ui/button";
import { useAuth } from "@shared/hooks/useAuth";
import { useRole } from "@shared/hooks/useRole";
import { UserMenu } from "@/components/common/UserMenu";
import { authPathWithNext, DEFAULT_AUTHED_ROUTE } from "@shared/lib/routes";
import { mapAuthError } from "@/lib/authErrors";

const navLinks = [
  { label: "Directory", to: "/directory" },
  { label: "Funding", to: "/funding" },
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

  // Esc closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
              <Link to="/admin">
                <ShieldCheck className="mr-1 h-4 w-4" /> Admin
              </Link>
            </Button>
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
                <Link to="/auth?mode=signup&next=/directory/create">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="rounded-lg p-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/10 bg-navy-dark lg:hidden"
          >
            <nav className="flex flex-col px-4 py-4 sm:px-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="border-b border-white/10 py-3 text-white/80 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}

              {isStaff && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 border-b border-white/10 py-3 text-white/80 hover:text-white"
                >
                  <ShieldCheck className="h-4 w-4" /> Admin panel
                </Link>
              )}

              <div className="mt-4 flex flex-col gap-3">
                {loading ? null : user ? (
                  <>
                    {showDashboard && (
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 py-2.5 text-white/90 hover:text-white"
                      >
                        <LayoutDashboard className="h-4 w-4" /> My dashboard
                      </Link>
                    )}
                    <Link
                      to="/directory/create"
                      className="flex items-center gap-2 py-2.5 text-white/90 hover:text-white"
                    >
                      <UserRound className="h-4 w-4" /> My profile
                    </Link>
                    <Link
                      to="/funding"
                      className="flex items-center gap-2 py-2.5 text-white/90 hover:text-white"
                    >
                      <Compass className="h-4 w-4" /> Funding
                    </Link>
                    <div className="my-1 border-t border-white/10" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-2 py-2.5 text-left text-primary hover:text-primary-hover"
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
                      <Link to="/auth?mode=signup&next=/directory/create">Get started</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default AppHeader;
