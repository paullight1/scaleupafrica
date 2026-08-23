import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
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

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      emitAuthState = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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
});
