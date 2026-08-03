import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { useMfa } from "@shared/hooks/useMfa";

/**
 * Second-factor step shown after a successful first-factor sign-in when the
 * account has a verified TOTP factor. Until this passes the session sits at
 * aal1, so the guards keep the user out of authed areas.
 *
 * `onVerified` fires only after Supabase upgrades the session to aal2.
 */
export function MfaChallenge({
  onVerified,
  onCancel,
}: {
  onVerified?: () => void;
  onCancel?: () => void;
}) {
  const { factors, challenge, loading } = useMfa();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const factorId = factors[0]?.id;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (!factorId) {
      setError("No authenticator is registered on this account.");
      return;
    }

    setBusy(true);
    const { error: verifyError } = await challenge(factorId, trimmed);
    setBusy(false);

    if (verifyError) {
      // Codes are time-boxed; a stale code is the common case, not an outage.
      setError("That code isn't valid. Codes expire every 30 seconds — try the current one.");
      setCode("");
      return;
    }
    onVerified?.();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-navy/10 text-navy">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h1 className="mb-2 text-center font-display text-3xl font-semibold text-ink-strong">
        Two-factor verification
      </h1>
      <p className="mb-6 text-center text-muted-foreground">
        Open your authenticator app and enter the current 6-digit code.
      </p>

      <div aria-live="polite">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive-strong"
          >
            {error}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="mfa-code">Authentication code</Label>
          <Input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            aria-invalid={!!error}
            className="h-11 text-center text-lg tracking-[0.4em]"
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy} aria-busy={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Verifying…" : "Verify"}
        </Button>
      </form>

      {onCancel && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <button type="button" className="font-semibold text-navy hover:underline" onClick={onCancel}>
            Sign in as someone else
          </button>
        </p>
      )}
    </div>
  );
}

export default MfaChallenge;
