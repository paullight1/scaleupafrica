import { Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Illustration } from "@shared/components/common/Illustration";
import { AuthAlert } from "@/components/auth/AuthAlert";
import type { FriendlyError } from "@/lib/authErrors";

interface OtpFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
}

interface CheckEmailPanelProps {
  title: string;
  /** Sentence shown above the address; the address is appended in bold. */
  description: string;
  email: string;
  error: FriendlyError | null;
  /** Seconds remaining before another send is allowed (0 = allowed now). */
  cooldown: number;
  onResend: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
  /** Present only for passwordless sign-in, where the email also carries a code. */
  otp?: OtpFormProps;
}

/**
 * The "we've emailed you" screen, shared by signup confirmation and passwordless
 * sign-in. Both states are the same panel with a different verb, and keeping
 * them as one component keeps the resend cooldown behaviour identical — the
 * 60s Supabase rate limit applies to both and used to be duplicated.
 */
export function CheckEmailPanel({
  title,
  description,
  email,
  error,
  cooldown,
  onResend,
  secondaryLabel,
  onSecondary,
  otp,
}: CheckEmailPanelProps) {
  return (
    <div className="text-center">
      <Illustration name="mail-sent" className="mx-auto mb-6 h-28 w-auto" />
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">{title}</h1>
      <p className="mb-6 text-muted-foreground">
        {description} <strong className="text-foreground">{email}</strong>.
      </p>

      <AuthAlert error={error} />

      {otp && (
        <form onSubmit={otp.onSubmit} className="mb-4 space-y-3" noValidate>
          <Label htmlFor="otp-code" className="sr-only">
            Sign-in code
          </Label>
          <Input
            id="otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={otp.value}
            onChange={(e) => otp.onChange(e.target.value.replace(/\D/g, ""))}
            className="h-11 text-center text-lg tracking-[0.4em]"
          />
          <Button type="submit" className="w-full" disabled={otp.busy} aria-busy={otp.busy}>
            {otp.busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {otp.busy ? "Verifying…" : "Sign in with code"}
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant={otp ? "outline" : "default"}
          className="w-full"
          onClick={onResend}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
        </Button>
        <Button type="button" variant={otp ? "ghost" : "outline"} className="w-full" onClick={onSecondary}>
          {secondaryLabel}
        </Button>
      </div>
    </div>
  );
}
