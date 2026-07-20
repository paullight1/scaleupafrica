import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/common/LoadingState";
import { authPathWithNext } from "@/lib/routes";

/**
 * Layout-route guard for authed areas. Never flashes a redirect while auth is
 * resolving. Redirects anonymous users to /auth?next=<current location>.
 * Role logic stays in AdminGuard — this guard is auth-only.
 */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={authPathWithNext(location)} replace />;
  }

  return <Outlet />;
}

export default RequireAuth;
