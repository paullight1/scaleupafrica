import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@shared/integrations/supabase/client";
import { runSignOutCleanup } from "@shared/hooks/signOutCleanup";
import { authRedirectUrl } from "@shared/lib/authOrigin";

type SignUpResult = { error: AuthError | null; confirmationRequired: boolean };

/**
 * Profile fields captured during signup and stored on `auth.users.raw_user_meta_data`.
 * They are a convenience for pre-filling the directory profile form — never a
 * trust boundary, because the user controls every value in this object.
 */
export type SignUpMetadata = {
  full_name?: string;
  business_name?: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  /** Returns confirmationRequired=true when signUp yields a user but no session. */
  signUp: (
    email: string,
    password: string,
    opts?: { emailRedirectTo?: string; metadata?: SignUpMetadata }
  ) => Promise<SignUpResult>;
  /** Native Supabase Google OAuth. Redirects the browser back to `${origin}/auth?next=…`. */
  signInWithGoogle: (next: string) => Promise<{ error: Error | null }>;
  /**
   * Passwordless email sign-in. Sends whatever the project's "Magic Link"
   * template contains — a link ({{ .ConfirmationURL }}), a 6-digit code
   * ({{ .Token }}), or both. `shouldCreateUser` is false so this never
   * silently creates an account from a typo'd address; signup stays explicit.
   */
  signInWithOtp: (email: string, next: string) => Promise<{ error: AuthError | null }>;
  /** Redeems the 6-digit code from the same email. Establishes a session on success. */
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  resendConfirmation: (
    email: string,
    next?: string,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
};

const noopAsync = async () => ({ error: null });
const SESSION_BOOTSTRAP_TIMEOUT_MS = 10_000;
const AUTH_REQUEST_TIMEOUT_MS = 15_000;

function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  if (error instanceof Error) return new AuthError(error.message, undefined, "auth_request_failed");
  return new AuthError("Authentication request failed.", undefined, "auth_request_failed");
}

function withAuthTimeout<T>(request: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new AuthError(
          "Authentication request timed out. Please try again.",
          504,
          "auth_request_timeout"
        )
      );
    }, AUTH_REQUEST_TIMEOUT_MS);

    Promise.resolve(request).then(resolve, reject).finally(() => clearTimeout(timeoutId));
  });
}

async function runAuthRequest(
  request: PromiseLike<{ error: AuthError | null }>,
): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await withAuthTimeout(request);
    return { error };
  } catch (error) {
    return { error: toAuthError(error) };
  }
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signIn: noopAsync,
  signUp: async () => ({ error: null, confirmationRequired: false }),
  signInWithGoogle: noopAsync,
  signInWithOtp: noopAsync,
  verifyEmailOtp: noopAsync,
  resetPassword: noopAsync,
  updatePassword: noopAsync,
  resendConfirmation: noopAsync,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (timeoutId) clearTimeout(timeoutId);
      applySession(nextSession);
    });

    timeoutId = setTimeout(() => {
      if (active) {
        console.warn("Supabase did not emit an initial auth state; continuing signed out.");
        setLoading(false);
      }
    }, SESSION_BOOTSTRAP_TIMEOUT_MS);

    return () => {
      active = false;
      clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    return runAuthRequest(supabase.auth.signInWithPassword({ email, password }));
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, opts) => {
    // Drop blank metadata rather than writing empty strings into user_metadata —
    // downstream pre-fill treats "missing" and "" differently.
    const metadata = Object.fromEntries(
      Object.entries(opts?.metadata ?? {}).filter(([, v]) => !!v && v.trim() !== "")
    );

    let response;
    try {
      response = await withAuthTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: opts?.emailRedirectTo,
            ...(Object.keys(metadata).length ? { data: metadata } : {}),
          },
        })
      );
    } catch (error) {
      return { error: toAuthError(error), confirmationRequired: false };
    }
    const { data, error } = response;
    if (error) return { error, confirmationRequired: false };

    // Supabase returns a user with an empty identities array when the email is
    // already registered (and "Confirm email" is on) — surface it as a duplicate.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const duplicate = {
        name: "AuthApiError",
        message: "User already registered",
        code: "user_already_exists",
        status: 400,
      } as unknown as AuthError;
      return { error: duplicate, confirmationRequired: false };
    }

    const confirmationRequired = !!data.user && !data.session;
    return { error: null, confirmationRequired };
  };

  const signInWithGoogle: AuthContextValue["signInWithGoogle"] = async (next) => {
    const redirectTo = authRedirectUrl(`/auth?next=${encodeURIComponent(next)}`);
    // Supabase builds the OAuth URL locally; provider configuration errors can
    // only surface after the browser navigates to the Auth service.
    return runAuthRequest(
      supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            queryParams: {
              prompt: "select_account",
            },
          },
      }),
    );
  };

  const signInWithOtp: AuthContextValue["signInWithOtp"] = async (email, next) => {
    return runAuthRequest(
      supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: authRedirectUrl(`/auth?next=${encodeURIComponent(next)}`),
            shouldCreateUser: false,
          },
      }),
    );
  };

  const verifyEmailOtp: AuthContextValue["verifyEmailOtp"] = async (email, token) => {
    return runAuthRequest(supabase.auth.verifyOtp({ email, token, type: "email" }));
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
    return runAuthRequest(
      supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirectUrl("/auth/reset"),
      }),
    );
  };

  const updatePassword: AuthContextValue["updatePassword"] = async (newPassword) => {
    return runAuthRequest(supabase.auth.updateUser({ password: newPassword }));
  };

  const resendConfirmation: AuthContextValue["resendConfirmation"] = async (
    email,
    next = "/dashboard",
  ) => {
    return runAuthRequest(
      supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: authRedirectUrl(`/auth?next=${encodeURIComponent(next)}`),
        },
      }),
    );
  };

  const signOut = async () => {
    try {
      await withAuthTimeout(supabase.auth.signOut());
    } catch (error) {
      console.warn("Supabase sign-out request did not complete; local cleanup continued.", toAuthError(error));
    } finally {
      runSignOutCleanup();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithOtp,
        verifyEmailOtp,
        resetPassword,
        updatePassword,
        resendConfirmation,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
