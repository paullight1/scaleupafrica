import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { cn } from "@shared/lib/utils";

interface PasswordFieldProps
  extends Omit<React.ComponentProps<"input">, "type" | "id"> {
  id: string;
  label: string;
  /** Validation message rendered below the field and wired to aria-describedby. */
  error?: string;
  /** Extra always-present description (strength meter, match hint) to announce. */
  describedById?: string;
  /** Right-aligned node beside the label — e.g. a "Forgot password?" link. */
  labelAction?: React.ReactNode;
}

/**
 * Password input with a show/hide toggle.
 *
 * The toggle is a real <button aria-pressed>, not an icon-with-onClick: screen
 * readers must be able to tell that the password is currently visible, and the
 * control must be reachable by keyboard. It never submits (type="button") and
 * stays out of the tab order's way by sitting after the input.
 *
 * Visibility is deliberately per-field state, so "Password" and "Confirm
 * password" reveal independently — that is the whole point of the confirm box.
 */
export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ id, label, error, describedById, labelAction, className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const errorId = `${id}-error`;

    const describedBy =
      [error ? errorId : null, describedById ?? null].filter(Boolean).join(" ") ||
      undefined;

    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id}>{label}</Label>
          {labelAction}
        </div>

        <div className="relative">
          <Input
            id={id}
            ref={ref}
            type={visible ? "text" : "password"}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn("h-11 pr-11", className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-controls={id}
            aria-label={visible ? "Hide password" : "Show password"}
            title={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {error && (
          <p id={errorId} className="mt-1 text-sm text-destructive-strong">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordField.displayName = "PasswordField";
