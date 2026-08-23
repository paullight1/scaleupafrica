import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@shared/hooks/useAuth";
import { useMfa } from "@shared/hooks/useMfa";
import { MfaChallenge } from "@shared/components/auth/MfaChallenge";
import { sanitizeNext } from "@shared/lib/routes";
import { adminUrl, isAdminPath } from "@shared/lib/crossApp";
import { SEO } from "@shared/components/common/SEO";
import { AuthShell } from "@/components/common/AuthShell";
import { AuthAlert } from "@/components/auth/AuthAlert";
import { SignInForm } from "@/components/auth/SignInForm";
import { CheckEmailPanel } from "@/components/auth/CheckEmailPanel";
import { useResendCooldown } from "@/hooks/useResendCooldown";
import { useCallbackError } from "@/lib/authCallbackError";
import { mapAuthError, type FriendlyError } from "@/lib/authErrors";

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);

// Sign-in deliberately does NOT enforce the signup minimum: an account created
// under the old 6-character rule must still be able to sign in.
const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(72),
});

/**
 * Sign-in — password or a passwordless link/code — plus the second
 * factor step-up. Account creation lives at /auth/signup.
 */
const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = sanitizeNext(params.get("next"));
  const {
    user,
    loading,
    signIn,
    signInWithOtp,
    verifyEmailOtp,
    signOut,
  } = useAuth();
  const { challengeRequired, loading: mfaLoading } = useMfa();
  const callbackError = useCallbackError();
  const { cooldown, start: startCooldown } = useResendCooldown();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<FriendlyError | null>(null);
  const [busy, setBusy] = useState(false);
  // Address a passwordless link/code was just sent to (null = not in that state).
  const [magicEmail, setMagicEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  // Redirect once a *fully* authenticated session appears (password sign-in,
  // OAuth return, magic link, or email confirmation). An account with a verified
  // TOTP factor lands here at aal1 first — hold the redirect until the challenge
  // below upgrades the session, otherwise the second factor is skippable.
  useEffect(() => {
    if (!loading && !mfaLoading && user && !challengeRequired) {
      // `next` may point into the AdminPanel bundle (AdminGuard bounces staff
      // here with ?next=/admin/…). That's a different router — leave the app.
      if (isAdminPath(next)) {
        window.location.replace(adminUrl(next));
        return;
      }
      navigate(next, { replace: true });
    }
  }, [user, loading, mfaLoading, challengeRequired, navigate, next]);

  const setField = (field: "email" | "password", value: string) => {
    if (field === "email") setEmail(value);
    else setPassword(value);
    setFieldErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setBusy(true);
    try {
      const { error } = await signIn(parsed.data.email, parsed.data.password);
      if (error) {
        setFormError(mapAuthError(error));
        return;
      }
      toast.success("Welcome back.");
    } finally {
      setBusy(false);
    }
  };

  const handleMagicLink = async () => {
    setFormError(null);
    setFieldErrors({});

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldErrors({ email: parsed.error.issues[0].message });
      return;
    }

    setBusy(true);
    try {
      const { error } = await signInWithOtp(parsed.data, next);
      if (error) {
        setFormError(mapAuthError(error));
        return;
      }
      setMagicEmail(parsed.data);
      startCooldown();
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmed = otpCode.trim();
    if (!/^\d{6}$/.test(trimmed) || !magicEmail) {
      setFormError({ title: "Check the code", message: "Enter the 6-digit code from the email." });
      return;
    }

    setBusy(true);
    try {
      const { error } = await verifyEmailOtp(magicEmail, trimmed);
      if (error) {
        setFormError(mapAuthError(error));
        setOtpCode("");
        return;
      }
      // Session lands; the redirect effect (or the MFA challenge) takes over.
    } finally {
      setBusy(false);
    }
  };

  const handleResendMagic = async () => {
    if (!magicEmail || cooldown > 0) return;
    const { error } = await signInWithOtp(magicEmail, next);
    if (error) {
      setFormError(mapAuthError(error));
      return;
    }
    toast.success("Sign-in email resent.");
    startCooldown();
  };

  const forgotHref = `/auth/forgot?next=${encodeURIComponent(next)}`;
  const signUpHref = `/auth/signup?next=${encodeURIComponent(next)}`;

  // ---- Legacy entry point ----
  // /auth?mode=signup predates the wizard and is still linked from marketing
  // CTAs and already-sent emails. Forward it, keeping ?next= intact.
  if (params.get("mode") === "signup") {
    return <Navigate to={signUpHref} replace />;
  }

  // ---- Second factor (first factor done, session still at aal1) ----
  // Takes priority over every other state: whatever got the user here, the
  // sign-in is not finished until the TOTP code is accepted.
  if (user && challengeRequired) {
    return (
      <>
        <SEO title="Two-factor verification" noindex />
        <AuthShell>
          <MfaChallenge
            onVerified={() => navigate(next, { replace: true })}
            onCancel={() => {
              void signOut();
              setMagicEmail(null);
              setOtpCode("");
            }}
          />
        </AuthShell>
      </>
    );
  }

  // ---- Passwordless: link/code sent ----
  if (magicEmail) {
    return (
      <>
        <SEO title="Check your email" noindex />
        <AuthShell illustration="mail-sent">
          <CheckEmailPanel
            title="Check your email"
            description="We sent a sign-in link to"
            email={magicEmail}
            error={formError}
            cooldown={cooldown}
            onResend={handleResendMagic}
            secondaryLabel="Back to sign in"
            onSecondary={() => {
              setMagicEmail(null);
              setOtpCode("");
              setFormError(null);
            }}
            otp={{ value: otpCode, onChange: setOtpCode, onSubmit: handleVerifyOtp, busy }}
          />
        </AuthShell>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Sign in"
        description="Sign in to Cresciva — one credible profile and real funding leads for African SME founders."
      />
      <AuthShell>
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">Welcome back</h1>
        <p className="mb-6 text-muted-foreground">
          Sign in to manage your directory profile and funding leads.
        </p>

        <AuthAlert error={formError ?? callbackError} />

        <SignInForm
          email={email}
          password={password}
          errors={fieldErrors}
          busy={busy}
          forgotHref={forgotHref}
          onChange={setField}
          onSubmit={handleSubmit}
          onMagicLink={handleMagicLink}
        />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to={signUpHref} className="font-semibold text-navy hover:underline">
            Create an account
          </Link>
        </p>
      </AuthShell>
    </>
  );
};

export default Auth;
