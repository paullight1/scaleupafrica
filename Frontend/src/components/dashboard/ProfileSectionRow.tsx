import { Link } from "react-router-dom";
import { Check, AlertCircle, ChevronRight } from "lucide-react";
import { editProfileHref, SECTION_META, type ProfileSection } from "@/lib/dashboard/routes";
import type { MissingItem } from "@/lib/dashboard/types";

/**
 * One editable group of the profile, with its own completeness state.
 *
 * This replaces the old split where a `ProfileCompletenessCard` listed the gaps
 * and separate cards held the content — the user read "add a logo" in one place
 * and then had to find where logos live. Here the gap and the way to fix it are
 * the same row, and the row's link lands directly in that section of the form.
 */
export function ProfileSectionRow({
  section,
  gaps,
}: {
  section: ProfileSection;
  /** Completeness items belonging to this section; empty means complete. */
  gaps: MissingItem[];
}) {
  const meta = SECTION_META[section];
  const complete = gaps.length === 0;

  return (
    <li>
      <Link
        to={editProfileHref(section)}
        className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {complete ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success-strong">
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-ink-strong">{meta.title}</p>
          {complete ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{meta.blurb}</p>
          ) : (
            // Name the actual gaps rather than "incomplete" — the user should
            // know what the click will ask of them before they make it.
            <p className="mt-0.5 text-sm text-foreground/80">
              {gaps.map((g) => g.label).join(" · ")}
            </p>
          )}
        </div>

        <span className="sr-only">{complete ? "Complete." : `${gaps.length} to add.`} Edit</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

export default ProfileSectionRow;
