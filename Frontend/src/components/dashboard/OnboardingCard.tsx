import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import type { OnboardingState } from "@/lib/dashboard/onboarding";

/**
 * Activation card. Replaces the old seven-checkbox `OnboardingChecklist`.
 *
 * Only the next undone step is expanded, with its reason and its button; the
 * rest are one dim line each. A list where every item shouts equally makes the
 * user choose, and choosing is the work we're supposed to be removing.
 *
 * Renders nothing at all once complete — the caller checks `state.complete`.
 * There is no "you're all set!" residue: a permanent congratulation is just a
 * card that never goes away.
 */
export function OnboardingCard({ state }: { state: OnboardingState }) {
  const { steps, doneCount, total, next } = state;
  if (!next) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <section
      aria-labelledby="onboarding-heading"
      className="rounded-xl border border-border bg-card p-6 shadow-soft"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="onboarding-heading" className="font-display text-lg font-semibold text-ink-strong">
          Getting started
        </h2>
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {doneCount} of {total}
        </span>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${doneCount} of ${total} steps complete`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-5 space-y-1">
        {steps.map((step) => {
          const isNext = step.key === next.key;

          if (isNext) {
            return (
              <li
                key={step.key}
                className="rounded-lg bg-secondary/60 p-4"
                aria-current="step"
              >
                <p className="font-display text-base font-semibold text-ink-strong">
                  {step.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{step.why}</p>
                {step.href && (
                  <Button asChild size="sm" className="mt-3">
                    <Link to={step.href}>
                      {step.cta ?? "Continue"}
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </li>
            );
          }

          return (
            <li
              key={step.key}
              className="flex items-center gap-3 px-4 py-1.5 text-sm"
            >
              {step.done ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              ) : (
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-border"
                  aria-hidden="true"
                />
              )}
              <span className={cn(step.done ? "text-muted-foreground" : "text-foreground/70")}>
                {step.label}
              </span>
              {step.done && <span className="sr-only">complete</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default OnboardingCard;
