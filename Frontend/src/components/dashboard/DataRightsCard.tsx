import { useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { supabase } from "@shared/integrations/supabase/client";
import { toast } from "sonner";
import {
  ACCOUNT_DELETE_CONFIRMATION,
  accountExportFilename,
  deleteAccount,
  exportAccountData,
} from "@/lib/accountData";

export function DataRightsCard() {
  const [confirmation, setConfirmation] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const download = async () => {
    setExporting(true);
    try {
      const payload = await exportAccountData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = accountExportFilename();
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Your Cresciva data export is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't export your data.");
    } finally {
      setExporting(false);
    }
  };

  const removeAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount(confirmation);
      await supabase.auth.signOut({ scope: "local" });
      window.location.assign("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="font-display font-semibold text-ink-strong">Your data</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Download a portable copy of your Cresciva account data or permanently delete your account.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink-strong">Download my data</p>
          <p className="text-xs text-muted-foreground">Includes your profile, preferences, saved funding activity and payment ledger fields intended for portability.</p>
        </div>
        <Button type="button" variant="outline" disabled={exporting} onClick={download}>
          {exporting ? "Preparing…" : "Download JSON"}
        </Button>
      </div>

      <div className="border-t border-border pt-5">
        <p className="text-sm font-medium text-destructive">Delete my account</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This removes your public profile, account, owned media and member data. A minimal detached payment ledger may be retained for accounting and reconciliation.
        </p>
        <label htmlFor="delete-account-confirmation" className="mt-4 block text-xs font-medium text-ink-strong">
          Type <span className="font-mono">{ACCOUNT_DELETE_CONFIRMATION}</span> to confirm
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Input
            id="delete-account-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            aria-describedby="delete-account-help"
          />
          <Button
            type="button"
            variant="destructive"
            disabled={deleting || confirmation !== ACCOUNT_DELETE_CONFIRMATION}
            onClick={removeAccount}
          >
            {deleting ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
        <p id="delete-account-help" className="mt-2 text-xs text-muted-foreground">
          For security, Cresciva requires a recent sign-in before completing deletion.
        </p>
      </div>
    </div>
  );
}
