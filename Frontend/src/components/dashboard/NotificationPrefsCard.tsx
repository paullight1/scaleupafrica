import { Switch } from "@shared/components/ui/switch";
import { Label } from "@shared/components/ui/label";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { useMyPreferences, useUpdatePreferences } from "@/hooks/queries/dashboard";

const ROWS = [
  {
    key: "email_new_funding" as const,
    label: "New funding opportunities",
    hint: "We'll email you when fresh opportunities match your business.",
  },
  {
    key: "email_product_updates" as const,
    label: "Product updates",
    hint: "Occasional news about new Cresciva features.",
  },
];

/**
 * Pillar C notification prefs. Two switches upserting user_preferences
 * (optimistic). No row yet → defaults (new-funding on, updates off).
 */
export function NotificationPrefsCard() {
  const { data, isPending, isError, refetch } = useMyPreferences();
  const update = useUpdatePreferences();

  const prefs = {
    email_new_funding: data?.email_new_funding ?? true,
    email_product_updates: data?.email_product_updates ?? false,
  };

  if (isPending) return <CardSkeleton lines={3} />;
  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <ErrorState
          compact
          title="Couldn't load your preferences"
          message="Please try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-lg font-semibold text-ink-strong">Email notifications</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We'll use these when email alerts launch.
      </p>

      <div className="mt-4 divide-y divide-border">
        {ROWS.map((row) => (
          <div key={row.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div>
              <Label htmlFor={`pref-${row.key}`} className="text-sm font-medium text-foreground">
                {row.label}
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">{row.hint}</p>
            </div>
            <Switch
              id={`pref-${row.key}`}
              checked={prefs[row.key]}
              onCheckedChange={(next) => update.mutate({ [row.key]: next })}
              aria-label={row.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationPrefsCard;
