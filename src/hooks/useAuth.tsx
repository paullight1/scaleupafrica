import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
