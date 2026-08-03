import { scorePassword } from "@shared/lib/passwordStrength";
import { cn } from "@shared/lib/utils";

interface PasswordStrengthProps {
  password: string;
  /** Scored against the address so "amara@…" → "amara2024" is caught. */
  email?: string;
  /** Wired into the field's aria-describedby by the caller. */
  id?: string;
  className?: string;
}

const BAR_TONE: Record<number, string> = {
  0: "bg-destructive",
  1: "bg-destructive",
  2: "bg-amber-500",
  3: "bg-emerald-500",
  4: "bg-emerald-600",
};

const LABEL_TONE: Record<number, string> = {
  0: "text-destructive-strong",
  1: "text-destructive-strong",
  2: "text-amber-700",
  3: "text-emerald-700",
  4: "text-emerald-700",
};

/**
 * Advisory strength meter. Renders nothing for an empty password so the layout
 * doesn't jump on focus, and announces politely rather than assertively — this
 * updates on every keystroke and must not interrupt typing.
 */
export function PasswordStrength({ password, email, id, className }: PasswordStrengthProps) {
  const { score, label, hint } = scorePassword(password, { email });

  if (!password) return null;

  return (
    <div id={id} className={cn("mt-2", className)} aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < score ? BAR_TONE[score] : "bg-muted"
              )}
            />
          ))}
        </div>
        <span className={cn("text-xs font-medium", LABEL_TONE[score])}>{label}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
