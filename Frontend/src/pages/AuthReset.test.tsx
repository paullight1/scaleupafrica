import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import AuthReset from "@/pages/AuthReset";

const supa = vi.hoisted(() => ({
  sessionValue: null as unknown,
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}));
const updatePassword = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@shared/hooks/useAuth", () => ({ useAuth: () => ({ updatePassword }) }));
vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: supa.onAuthStateChange,
      getSession: () => Promise.resolve({ data: { session: supa.sessionValue } }),
    },
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="loc">{location.pathname}</div>;
}

function renderReset() {
  return render(
    <MemoryRouter initialEntries={["/auth/reset"]}>
      <LocationProbe />
      <AuthReset />
    </MemoryRouter>
  );
}

describe("AuthReset page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supa.sessionValue = null;
    window.location.hash = "";
  });
  afterEach(() => {
    window.location.hash = "";
  });

  it("shows the password form when a recovery session is present", async () => {
    supa.sessionValue = { user: { id: "u1" } };
    renderReset();
    expect(
      await screen.findByRole("heading", { name: "Set a new password" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("shows the expired state when the URL hash carries an error_code", async () => {
    window.location.hash = "#error=access_denied&error_code=otp_expired";
    renderReset();
    expect(
      await screen.findByRole("heading", { name: "This link has expired" })
    ).toBeInTheDocument();
  });

  it("updates the password and navigates to the default authed route", async () => {
    supa.sessionValue = { user: { id: "u1" } };
    updatePassword.mockResolvedValue({ error: null });
    renderReset();

    await screen.findByRole("heading", { name: "Set a new password" });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "newpass1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "newpass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() =>
      expect(updatePassword).toHaveBeenCalledWith("newpass1")
    );
    await waitFor(() =>
      expect(screen.getByTestId("loc").textContent).toBe("/dashboard")
    );
  });
});
