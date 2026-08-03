import { Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";

interface StepProfileProps {
  fullName: string;
  businessName: string;
  errors: { fullName?: string; businessName?: string };
  busy: boolean;
  onChange: (field: "fullName" | "businessName", value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StepProfile({
  fullName,
  businessName,
  errors,
  busy,
  onChange,
  onSubmit,
}: StepProfileProps) {
  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">
        Tell us who you are
      </h1>
      <p className="mb-6 text-muted-foreground">
        We'll use this to set up your directory profile. You can change both later.
      </p>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="full-name">
            Your name <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            autoComplete="name"
            autoFocus
            placeholder="Amara Okafor"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "full-name-error" : undefined}
            className="h-11"
          />
          {errors.fullName && (
            <p id="full-name-error" className="mt-1 text-sm text-destructive-strong">
              {errors.fullName}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="business-name">
            Business name <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="business-name"
            value={businessName}
            onChange={(e) => onChange("businessName", e.target.value)}
            autoComplete="organization"
            placeholder="Kaya Logistics"
            aria-invalid={!!errors.businessName}
            aria-describedby={errors.businessName ? "business-name-error" : undefined}
            className="h-11"
          />
          {errors.businessName && (
            <p id="business-name-error" className="mt-1 text-sm text-destructive-strong">
              {errors.businessName}
            </p>
          )}
        </div>

        <Button type="submit" variant="default" className="w-full" disabled={busy} aria-busy={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </>
  );
}
