import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@shared/hooks/useAuth";
import { useMfa } from "@shared/hooks/useMfa";
import { LoadingState } from "@shared/components/common/LoadingState";
import { authPathWithNext } from "@shared/lib/routes";

/**
 * Layout-route guard for authed areas. Never flashes a redirect while auth is
 * resolving. Redirects anonymous users to /auth?next=<current location>.
 * Role logic stays in AdminGuard — this guard is auth-only.
 *
 * A user with a verified TOTP factor who is still at aal1 has only completed
 * the first factor, so they are sent back to /auth to finish the challenge.
 * Without this the second factor would be decorative: a first-factor session
 * already carries a usable JWT.
 */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const { challengeRequired, loading: mfaLoading } = useMfa();
  const location = useLocation();

  if (loading || (user && mfaLoading)) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (!user || challengeRequired) {
    return <Navigate to={authPathWithNext(location)} replace />;
  }

  return <Outlet />;
}

export default RequireAuth;
