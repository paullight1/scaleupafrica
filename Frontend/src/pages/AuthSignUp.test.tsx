import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthSignUp from "@/pages/AuthSignUp";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  resendConfirmation: vi.fn(),
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));

vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@shared/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false, ...mocks }),
}));

function renderSignUp(entry = "/auth/signup") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthSignUp />
    </MemoryRouter>
  );
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

/** Walks steps 1 and 2 with valid input, leaving the form on step 3. */
async function reachProfileStep(email = "founder@example.com", password = "correct horse 9") {
  type("Email", email);
  click("Continue");
  await screen.findByRole("heading", { name: "Create a password" });
  type("Password", password);
  type("Confirm password", password);
  click("Continue");
  await screen.findByRole("heading", { name: "Tell us who you are" });
}

describe("Signup wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts on the email step and refuses to advance on an invalid address", () => {
    renderSignUp();
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();

    type("Email", "not-an-email");
    click("Continue");

    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
  });

  it("blocks the password step when the two entries differ", async () => {
    renderSignUp();
    type("Email", "founder@example.com");
    click("Continue");
    await screen.findByRole("heading", { name: "Create a password" });

    type("Password", "correct horse 9");
    type("Confirm password", "correct horse 8");
    click("Continue");

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create a password" })).toBeInTheDocument();
  });

  it("blocks a password shorter than the minimum", async () => {
    renderSignUp();
    type("Email", "founder@example.com");
    click("Continue");
    await screen.findByRole("heading", { name: "Create a password" });

    type("Password", "short7!");
    type("Confirm password", "short7!");
    click("Continue");

    expect(await screen.findByText("Use at least 8 characters")).toBeInTheDocument();
  });

  it("reveals each password field independently", async () => {
    renderSignUp();
    type("Email", "founder@example.com");
    click("Continue");
    await screen.findByRole("heading", { name: "Create a password" });

    const password = screen.getByLabelText("Password");
    const confirm = screen.getByLabelText("Confirm password");
    expect(password).toHaveAttribute("type", "password");

    const [firstToggle] = screen.getAllByRole("button", { name: "Show password" });
    fireEvent.click(firstToggle);

    expect(password).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("keeps what was typed when stepping back", async () => {
    renderSignUp();
    await reachProfileStep();

    click("Back");
    await screen.findByRole("heading", { name: "Create a password" });
    expect(screen.getByLabelText("Password")).toHaveValue("correct horse 9");

    click("Back");
    await screen.findByRole("heading", { name: "Create your account" });
    expect(screen.getByLabelText("Email")).toHaveValue("founder@example.com");
  });

  it("calls signUp once with the profile metadata and shows the confirm screen", async () => {
    mocks.signUp.mockResolvedValue({ error: null, confirmationRequired: true });
    renderSignUp("/auth/signup?next=%2Ffunding");
    await reachProfileStep();

    type("Your name (optional)", "Amara Okafor");
    type("Business name (optional)", "Kaya Logistics");
    click("Create account");

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledTimes(1));
    expect(mocks.signUp).toHaveBeenCalledWith(
      "founder@example.com",
      "correct horse 9",
      expect.objectContaining({
        metadata: { full_name: "Amara Okafor", business_name: "Kaya Logistics" },
        emailRedirectTo: expect.stringContaining("next=%2Ffunding"),
      })
    );

    expect(await screen.findByRole("heading", { name: "Confirm your email" })).toBeInTheDocument();
    // Nothing is confirmed yet, so no success toast.
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("resends confirmation with the intended post-confirmation destination", async () => {
    vi.useFakeTimers();
    try {
      mocks.signUp.mockResolvedValue({ error: null, confirmationRequired: true });
      mocks.resendConfirmation.mockResolvedValue({ error: null });
      renderSignUp("/auth/signup?next=%2Ffunding");

      type("Email", "founder@example.com");
      click("Continue");
      type("Password", "correct horse 9");
      type("Confirm password", "correct horse 9");
      click("Continue");
      await act(async () => click("Create account"));

      expect(mocks.signUp).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("heading", { name: "Confirm your email" })).toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(60_000));
      await act(async () => fireEvent.click(screen.getByRole("button", { name: /resend/i })));

      expect(mocks.resendConfirmation).toHaveBeenCalledWith("founder@example.com", "/funding");
    } finally {
      vi.useRealTimers();
    }
  });

  it("submits without the optional fields", async () => {
    mocks.signUp.mockResolvedValue({ error: null, confirmationRequired: true });
    renderSignUp();
    await reachProfileStep();
    click("Create account");

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledTimes(1));
    expect(mocks.signUp.mock.calls[0][2].metadata).toEqual({
      full_name: "",
      business_name: "",
    });
  });

  it("toasts on a live session when email confirmation is off", async () => {
    mocks.signUp.mockResolvedValue({ error: null, confirmationRequired: false });
    renderSignUp();
    await reachProfileStep();
    click("Create account");

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Account created."));
    expect(screen.queryByRole("heading", { name: "Confirm your email" })).not.toBeInTheDocument();
  });

  it("offers a sign-in shortcut when the address is already registered", async () => {
    mocks.signUp.mockResolvedValue({
      error: { code: "user_already_exists" },
      confirmationRequired: false,
    });
    renderSignUp("/auth/signup?next=%2Ffunding");
    await reachProfileStep();
    click("Create account");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("An account with this email already exists.");
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute(
      "href",
      "/auth?next=%2Ffunding"
    );
  });
});
