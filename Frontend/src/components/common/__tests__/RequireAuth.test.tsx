import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { RequireAuth } from "@/components/common/RequireAuth";

type MockAuth = { user: unknown; loading: boolean };
const authState: MockAuth = { user: null, loading: false };

type MockMfa = { challengeRequired: boolean; loading: boolean };
const mfaState: MockMfa = { challengeRequired: false, loading: false };

vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

// The guard reads MFA state to hold back aal1 sessions; mocked so these stay
// synchronous (the real hook hits supabase.auth.mfa).
vi.mock("@shared/hooks/useMfa", () => ({
  useMfa: () => mfaState,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="loc">{location.pathname + location.search}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/directory/create" element={<div>Protected content</div>} />
        </Route>
        <Route path="/auth" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
    mfaState.challengeRequired = false;
    mfaState.loading = false;
  });

  it("redirects an unauthenticated user to /auth with an encoded next", () => {
    renderAt("/directory/create");
    expect(screen.getByTestId("loc").textContent).toBe(
      "/auth?next=%2Fdirectory%2Fcreate"
    );
  });

  it("shows a loading state (no redirect) while auth is resolving", () => {
    authState.loading = true;
    renderAt("/directory/create");
    expect(screen.queryByTestId("loc")).not.toBeInTheDocument();
    expect(screen.getByText("Checking your session…")).toBeInTheDocument();
  });

  it("renders the outlet for an authenticated user", () => {
    authState.user = { id: "u1" };
    renderAt("/directory/create");
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("sends an aal1 session with a verified factor back to /auth for the challenge", () => {
    authState.user = { id: "u1" };
    mfaState.challengeRequired = true;
    renderAt("/directory/create");
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByTestId("loc").textContent).toBe(
      "/auth?next=%2Fdirectory%2Fcreate"
    );
  });

  it("waits (no outlet, no redirect) while MFA state is resolving", () => {
    authState.user = { id: "u1" };
    mfaState.loading = true;
    renderAt("/directory/create");
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.queryByTestId("loc")).not.toBeInTheDocument();
    expect(screen.getByText("Checking your session…")).toBeInTheDocument();
  });
});
