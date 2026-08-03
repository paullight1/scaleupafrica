import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { useMfa, type EnrollResult } from "@shared/hooks/useMfa";

/**
 * Two-factor enrolment, shown next to the password form on /dashboard/billing.
 *
 * The QR code Supabase returns is an SVG *string*, so it is inlined rather than
 * fetched — the secret must never leave the page as a URL.
 */
export function MfaCard() {
  const { enrolled, factors, loading, enroll, verifyEnrollment, unenroll } = useMfa();
  const [pending, setPending] = useState<EnrollResult | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    const { data, error: enrollError } = await enroll();
    setBusy(false);
    if (enrollError || !data) {
      toast.error("Couldn't start two-factor setup. Please try again.");
      return;
    }
    setPending(data);
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (!pending) return;

    setBusy(true);
    const { error: verifyError } = await verifyEnrollment(pending.factorId, trimmed);
    setBusy(false);

    if (verifyError) {
      setError("That code isn't valid. Codes expire every 30 seconds — try the current one.");
      setCode("");
      return;
    }
    setPending(null);
    setCode("");
    toast.success("Two-factor authentication is on.");
  }

  async function turnOff(factorId: string) {
    setBusy(true);
    const { error: unenrollError } = await unenroll(factorId);
    setBusy(false);
    if (unenrollError) {
      toast.error("Couldn't turn off two-factor authentication. Please try again.");
      return;
    }
    toast.success("Two-factor authentication is off.");
  }

  return (
    <div id="two-factor" className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            enrolled ? "bg-navy/10 text-navy" : "bg-muted text-muted-foreground"
          }`}
        >
          {enrolled ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-ink-strong">
            Two-factor authentication
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {enrolled
              ? "On. You'll enter a code from your authenticator app each time you sign in."
              : "Add a second step at sign-in using an authenticator app like 1Password, Authy or Google Authenticator."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : pending ? (
        <div className="mt-5">
          <p className="mb-3 text-sm text-foreground">
            Scan this with your authenticator app, then enter the code it shows.
          </p>
          <div
            className="mx-auto mb-4 w-44 rounded-lg border border-border bg-white p-2 [&>svg]:h-auto [&>svg]:w-full"
            // Supabase returns trusted, self-generated SVG markup for the QR code.
            dangerouslySetInnerHTML={{ __html: pending.qrCode }}
          />
          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Can't scan the code?
            </summary>
            <p className="mt-2 break-all rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
              {pending.secret}
            </p>
          </details>

          <div aria-live="polite">
            {error && (
              <div
                role="alert"
                className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive-strong"
              >
                {error}
              </div>
            )}
          </div>

          <form onSubmit={confirmEnroll} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="enroll-code">Authentication code</Label>
              <Input
                id="enroll-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                aria-invalid={!!error}
                className="text-center tracking-[0.4em]"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} aria-busy={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Verifying…" : "Turn on"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setPending(null);
                  setCode("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : enrolled ? (
        <div className="mt-5">
          <Button variant="outline" disabled={busy} onClick={() => turnOff(factors[0].id)}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Turn off two-factor
          </Button>
        </div>
      ) : (
        <div className="mt-5">
          <Button disabled={busy} onClick={startEnroll}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Set up two-factor
          </Button>
        </div>
      )}
    </div>
  );
}

export default MfaCard;
