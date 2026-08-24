import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { PasswordField } from "@shared/components/auth/PasswordField";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { useAuth } from "@shared/hooks/useAuth";
import { ADMIN_EMAIL_DOMAIN, isAllowedAdminEmail } from "@/lib/adminAccess";

export function AdminAuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-elevated sm:p-10">
        <p className="mb-8 font-display text-xl font-bold text-navy">
          Cresciva <span className="text-primary">Admin</span>
        </p>
        {children}
      </div>
    </main>
  );
}

export function AdminSignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedAdminEmail(normalizedEmail)) {
      setError(`Use your verified @${ADMIN_EMAIL_DOMAIN} work email.`);
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setBusy(true);
    try {
      const { error: signInError } = await signIn(normalizedEmail, password);
      if (signInError) {
        setError("The email or password is incorrect. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminAuthFrame>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-navy/10 text-navy">
        <LockKeyhole className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="font-display text-3xl font-semibold text-ink-strong">Staff sign in</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Use your verified Cresciva Capital work account. Database roles still control which admin tools you can access.
      </p>

      {error ? (
        <div role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive-strong">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <Label htmlFor="admin-email">Work email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-11"
          />
        </div>
        <PasswordField
          id="admin-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" className="w-full" disabled={busy} aria-busy={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Access is limited to verified @{ADMIN_EMAIL_DOMAIN} accounts that have an assigned staff role.
      </p>
    </AdminAuthFrame>
  );
}
