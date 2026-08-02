import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@shared/integrations/supabase/client";
import { runSignOutCleanup } from "@shared/hooks/signOutCleanup";

type SignUpResult = { error: AuthError | null; confirmationRequired: boolean };

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  /** Returns confirmationRequired=true when signUp yields a user but no session. */
  signUp: (
    email: string,
    password: string,
    opts?: { emailRedirectTo?: string }
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
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
};

const noopAsync = async () => ({ error: null });

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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, opts) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: opts?.emailRedirectTo },
    });
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
    const redirectTo = `${window.location.origin}/auth?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    return { error };
  };

  const signInWithOtp: AuthContextValue["signInWithOtp"] = async (email, next) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Same sanitised `next` contract as password + OAuth sign-in.
        emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`,
        shouldCreateUser: false,
      },
    });
    return { error };
  };

  const verifyEmailOtp: AuthContextValue["verifyEmailOtp"] = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    return { error };
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    return { error };
  };

  const updatePassword: AuthContextValue["updatePassword"] = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const resendConfirmation: AuthContextValue["resendConfirmation"] = async (email) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // App-registered teardown (e.g. per-user caches in localStorage on shared devices).
    runSignOutCleanup();
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
