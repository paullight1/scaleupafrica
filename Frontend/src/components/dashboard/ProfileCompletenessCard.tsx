import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { computeCompleteness } from "@/lib/dashboard/profileCompleteness";
import type { Profile } from "@/lib/dashboard/types";

/**
 * Pillar B completeness meter. Bar color: <40 warning, 40–79 orange, ≥80 teal.
 * Lists up to 3 top-weighted gaps, each deep-linking into the profile form.
 */
export function ProfileCompletenessCard({ profile }: { profile: Profile }) {
  const { percent, missing } = computeCompleteness(profile);

  const barColor =
    percent < 40 ? "bg-warning" : percent < 80 ? "bg-primary" : "bg-success";
  const complete = percent >= 100;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink-strong">Profile completeness</h2>
        <span className="font-display text-2xl font-bold tabular-nums text-ink-strong">
          {percent}%
        </span>
      </div>

      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div
          className={cn("h-full rounded-full transition-[width]", barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {complete ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-success-strong">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Your storefront is complete. Now share it far and wide.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">Finish these to stand out:</p>
          <ul className="mt-2 space-y-1">
            {missing.slice(0, 3).map((m) => (
              <li key={m.key}>
                <Link
                  to={m.href}
                  className="group flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  <span>{m.label}</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default ProfileCompletenessCard;
