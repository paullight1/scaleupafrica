import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Auth from "@/pages/Auth";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithOtp: vi.fn(),
  verifyEmailOtp: vi.fn(),
  resendConfirmation: vi.fn(),
  signOut: vi.fn(),
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));

vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false, ...mocks }),
}));
vi.mock("@shared/hooks/useMfa", () => ({
  useMfa: () => ({ challengeRequired: false, loading: false }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="loc">{location.pathname + location.search}</div>;
}

function renderAuth(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/signup" element={<div>signup wizard</div>} />
      </Routes>
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

  it("does not enforce the signup minimum length on an existing password", async () => {
    mocks.signIn.mockResolvedValue({ error: null });
    renderAuth("/auth");
    // 6 characters — valid under the old policy, so sign-in must still try.
    fillForm("founder@example.com", "old123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mocks.signIn).toHaveBeenCalledWith("founder@example.com", "old123");
  });

  it("forwards the legacy ?mode=signup entry point to /auth/signup, keeping next", () => {
    renderAuth("/auth?mode=signup&next=%2Ffunding");

    expect(screen.getByText("signup wizard")).toBeInTheDocument();
    expect(screen.getByTestId("loc").textContent).toContain("/auth/signup");
    expect(screen.getByTestId("loc").textContent).toContain("next=%2Ffunding");
  });

  it("links to the signup wizard, preserving next", () => {
    renderAuth("/auth?next=%2Ffunding");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/auth/signup?next=%2Ffunding"
    );
  });

  describe("provider callback failures", () => {
    const original = window.location;

    afterEach(() => {
      Object.defineProperty(window, "location", { value: original, writable: true });
    });

    function stubLocation(search: string, hash: string) {
      Object.defineProperty(window, "location", {
        value: { ...original, pathname: "/auth", search, hash },
        writable: true,
      });
      vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    }

    it("surfaces an OAuth error carried on the query string", async () => {
      stubLocation("?error=access_denied&error_code=access_denied", "");
      renderAuth("/auth");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Sign-in cancelled");
    });

    it("surfaces an error carried on the hash fragment", async () => {
      stubLocation("", "#error=access_denied&error_code=otp_expired");
      renderAuth("/auth");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Link expired");
    });

    it("explains a misconfigured provider without leaking the raw message", async () => {
      stubLocation("?error_code=validation_failed", "");
      renderAuth("/auth");

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("That sign-in method is unavailable");
      expect(alert).not.toHaveTextContent("OAuth secret");
    });

    it("scrubs the error params from the URL so a refresh doesn't repeat them", async () => {
      stubLocation("?error_code=access_denied&next=%2Ffunding", "");
      renderAuth("/auth");

      await screen.findByRole("alert");
      const [, , url] = vi.mocked(window.history.replaceState).mock.calls[0];
      expect(url).toBe("/auth?next=%2Ffunding");
    });
  });
});
