import { Check } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface StepIndicatorProps {
  /** 1-based. */
  current: number;
  steps: string[];
}

/**
 * Progress dots for the signup wizard.
 *
 * The dots are decorative; the "Step 2 of 3 — Create a password" text is what
 * assistive tech actually reads, so it is a real (visually hidden) sentence
 * rather than a pile of aria-labels on the dots.
 */
export function StepIndicator({ current, steps }: StepIndicatorProps) {
  return (
    <div className="mb-6">
      <p className="sr-only" aria-live="polite">
        Step {current} of {steps.length} — {steps[current - 1]}
      </p>

      <div className="flex items-center gap-2" aria-hidden="true">
        {steps.map((label, i) => {
          const index = i + 1;
          const done = index < current;
          const active = index === current;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "border-navy bg-navy text-white",
                  active && "border-navy bg-navy/10 text-navy",
                  !done && !active && "border-border bg-background text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index}
              </span>
              {index < steps.length && (
                <span
                  className={cn("h-px flex-1 transition-colors", done ? "bg-navy" : "bg-border")}
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Step {current} of {steps.length}
      </p>
    </div>
  );
}
