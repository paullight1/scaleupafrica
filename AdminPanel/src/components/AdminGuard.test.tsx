import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: {
    user: null as null | { id: string; email?: string },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
  role: { isAdmin: false, isStaff: false, loading: false },
  mfa: {
    challengeRequired: false,
    loading: false,
    factors: [] as Array<{ id: string }>,
    challenge: vi.fn(),
  },
}));

vi.mock("@shared/hooks/useAuth", () => ({ useAuth: () => state.auth }));
vi.mock("@shared/hooks/useRole", () => ({ useRole: () => state.role }));
vi.mock("@shared/hooks/useMfa", () => ({ useMfa: () => state.mfa }));

import AdminGuard from "./AdminGuard";

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/admin/"]}>
      <AdminGuard>
        <div>private admin content</div>
      </AdminGuard>
    </MemoryRouter>,
  );
}

describe("AdminGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.auth.user = null;
    state.auth.loading = false;
    state.auth.signIn.mockResolvedValue({ error: null });
    state.auth.signOut.mockResolvedValue(undefined);
    state.role.isAdmin = false;
    state.role.isStaff = false;
    state.role.loading = false;
    state.mfa.challengeRequired = false;
    state.mfa.loading = false;
    state.mfa.factors = [];
  });

  it("renders staff sign-in inside the admin app for an anonymous visitor", () => {
    renderGuard();

    expect(screen.getByRole("heading", { name: "Staff sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("rejects a non-Cresciva email before sending an authentication request", async () => {
    renderGuard();

    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "founder@gmail.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("@crescivacapital.com");
    expect(state.auth.signIn).not.toHaveBeenCalled();
  });

  it("submits a normalized Cresciva staff email", async () => {
    renderGuard();

    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: " TECH@CRESCIVACAPITAL.COM " } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(state.auth.signIn).toHaveBeenCalledWith("tech@crescivacapital.com", "password123");
    });
  });

  it("denies an authenticated account outside the corporate email domain even if it has a role", () => {
    state.auth.user = { id: "external-1", email: "admin@gmail.com" };
    state.role.isAdmin = true;
    state.role.isStaff = true;

    renderGuard();

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.queryByText("private admin content")).not.toBeInTheDocument();
  });

  it("keeps the database role as the authorization boundary for a corporate account", () => {
    state.auth.user = { id: "staff-1", email: "tech@crescivacapital.com" };

    renderGuard();

    expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    expect(screen.queryByText("private admin content")).not.toBeInTheDocument();
  });

  it("renders the MFA challenge locally instead of leaving the admin origin", () => {
    state.auth.user = { id: "staff-1", email: "tech@crescivacapital.com" };
    state.role.isAdmin = true;
    state.role.isStaff = true;
    state.mfa.challengeRequired = true;

    renderGuard();

    expect(screen.getByRole("heading", { name: "Two-factor verification" })).toBeInTheDocument();
  });

  it("renders protected content for a corporate account with the required role", () => {
    state.auth.user = { id: "staff-1", email: "tech@crescivacapital.com" };
    state.role.isAdmin = true;
    state.role.isStaff = true;

    renderGuard();

    expect(screen.getByText("private admin content")).toBeInTheDocument();
  });
});
