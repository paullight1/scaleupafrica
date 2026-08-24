import { ReactNode } from "react";
import { useAuth } from "@shared/hooks/useAuth";
import { useRole } from "@shared/hooks/useRole";
import { useMfa } from "@shared/hooks/useMfa";
import { MfaChallenge } from "@shared/components/auth/MfaChallenge";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { isAllowedAdminEmail } from "@/lib/adminAccess";
import { AdminAuthFrame, AdminSignIn } from "./AdminSignIn";

/**
 * Gates the /admin/* subtree. Authentication stays inside the standalone admin
 * bundle; authenticated users must also have the corporate email domain and an
 * explicit database role.
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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (!user) {
    return <AdminSignIn />;
  }

  const corporateEmail = isAllowedAdminEmail(user.email ?? "");
  if (!corporateEmail) {
    return <AccessDenied email={user.email} outsideDomain />;
  }

  if (roleLoading || mfaLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (challengeRequired) {
    return (
      <AdminAuthFrame>
        <MfaChallenge />
      </AdminAuthFrame>
    );
  }

  const allowed = require === "admin" ? isAdmin : isStaff;

  if (!allowed) {
    return <AccessDenied email={user.email} />;
  }

  return <>{children}</>;
};

function AccessDenied({ email, outsideDomain = false }: { email?: string; outsideDomain?: boolean }) {
  const { signOut } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-6 py-24">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-10 text-center shadow-elevated">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mb-3 font-display text-2xl font-bold text-foreground">Access denied</h1>
        <p className="mb-6 text-muted-foreground">
          {outsideDomain
            ? "Use a verified Cresciva Capital staff email to access this area."
            : "Your account does not have an assigned staff role. Contact an administrator if you believe this is incorrect."}
        </p>
        <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
        <p className="mt-6 text-xs text-muted-foreground">Signed in as {email}</p>
      </div>
    </main>
  );
}

export default AdminGuard;
