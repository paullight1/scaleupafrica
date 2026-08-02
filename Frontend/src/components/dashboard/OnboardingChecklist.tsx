import { Link } from "react-router-dom";
import { Check, Circle } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { Profile } from "@/lib/dashboard/types";

interface OnboardingChecklistProps {
  profile: Profile | null;
  subscriptionActive: boolean;
  savedCount: number;
}

interface Step {
  label: string;
  done: boolean;
  href?: string;
}

/**
 * Pillar D onboarding checklist. Every item derives from server data (no
 * fragile localStorage). Auto-collapses to a single row at 7/7.
 */
export function OnboardingChecklist({
  profile,
  subscriptionActive,
  savedCount,
}: OnboardingChecklistProps) {
  const keywordsOk = Array.isArray(profile?.keywords) && profile!.keywords!.length >= 3;

  const steps: Step[] = [
    { label: "Create your account", done: true },
    { label: "Publish your business profile", done: !!profile, href: "/directory/create" },
    { label: "Add your logo", done: !!profile?.logo_url, href: "/directory/create#logo" },
    { label: "Tell your story", done: !!profile?.long_description, href: "/directory/create#long-description" },
    { label: "Add keywords for matching", done: keywordsOk, href: "/directory/create#keywords" },
    { label: "Save a funding opportunity", done: savedCount > 0, href: "/dashboard" },
    { label: "Become a member", done: subscriptionActive, href: "/dashboard/billing#billing" },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink-strong">Getting started</h2>
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {doneCount} of {steps.length}
        </span>
      </div>

      {allDone ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-success-strong">
          <Check className="h-4 w-4" aria-hidden="true" />
          You're all set. Keep an eye on your funding home for what's new.
        </p>
      ) : (
        <ul className="mt-4 space-y-1">
          {steps.map((step) => {
            const content = (
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 text-sm",
                  step.href && !step.done && "hover:bg-secondary",
                )}
              >
                {step.done ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-border" aria-hidden="true" />
                )}
                <span className={cn(step.done ? "text-muted-foreground line-through" : "text-foreground")}>
                  {step.label}
                </span>
              </div>
            );
            return (
              <li key={step.label}>
                {step.href && !step.done ? (
                  <Link to={step.href} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default OnboardingChecklist;
