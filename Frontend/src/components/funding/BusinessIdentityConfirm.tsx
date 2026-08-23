import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import type { BusinessEnrichmentResponse, BusinessIdentityCandidate } from "@/lib/api/types";

export interface BusinessIdentityConfirmProps {
  result: BusinessEnrichmentResponse;
  onConfirm: (candidateId: string) => void | Promise<void>;
  onEdit: () => void;
  onReject: (candidateId?: string) => void | Promise<void>;
  busy?: boolean;
}

function SourceList({ candidate }: { candidate: BusinessIdentityCandidate }) {
  if (!candidate.sourceUrls.length) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-ink-strong">Where we found this</summary>
      <ul className="mt-2 space-y-1">
        {candidate.sourceUrls.map((url) => {
          let label = url;
          try {
            label = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            // Schema validation already constrains URLs; keep raw text if parsing ever differs.
          }
          return (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function CandidateCard({
  candidate,
  selectLabel,
  onSelect,
  busy,
}: {
  candidate: BusinessIdentityCandidate;
  selectLabel: string;
  onSelect: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink-strong">{candidate.canonicalName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {[candidate.country, candidate.website].filter(Boolean).join(" · ") || "Public organisation record"}
          </p>
        </div>
        <Badge variant="outline">{candidate.identityConfidence}% identity confidence</Badge>
      </div>
      {candidate.summary ? <p className="mt-3 text-sm text-ink">{candidate.summary}</p> : null}
      <SourceList candidate={candidate} />
      <Button className="mt-4" onClick={onSelect} disabled={busy}>
        {selectLabel}
      </Button>
    </div>
  );
}

export function BusinessIdentityConfirm({ result, onConfirm, onEdit, onReject, busy = false }: BusinessIdentityConfirmProps) {
  if (result.state === "not_found") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-ink-strong">We couldn't confidently identify your organisation</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your website or enter the details manually. Cresciva will not guess which organisation is yours.
        </p>
        <Button className="mt-4" variant="outline" onClick={onEdit}>Enter details manually</Button>
      </div>
    );
  }

  if (result.state === "failed") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-semibold text-ink-strong">Organisation research is unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your current profile is unchanged. You can continue manually and try research again later.</p>
        <Button className="mt-4" variant="outline" onClick={onEdit}>Enter details manually</Button>
      </div>
    );
  }

  if (result.state === "ambiguous") {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-strong">Choose the organisation that is yours</h2>
          <p className="mt-1 text-sm text-muted-foreground">We found more than one plausible identity, so Cresciva needs your confirmation.</p>
        </div>
        <div className="grid gap-3">
          {result.candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              selectLabel={`Select ${candidate.canonicalName}`}
              onSelect={() => void onConfirm(candidate.id)}
              busy={busy}
            />
          ))}
        </div>
        <Button variant="ghost" onClick={onEdit}>None of these — enter details manually</Button>
      </div>
    );
  }

  const candidate = result.selectedCandidate ?? result.candidates[0];
  if (!candidate) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Possible organisation match</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink-strong">{candidate.canonicalName}</h2>
        </div>
        <Badge variant="outline">{candidate.identityConfidence}% identity confidence</Badge>
      </div>
      {candidate.summary ? <p className="mt-3 text-sm text-ink">{candidate.summary}</p> : null}
      <SourceList candidate={candidate} />
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => void onConfirm(candidate.id)} disabled={busy}>Use this profile</Button>
        <Button variant="outline" onClick={onEdit} disabled={busy}>Edit details</Button>
        <Button variant="ghost" onClick={() => void onReject(candidate.id)} disabled={busy}>This isn't mine</Button>
      </div>
    </div>
  );
}

export default BusinessIdentityConfirm;
