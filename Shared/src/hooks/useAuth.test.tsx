import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signInWithOtp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
  signOut: vi.fn(),
}));
const cleanupMocks = vi.hoisted(() => ({ runSignOutCleanup: vi.fn() }));

vi.mock("@shared/integrations/supabase/client", () => ({
  supabase: { auth: authMocks },
}));
vi.mock("@shared/hooks/signOutCleanup", () => cleanupMocks);

import { AuthProvider, useAuth } from "@shared/hooks/useAuth";

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("useAuth session bootstrap", () => {
  let emitAuthState: (event: string, session: unknown) => void;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    authMocks.signInWithOAuth.mockResolvedValue({ error: null });
    authMocks.signInWithOtp.mockResolvedValue({ error: null });
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    authMocks.resend.mockResolvedValue({ error: null });
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      emitAuthState = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function stubLocation(origin: string) {
    const parsed = new URL(origin);
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        origin: parsed.origin,
        hostname: parsed.hostname,
      },
      writable: true,
    });
  }

  it("uses Supabase INITIAL_SESSION as the single bootstrap source", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(authMocks.getSession).not.toHaveBeenCalled();

    act(() => emitAuthState("INITIAL_SESSION", null));

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("updates the context from later auth events", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const user = { id: "user-1" };
    const session = { user };

    act(() => emitAuthState("SIGNED_IN", session));

    expect(result.current.loading).toBe(false);
    expect(result.current.session).toBe(session);
    expect(result.current.user).toBe(user);
  });

  it("returns a timeout error when a sign-in request never settles", async () => {
    authMocks.signInWithPassword.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => emitAuthState("INITIAL_SESSION", null));

    let response: Awaited<ReturnType<typeof result.current.signIn>> | undefined;
    await act(async () => {
      const pending = result.current.signIn("founder@example.com", "password");
      await vi.advanceTimersByTimeAsync(15_000);
      response = await pending;
    });

    expect(response?.error?.message).toContain("timed out");
    expect(response?.error?.code).toBe("auth_request_timeout");
  });

  it("completes local sign-out cleanup when the remote request times out", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    authMocks.signOut.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => emitAuthState("INITIAL_SESSION", null));

    await act(async () => {
      const pending = result.current.signOut();
      await vi.advanceTimersByTimeAsync(15_000);
      await expect(pending).resolves.toBeUndefined();
    });

    expect(cleanupMocks.runSignOutCleanup).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("uses the canonical site for auth emails issued from a deployed host", async () => {
    stubLocation("https://cresciva-preview.vercel.app");
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => emitAuthState("INITIAL_SESSION", null));

    await act(async () => {
      await result.current.signInWithOtp("founder@example.com", "/funding");
      await result.current.resetPassword("founder@example.com");
      await result.current.resendConfirmation("founder@example.com", "/funding");
    });

    expect(authMocks.signInWithOtp).toHaveBeenCalledWith({
      email: "founder@example.com",
      options: {
        emailRedirectTo: "https://www.crescivacapital.com/auth?next=%2Ffunding",
        shouldCreateUser: false,
      },
    });
    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith("founder@example.com", {
      redirectTo: "https://www.crescivacapital.com/auth/reset",
    });
    expect(authMocks.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "founder@example.com",
      options: {
        emailRedirectTo: "https://www.crescivacapital.com/auth?next=%2Ffunding",
      },
    });
  });

  it("keeps auth email callbacks on localhost during development", async () => {
    stubLocation("http://localhost:8080");
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => emitAuthState("INITIAL_SESSION", null));

    await act(async () => {
      await result.current.resetPassword("founder@example.com");
    });

    expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith("founder@example.com", {
      redirectTo: "http://localhost:8080/auth/reset",
    });
  });
});
