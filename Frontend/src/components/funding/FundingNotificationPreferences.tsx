import { useEffect, useState } from "react";
import { Switch } from "@shared/components/ui/switch";
import { Label } from "@shared/components/ui/label";
import { Button } from "@shared/components/ui/button";
import {
  useFundingNotificationPreferences,
  useUpdateFundingNotificationPreferences,
} from "@/hooks/queries/fundingNotificationPreferences";

export function FundingNotificationPreferences() {
  const query = useFundingNotificationPreferences();
  const update = useUpdateFundingNotificationPreferences();
  const [newMatches, setNewMatches] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);

  useEffect(() => {
    if (!query.data) return;
    setNewMatches(query.data.emailNewMatches);
    setDeadlineAlerts(query.data.emailDeadlineAlerts);
  }, [query.data]);

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading funding notification preferences…</p>;
  if (query.isError) return <p role="alert" className="text-sm text-destructive-strong">Could not load funding notification preferences.</p>;

  const original = query.data ?? { emailNewMatches: true, emailDeadlineAlerts: true };
  const dirty = original.emailNewMatches !== newMatches || original.emailDeadlineAlerts !== deadlineAlerts;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="email-new-matches" className="font-medium">New funding matches</Label>
          <p className="mt-1 text-sm text-muted-foreground">Email me when an opportunity I’m watching becomes verified and open.</p>
        </div>
        <Switch id="email-new-matches" checked={newMatches} onCheckedChange={setNewMatches} />
      </div>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="email-deadline-alerts" className="font-medium">Deadline alerts</Label>
          <p className="mt-1 text-sm text-muted-foreground">Email me when a watched opportunity becomes closing soon or its confirmed deadline changes.</p>
        </div>
        <Switch id="email-deadline-alerts" checked={deadlineAlerts} onCheckedChange={setDeadlineAlerts} />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={!dirty || update.isPending}
        onClick={() => update.mutate({ emailNewMatches: newMatches, emailDeadlineAlerts: deadlineAlerts })}
      >
        {update.isPending ? "Saving…" : "Save funding alerts"}
      </Button>
      {update.isSuccess ? <p className="text-sm text-success-strong">Funding alert preferences saved.</p> : null}
      {update.isError ? <p role="alert" className="text-sm text-destructive-strong">Could not save funding alert preferences.</p> : null}
    </div>
  );
}