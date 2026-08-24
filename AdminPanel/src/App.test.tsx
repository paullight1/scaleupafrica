import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: { user: null, loading: false, signIn: vi.fn(), signOut: vi.fn() },
  role: { isAdmin: false, isStaff: false, loading: false },
  mfa: { challengeRequired: false, loading: false, factors: [], challenge: vi.fn() },
}));

vi.mock("@shared/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => state.auth,
}));
vi.mock("@shared/hooks/useRole", () => ({ useRole: () => state.role }));
vi.mock("@shared/hooks/useMfa", () => ({ useMfa: () => state.mfa }));

import App from "./App";

describe("standalone admin routing", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("routes the deployment root to the local staff sign-in screen", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Staff sign in" })).toBeInTheDocument();
    expect(window.location.pathname).toMatch(/^\/admin\/?$/);
  });
});
