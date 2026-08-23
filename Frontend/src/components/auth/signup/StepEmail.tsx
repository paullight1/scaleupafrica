import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";

interface StepEmailProps {
  email: string;
  error?: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  signInHref: string;
}

export function StepEmail({
  email,
  error,
  onChange,
  onSubmit,
  signInHref,
}: StepEmailProps) {
  return (
    <>
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-strong">
        Create your account
      </h1>
      <p className="mb-6 text-muted-foreground">
        Free to join. List your business on the Pan-African SME directory.
      </p>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="email"
            autoFocus
            aria-invalid={!!error}
            aria-describedby={error ? "email-error" : undefined}
            className="h-11"
          />
          {error && (
            <p id="email-error" className="mt-1 text-sm text-destructive-strong">
              {error}
            </p>
          )}
        </div>

        <Button type="submit" variant="default" className="w-full gap-2">
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to={signInHref} className="font-semibold text-navy hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
