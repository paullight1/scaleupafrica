import { Loader2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";

interface StepProfileProps {
  fullName: string;
  businessName: string;
  organizationSize: "" | "0" | "1-20" | "21-50" | "51-100" | "101+";
  errors: { fullName?: string; businessName?: string; organizationSize?: string };
  busy: boolean;
  onChange: (field: "fullName" | "businessName" | "organizationSize", value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StepProfile({
  fullName,
  businessName,
  organizationSize,
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
        A few details help us tailor Cresciva to your business.
      </p>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="full-name">
            First name
          </Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            autoComplete="name"
            autoFocus
            placeholder="Amara"
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
            Company name
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

        <div>
          <Label htmlFor="organization-size">Organization size</Label>
          <select
            id="organization-size"
            value={organizationSize}
            onChange={(e) => onChange("organizationSize", e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
            aria-invalid={!!errors.organizationSize}
            aria-describedby={errors.organizationSize ? "organization-size-error" : undefined}
          >
            <option value="" disabled>Select organization size</option>
            <option value="0">0 (pre-launch)</option>
            <option value="1-20">1–20</option>
            <option value="21-50">21–50</option>
            <option value="51-100">51–100</option>
            <option value="101+">101+</option>
          </select>
          {errors.organizationSize && (
            <p id="organization-size-error" className="mt-1 text-sm text-destructive-strong">
              {errors.organizationSize}
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
