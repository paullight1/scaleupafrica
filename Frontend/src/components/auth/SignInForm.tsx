import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { PasswordField } from "@shared/components/auth/PasswordField";

interface SignInFormProps {
  email: string;
  password: string;
  errors: { email?: string; password?: string };
  busy: boolean;
  forgotHref: string;
  onChange: (field: "email" | "password", value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onMagicLink: () => void;
}

export function SignInForm({
  email,
  password,
  errors,
  busy,
  forgotHref,
  onChange,
  onSubmit,
  onMagicLink,
}: SignInFormProps) {
  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onChange("email", e.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-11"
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-destructive-strong">
              {errors.email}
            </p>
          )}
        </div>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={(e) => onChange("password", e.target.value)}
          autoComplete="current-password"
          error={errors.password}
          labelAction={
            <Link to={forgotHref} className="text-sm text-navy hover:text-navy-light">
              Forgot password?
            </Link>
          }
        />

        <Button type="submit" variant="default" className="w-full" disabled={busy} aria-busy={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {/* Passwordless is sign-in only — signInWithOtp runs with
          shouldCreateUser: false, so account creation stays explicit. */}
      <Button
        type="button"
        variant="ghost"
        className="mt-3 w-full"
        onClick={onMagicLink}
        disabled={busy}
      >
        Email me a sign-in link instead
      </Button>
    </>
  );
}
