import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { mapAuthError, type FriendlyError } from "@/lib/authErrors";
import { DEFAULT_AUTHED_ROUTE } from "@shared/lib/routes";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { SEO } from "@shared/components/common/SEO";
import { AuthShell } from "@/components/common/AuthShell";
import { LoadingState } from "@shared/components/common/LoadingState";

const passwordSchema = z
  .object({
    password: z.string().min(6, "Use at least 6 characters").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

type Phase = "verifying" | "form" | "invalid";

const AuthReset = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<FriendlyError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase appends recovery errors to the URL hash on expired/invalid links.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hashParams.get("error_code") || hashParams.get("error")) {
      setPhase("invalid");
      return;
    }

    let settled = false;
    const finishIfSession = (hasSession: boolean) => {
      if (settled) return;
      if (hasSession) {
        settled = true;
        setPhase("form");
      }
    };

    // The PASSWORD_RECOVERY event may fire before or after mount.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) finishIfSession(!!session);
    });

    supabase.auth.getSession().then(({ data }) => finishIfSession(!!data.session));

    // Give the client a moment to consume the recovery token, then give up.
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setPhase("invalid");
      }
    }, 3000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const parsed = passwordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const errs: { password?: string; confirm?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "password" | "confirm";
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setBusy(true);
    try {
      const { error } = await updatePassword(parsed.data.password);
      if (error) {
        setFormError(mapAuthError(error));
        return;
      }
      toast.success("Password updated.");
      navigate(DEFAULT_AUTHED_ROUTE, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  if (phase === "verifying") {
    return (
      <>
        <SEO title="Set a new password" noindex />
        <AuthShell>
          <LoadingState label="Verifying your reset link…" />
        </AuthShell>
      </>
    );
  }

  if (phase === "invalid") {
    return (
      <>
        <SEO title="Reset link expired" noindex />
        <AuthShell>
          <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">
            This link has expired
          </h1>
          <p className="mb-6 text-muted-foreground">
            This reset link is invalid or has expired. Request a new one and we'll email you a
            fresh link.
          </p>
          <Button asChild variant="default" className="w-full">
            <Link to="/auth/forgot">Request a new link</Link>
          </Button>
        </AuthShell>
      </>
    );
  }

  return (
    <>
      <SEO title="Set a new password" noindex />
      <AuthShell>
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">
          Set a new password
        </h1>
        <p className="mb-6 text-muted-foreground">
          Choose a new password for your account.
        </p>

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
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
              className="h-11"
            />
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-sm text-destructive-strong">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              aria-invalid={!!fieldErrors.confirm}
              aria-describedby={fieldErrors.confirm ? "confirm-error" : undefined}
              className="h-11"
            />
            {fieldErrors.confirm && (
              <p id="confirm-error" className="mt-1 text-sm text-destructive-strong">
                {fieldErrors.confirm}
              </p>
            )}
          </div>

          <Button type="submit" variant="default" className="w-full" disabled={busy} aria-busy={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </AuthShell>
    </>
  );
};

export default AuthReset;
