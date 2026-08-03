import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { PasswordField } from "@shared/components/auth/PasswordField";
import { PasswordStrength } from "@shared/components/auth/PasswordStrength";
import { MIN_PASSWORD_LENGTH } from "@shared/lib/passwordStrength";

interface StepPasswordProps {
  email: string;
  password: string;
  confirm: string;
  errors: { password?: string; confirm?: string };
  onChange: (field: "password" | "confirm", value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StepPassword({
  email,
  password,
  confirm,
  errors,
  onChange,
  onSubmit,
}: StepPasswordProps) {
  // Only judge the match once there is something to compare — flashing
  // "Passwords don't match" at the first keystroke of the confirm box is noise.
  // Suppressed while the field carries a submit-time error, so the same
  // sentence never appears (or gets announced) twice.
  const showMatch = confirm.length > 0 && !errors.confirm;
  const matches = password === confirm;

  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">
        Create a password
      </h1>
      <p className="mb-6 text-muted-foreground">
        At least {MIN_PASSWORD_LENGTH} characters. A few unrelated words work better than one
        complicated one.
      </p>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Hidden username field: password managers need it to associate the
            new credential with the right account when the email is on a
            previous screen. */}
        <input type="hidden" name="username" autoComplete="username" value={email} readOnly />

        <div>
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={(e) => onChange("password", e.target.value)}
            autoComplete="new-password"
            autoFocus
            error={errors.password}
            describedById="password-strength"
          />
          <PasswordStrength id="password-strength" password={password} email={email} />
        </div>

        <div>
          <PasswordField
            id="confirm"
            label="Confirm password"
            value={confirm}
            onChange={(e) => onChange("confirm", e.target.value)}
            autoComplete="new-password"
            error={errors.confirm}
            describedById="confirm-match"
          />
          <p id="confirm-match" aria-live="polite" className="mt-1 min-h-[1.25rem] text-sm">
            {showMatch &&
              (matches ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Passwords match
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-destructive-strong">
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Passwords don't match
                </span>
              ))}
          </p>
        </div>

        <Button type="submit" variant="default" className="w-full gap-2">
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </>
  );
}
