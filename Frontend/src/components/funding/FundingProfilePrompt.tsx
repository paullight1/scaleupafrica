import { Link } from "react-router-dom";
import { Button } from "@shared/components/ui/button";
import { editProfileHref } from "@/lib/dashboard/routes";

export interface FundingProfilePromptInput {
  country?: string | null;
  sector?: string | null;
  businessStage?: string | null;
  preferredFundingTypes?: string[] | null;
  fundingTargetUsd?: number | null;
  applicationReadiness?: string | null;
}

export function FundingProfilePrompt({ profile }: { profile: FundingProfilePromptInput }) {
  const missing: Array<{ label: string; section: "identity" | "matching" }> = [];
  if (!profile.country) missing.push({ label: "Add your country", section: "identity" });
  if (!profile.sector) missing.push({ label: "Add your sector", section: "identity" });
  if (!profile.businessStage) missing.push({ label: "Add business stage", section: "matching" });
  if (!profile.preferredFundingTypes?.length) missing.push({ label: "Add preferred funding types", section: "matching" });
  if (!profile.fundingTargetUsd) missing.push({ label: "Add funding target", section: "matching" });
  if (!profile.applicationReadiness) missing.push({ label: "Add application readiness", section: "matching" });

  if (!missing.length) return null;

  return (
    <aside className="rounded-xl border border-border bg-surface-subtle p-5">
      <h2 className="font-display text-lg font-semibold text-ink-strong">Improve your funding matches</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add only the missing details below. Cresciva reranks Funding Radar automatically after you save.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {missing.map((item) => (
          <Button key={item.label} asChild variant="outline" size="sm">
            <Link to={editProfileHref(item.section)}>{item.label}</Link>
          </Button>
        ))}
      </div>
    </aside>
  );
}