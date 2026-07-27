import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { mapAuthError, type FriendlyError } from "@/lib/authErrors";
import { sanitizeNext } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/common/SEO";
import { AuthShell } from "@/components/common/AuthShell";
import { Illustration } from "@/components/common/Illustration";

const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Use at least 6 characters").max(72),
});

const RESEND_COOLDOWN = 60;

const Auth = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "signin";
  const next = sanitizeNext(params.get("next"));
  const { user, loading, signIn, signUp, signInWithGoogle, resendConfirmation } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<FriendlyError | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect once a real session appears (password sign-in, OAuth return, or
  // email-confirmation link). Skipped while showing the confirm-your-inbox state.
  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [user, loading, navigate, next]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && cooldownRef.current) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
        }
        return c - 1;
      });
    }, 1000);
  };

  const toggleMode = () => {
    const nextParams = new URLSearchParams(params);
    if (mode === "signin") nextParams.set("mode", "signup");
    else nextParams.delete("mode");
    setParams(nextParams, { replace: true });
    setFormError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = authSchema.safeParse({ email, password });
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
      if (mode === "signup") {
        const redirect = `${window.location.origin}/auth?next=${encodeURIComponent(next)}`;
        const { error, confirmationRequired } = await signUp(
          parsed.data.email,
          parsed.data.password,
          { emailRedirectTo: redirect }
        );
        if (error) {
          setFormError(mapAuthError(error));
          return;
        }
        if (confirmationRequired) {
          // No success toast, no navigation — show the check-your-inbox state.
          setConfirmEmail(parsed.data.email);
          startCooldown();
          return;
        }
        toast.success("Account created.");
        // Redirect effect runs once the session lands.
      } else {
        const { error } = await signIn(parsed.data.email, parsed.data.password);
        if (error) {
          setFormError(mapAuthError(error));
          return;
        }
        toast.success("Welcome back.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setFormError(null);
    setBusy(true);
    const { error } = await signInWithGoogle(next);
    if (error) {
      setFormError(mapAuthError(error));
      setBusy(false);
    }
    // On success the browser redirects away; leave busy set.
  };

  const handleResend = async () => {
    if (!confirmEmail || cooldown > 0) return;
    const { error } = await resendConfirmation(confirmEmail);
    if (error) {
      setFormError(mapAuthError(error));
      return;
    }
    toast.success("Confirmation email resent.");
    startCooldown();
  };

  const forgotHref = `/auth/forgot?next=${encodeURIComponent(next)}`;

  // ---- Check-your-inbox state (email confirmation required) ----
  if (confirmEmail) {
    return (
      <>
        <SEO title="Confirm your email" noindex />
        <AuthShell illustration="mail-sent">
          <div className="text-center">
            <Illustration name="mail-sent" className="mx-auto mb-6 h-28 w-auto" />
            <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">
              Confirm your email
            </h1>
            <p className="mb-6 text-muted-foreground">
              We sent a confirmation link to <strong className="text-foreground">{confirmEmail}</strong>.
              Open it on this device to finish signing up.
            </p>

            <div
              aria-live="polite"
              className="min-h-[1.5rem]"
            >
              {formError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-left text-sm text-destructive-strong"
                >
                  {formError.message}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="default"
                className="w-full"
                onClick={handleResend}
                disabled={cooldown > 0}
              >
                {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setConfirmEmail(null);
                  setFormError(null);
                }}
              >
                Use a different email
              </Button>
            </div>
          </div>
        </AuthShell>
      </>
    );
  }

  return (
    <>
      <SEO
        title={mode === "signin" ? "Sign in" : "Create your account"}
        description="Sign in to Cresciva — one credible profile and real funding leads for African SME founders."
      />
      <AuthShell>
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {mode === "signin"
            ? "Sign in to manage your directory profile and funding leads."
            : "Free to join. List your business on the Pan-African SME directory."}
        </p>

        <Button
          type="button"
          variant="outline"
          className="mb-4 w-full"
          onClick={handleGoogle}
          disabled={busy}
        >
          Continue with Google
        </Button>

        <div className="relative my-4 text-center">
          <span className="relative z-10 bg-background px-3 text-xs text-muted-foreground">
            or with email
          </span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        </div>

        {/* Always-mounted live region so screen readers announce new errors. */}
        <div aria-live="polite">
          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive-strong"
            >
              <p className="font-semibold">{formError.title}</p>
              <p>{formError.message}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              className="h-11"
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-destructive-strong">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
              className="h-11"
            />
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-sm text-destructive-strong">
                {fieldErrors.password}
              </p>
            )}
            {mode === "signin" && (
              <div className="mt-1.5 text-right">
                <Link to={forgotHref} className="text-sm text-navy hover:text-navy-light">
                  Forgot password?
                </Link>
              </div>
            )}
          </div>

          <Button type="submit" variant="default" className="w-full" disabled={busy} aria-busy={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-semibold text-navy hover:underline"
            onClick={toggleMode}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </AuthShell>
    </>
  );
};

export default Auth;
