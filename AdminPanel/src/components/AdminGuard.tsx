import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { useRole } from "@shared/hooks/useRole";
import { useMfa } from "@shared/hooks/useMfa";
import { authPathWithNext } from "@shared/lib/routes";
import { CrossAppRedirect, siteUrl } from "@shared/lib/crossApp";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";

/**
 * Gates the /admin/* subtree. Redirects anonymous users to sign in and shows a
 * clear "no access" screen to authenticated non-staff users.
 *
 * `require` controls the minimum role: "staff" (admin OR editor) for the CMS,
 * "admin" for user management, roles, settings and audit.
 *
 * This is a UX guard only — the database enforces the real boundary through RLS
 * (is_admin / is_staff). Never rely on this component for security.
 */
const AdminGuard = ({
  children,
  require = "staff",
}: {
  children: ReactNode;
  require?: "staff" | "admin";
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isStaff, loading: roleLoading } = useRole();
  const { challengeRequired, loading: mfaLoading } = useMfa();
  const location = useLocation();

  if (authLoading || roleLoading || (user && mfaLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  // Anonymous, or first factor only on an MFA-enrolled account. Both are
  // "not signed in yet" as far as the panel is concerned; sign-in (including
  // the TOTP challenge) lives in the public app, so leave the panel entirely.
  if (!user || challengeRequired) {
    return <CrossAppRedirect to={siteUrl(authPathWithNext(location))} />;
  }

  const allowed = require === "admin" ? isAdmin : isStaff;

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-secondary px-6 py-24">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-10 text-center shadow-elevated">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold text-foreground">Access denied</h1>
          <p className="mb-6 text-muted-foreground">
            This area is restricted to Cresciva staff. If you believe you should have access,
            contact an administrator.
          </p>
          <Button variant="outline" asChild>
            <a href={siteUrl("/")}>Back to site</a>
          </Button>
          <p className="mt-6 text-xs text-muted-foreground">Signed in as {user.email}</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;
