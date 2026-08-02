import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { mapAuthError, type FriendlyError } from "@/lib/authErrors";
import { sanitizeNext } from "@shared/lib/routes";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { SEO } from "@shared/components/common/SEO";
import { AuthShell } from "@/components/common/AuthShell";
import { Illustration } from "@shared/components/common/Illustration";

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);

const AuthForgot = () => {
  const [params] = useSearchParams();
  const next = sanitizeNext(params.get("next"));
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<FriendlyError | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const backHref = `/auth?next=${encodeURIComponent(next)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setFormError(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    try {
      const { error } = await resetPassword(parsed.data);
      if (error) {
        const mapped = mapAuthError(error);
        // Rate-limit / network are genuine failures — surface them.
        if (mapped.title === "Too many attempts" || mapped.title === "Connection problem") {
          setFormError(mapped);
          return;
        }
      }
      // Otherwise always show the sent state (don't leak account existence).
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <>
        <SEO title="Check your email" noindex />
        <AuthShell illustration="mail-sent">
          <div className="text-center">
            <Illustration name="mail-sent" className="mx-auto mb-6 h-28 w-auto" />
            <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">
              Check your inbox
            </h1>
            <p className="mb-6 text-muted-foreground">
              If an account exists for <strong className="text-foreground">{email}</strong>, we've
              sent a password-reset link. Check your inbox and spam.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to={backHref}>Back to sign in</Link>
            </Button>
          </div>
        </AuthShell>
      </>
    );
  }

  return (
    <>
      <SEO title="Reset your password" noindex />
      <AuthShell>
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">
          Reset your password
        </h1>
        <p className="mb-6 text-muted-foreground">
          Enter the email you signed up with and we'll send a link to set a new password.
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? "email-error" : undefined}
              className="h-11"
            />
            {fieldError && (
              <p id="email-error" className="mt-1 text-sm text-destructive-strong">
                {fieldError}
              </p>
            )}
          </div>

          <Button type="submit" variant="default" className="w-full" disabled={busy} aria-busy={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to={backHref} className="font-semibold text-navy hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    </>
  );
};

export default AuthForgot;
