import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppHeader } from "@/components/common/AppHeader";

const authState = vi.hoisted(() => ({
  user: null as unknown,
  loading: false,
  signOut: vi.fn().mockResolvedValue(undefined),
}));
const roleState = vi.hoisted(() => ({ isStaff: false }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/useRole", () => ({ useRole: () => roleState }));

function renderHeader(entry = "/") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AppHeader />
    </MemoryRouter>
  );
}

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.loading = false;
    roleState.isStaff = false;
  });

  it("shows Sign in and Get started with the correct next when logged out", () => {
    renderHeader("/");
    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/auth?next=%2F");
    const getStarted = screen.getByRole("link", { name: "Get started" });
    expect(getStarted).toHaveAttribute(
      "href",
      "/auth?mode=signup&next=/directory/create"
    );
  });

  it("shows the account menu and hides Sign in when logged in", () => {
    authState.user = { id: "u1", email: "f@example.com", user_metadata: {} };
    renderHeader("/");
    expect(screen.getByRole("button", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("toggles aria-expanded on the mobile menu button", () => {
    renderHeader("/");
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: "Close menu" })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("signs out from the mobile drawer", async () => {
    authState.user = { id: "u1", email: "f@example.com", user_metadata: {} };
    renderHeader("/");
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const signOutBtn = await screen.findByRole("button", { name: "Sign out" });
    fireEvent.click(signOutBtn);
    await waitFor(() => expect(authState.signOut).toHaveBeenCalled());
  });
});
