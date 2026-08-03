import { useCallback, useEffect, useState } from "react";
import type { AuthError, Factor } from "@supabase/supabase-js";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";

export type Aal = "aal1" | "aal2";

export type MfaState = {
  /** Verified TOTP factors only. Unverified stubs are filtered out — see below. */
  factors: Factor[];
  /** True when the user has at least one verified TOTP factor. */
  enrolled: boolean;
  /** Assurance level of the *current* session. */
  currentLevel: Aal | null;
  /** Highest level this session could reach — 'aal2' means a challenge is pending. */
  nextLevel: Aal | null;
  /** Signed in at aal1 while a verified factor exists: the sign-in is incomplete. */
  challengeRequired: boolean;
  loading: boolean;
};

export type EnrollResult = {
  factorId: string;
  /** SVG markup string from Supabase — render via an <img> data URI or dangerouslySetInnerHTML. */
  qrCode: string;
  /** Base32 secret, for users who can't scan a QR code. */
  secret: string;
};

/**
 * TOTP multi-factor auth.
 *
 * Supabase creates a factor row the moment `enroll()` is called, before the user
 * has proved they stored the secret. Those rows sit at status='unverified' and
 * must not count as "MFA is on" — the hook filters them out, and `enroll()`
 * sweeps stale ones so a user who abandons the flow midway doesn't accumulate
 * junk factors (Supabase caps the number of factors per user).
 */
export function useMfa(): MfaState & {
  refresh: () => Promise<void>;
  enroll: (friendlyName?: string) => Promise<{ data: EnrollResult | null; error: AuthError | null }>;
  /** Completes enrollment. On success the session is upgraded to aal2. */
  verifyEnrollment: (factorId: string, code: string) => Promise<{ error: AuthError | null }>;
  /** Redeems a code against an already-verified factor (the sign-in step-up). */
  challenge: (factorId: string, code: string) => Promise<{ error: AuthError | null }>;
  unenroll: (factorId: string) => Promise<{ error: AuthError | null }>;
} {
  const { user, loading: authLoading } = useAuth();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Aal | null>(null);
  const [nextLevel, setNextLevel] = useState<Aal | null>(null);
  const [loading, setLoading] = useState(true);

  const read = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setFactors([]);
    } else {
      setFactors((data?.totp ?? []).filter((f) => f.status === "verified"));
    }
    // Local + synchronous: reads the decoded JWT, no network call.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setCurrentLevel((aal?.currentLevel as Aal) ?? null);
    setNextLevel((aal?.nextLevel as Aal) ?? null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await read();
    } finally {
      setLoading(false);
    }
  }, [read]);

  // Depend on the id, not the user object: a caller whose `user` identity
  // changes between renders would otherwise re-enter this effect forever,
  // leaving `loading` permanently true and the guards stuck on a spinner.
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setFactors([]);
      setCurrentLevel(null);
      setNextLevel(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      await read();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, authLoading, read]);

  const enroll: ReturnType<typeof useMfa>["enroll"] = useCallback(
    async (friendlyName) => {
      // Clear abandoned enrollments first so retries don't hit the factor cap.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const stale of existing?.all ?? []) {
        if (stale.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: stale.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: friendlyName ?? `Authenticator app`,
      });
      if (error || !data) return { data: null, error };
      return {
        data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret },
        error: null,
      };
    },
    []
  );

  const verifyEnrollment: ReturnType<typeof useMfa>["verifyEnrollment"] = useCallback(
    async (factorId, code) => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (!error) await read();
      return { error };
    },
    [read]
  );

  const challenge: ReturnType<typeof useMfa>["challenge"] = useCallback(
    async (factorId, code) => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (!error) await read();
      return { error };
    },
    [read]
  );

  const unenroll: ReturnType<typeof useMfa>["unenroll"] = useCallback(
    async (factorId) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (!error) await read();
      return { error };
    },
    [read]
  );

  return {
    factors,
    enrolled: factors.length > 0,
    currentLevel,
    nextLevel,
    // aal1 now but aal2 reachable == a verified factor exists and hasn't been used.
    challengeRequired: currentLevel === "aal1" && nextLevel === "aal2",
    loading: authLoading || loading,
    refresh,
    enroll,
    verifyEnrollment,
    challenge,
    unenroll,
  };
}
