import { useState, type FormEvent } from "react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import type { BusinessEnrichmentRequest } from "@/lib/api/types";

export interface BusinessEnrichmentStartProps {
  onStart: (input: BusinessEnrichmentRequest) => void | Promise<void>;
  busy?: boolean;
  error?: string | null;
  initialBusinessName?: string | null;
}

export function BusinessEnrichmentStart({
  onStart,
  busy = false,
  error = null,
  initialBusinessName = "",
}: BusinessEnrichmentStartProps) {
  const [businessName, setBusinessName] = useState(initialBusinessName ?? "");
  const [website, setWebsite] = useState("");
  const [countryHint, setCountryHint] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = businessName.trim();
    if (name.length < 2 || busy) return;
    void onStart({
      businessName: name,
      ...(website.trim() ? { website: website.trim() } : {}),
      ...(countryHint.trim() ? { countryHint: countryHint.trim() } : {}),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink-strong">Tell Cresciva your organisation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with the name only. A website or country helps when several organisations have similar names.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive-strong">
          {error}
        </div>
      ) : null}

      <div>
        <Label htmlFor="enrichment-business-name" className="mb-1.5 block">Business name</Label>
        <Input
          id="enrichment-business-name"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          maxLength={160}
          placeholder="Top100 Africa Future Leaders"
          autoComplete="organization"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="enrichment-website" className="mb-1.5 block">Website (optional)</Label>
          <Input
            id="enrichment-website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            maxLength={300}
            placeholder="https://example.org"
            inputMode="url"
          />
        </div>
        <div>
          <Label htmlFor="enrichment-country" className="mb-1.5 block">Country (optional)</Label>
          <Input
            id="enrichment-country"
            value={countryHint}
            onChange={(event) => setCountryHint(event.target.value)}
            maxLength={120}
            placeholder="Nigeria"
          />
        </div>
      </div>

      <Button type="submit" disabled={busy || businessName.trim().length < 2}>
        {busy ? "Researching organisation…" : "Find my organisation"}
      </Button>
    </form>
  );
}

export default BusinessEnrichmentStart;
