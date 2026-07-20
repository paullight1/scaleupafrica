import { AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSetProfileVisibility } from "@/hooks/queries/dashboard";
import type { Profile } from "@/lib/dashboard/types";

/**
 * Pillar B visibility toggle. Flips profiles.status between active/hidden only.
 * Disabled and locked when the profile is flagged (under review).
 */
export function VisibilityCard({ profile }: { profile: Profile }) {
  const setVisibility = useSetProfileVisibility();
  const flagged = profile.status === "flagged";
  const visible = profile.status === "active";

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label htmlFor="visibility-switch" className="font-display text-lg font-semibold text-ink-strong">
            Visible in the directory
          </Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Hiding removes you from the public directory; your direct link stops working too.
          </p>
        </div>
        <Switch
          id="visibility-switch"
          checked={visible}
          disabled={flagged || setVisibility.isPending}
          onCheckedChange={(next) =>
            setVisibility.mutate({ profileId: profile.id, status: next ? "active" : "hidden" })
          }
          aria-label="Visible in the directory"
        />
      </div>

      {flagged && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-ink-strong"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          Your profile is under review — contact support.
        </div>
      )}
    </div>
  );
}

export default VisibilityCard;
