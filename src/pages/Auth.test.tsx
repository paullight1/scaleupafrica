import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Auth from "@/pages/Auth";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  resendConfirmation: vi.fn(),
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));

vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false, ...mocks }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="loc">{location.pathname + location.search}</div>;
}

function renderAuth(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <Auth />
    </MemoryRouter>
  );
}

function fillForm(email = "founder@example.com", password = "hunter2!") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

describe("Auth page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Confirm your email' (and no success toast) when signup needs confirmation", async () => {
    mocks.signUp.mockResolvedValue({ error: null, confirmationRequired: true });
    renderAuth("/auth?mode=signup");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Confirm your email")).toBeInTheDocument();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("toasts 'Account created.' when a session is returned (confirmation off)", async () => {
    mocks.signUp.mockResolvedValue({ error: null, confirmationRequired: false });
    renderAuth("/auth?mode=signup");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Account created."));
    expect(screen.queryByText("Confirm your email")).not.toBeInTheDocument();
  });

  it("renders a friendly invalid_credentials error inside role=alert", async () => {
    mocks.signIn.mockResolvedValue({ error: { code: "invalid_credentials" } });
    renderAuth("/auth");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Email or password is incorrect. Check both and try again — or reset your password below."
    );
  });

  it("shows the 'already exists' copy for a duplicate signup", async () => {
    mocks.signUp.mockResolvedValue({
      error: { code: "user_already_exists" },
      confirmationRequired: false,
    });
    renderAuth("/auth?mode=signup");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("An account with this email already exists.");
  });

  it("opens signup mode via ?mode=signup and preserves next when toggling", () => {
    renderAuth("/auth?mode=signup&next=%2Ffunding");
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByTestId("loc").textContent).toContain("next=%2Ffunding");
    expect(screen.getByTestId("loc").textContent).not.toContain("mode=signup");
  });
});
