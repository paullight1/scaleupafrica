import { useId } from "react";
import { Button } from "@shared/components/ui/button";
import { trackEvent } from "@shared/lib/analytics";
import type { Opportunity } from "@/lib/fundingSchema";
import {
  ExternalLink,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Target,
  Users,
  Lightbulb,
  Plane,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

interface OpportunityCardProps {
  opportunity: Opportunity;
  opportunityId?: string;
  open: boolean;
  onToggle: () => void;
  sample?: boolean;
  lastVerifiedAt?: string | null;
  verificationStatus?: "verified" | "stale" | "unverified";
  matchScore?: number;
  confidenceScore?: number;
  matchReasons?: string[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function OpportunityCard({
  opportunity: o,
  opportunityId,
  open,
  onToggle,
  sample,
  lastVerifiedAt,
  verificationStatus,
  matchScore,
  confidenceScore,
  matchReasons = [],
}: OpportunityCardProps) {
  const detailsId = useId();
  const checked = lastVerifiedAt ? formatDate(lastVerifiedAt) : "";
  const aiDiscovery = o.discovery_source === "ai_assisted";
  const resolvedVerification = o.verification_status ?? verificationStatus;

  const handleToggle = () => {
    if (!open && typeof matchScore === "number") {
      void trackEvent("recommendation_open", {
        entityType: "funding_opportunity",
        entityId: opportunityId,
        metadata: {
          match_score: matchScore,
          confidence_score: confidenceScore ?? null,
          verification_status: resolvedVerification ?? null,
        },
      });
    }
    onToggle();
  };

  const trackSourceClick = () => {
    void trackEvent("opportunity_source_click", {
      entityType: "funding_opportunity",
      entityId: opportunityId,
      metadata: {
        discovery_source: o.discovery_source ?? "verified_feed",
        verification_status: resolvedVerification ?? null,
        match_score: matchScore ?? null,
      },
    });
  };

  return (
    <article className="rounded-xl border border-border bg-card p-6 shadow-soft transition-colors hover:border-primary/40">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {typeof matchScore === "number" && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-dark">
                {matchScore}% match
              </span>
            )}
            {aiDiscovery ? (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                AI discovery · unverified
              </span>
            ) : resolvedVerification === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-success-strong">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified source
              </span>
            ) : resolvedVerification === "stale" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                <ShieldAlert className="h-3 w-3" aria-hidden="true" /> Source needs recheck
              </span>
            ) : resolvedVerification === "unverified" ? (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                Unverified
              </span>
            ) : null}
            {sample && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                Example
              </span>
            )}
            {o.type && (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                {o.type}
              </span>
            )}
            {o.travel_component && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-dark">
                <Plane className="h-3 w-3" aria-hidden="true" /> Travel
              </span>
            )}
          </div>
          <h3 className="mb-1 font-display text-xl font-bold text-ink-strong">{o.title}</h3>
          <p className="text-sm text-muted-foreground">by {o.funder}</p>
        </div>
        {o.amount && (
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-dark">
            {o.amount}
          </span>
        )}
      </div>

      {matchReasons.length > 0 && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary-dark">Why it matches</p>
          <ul className="space-y-1 text-sm text-foreground/80">
            {matchReasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex gap-2">
                <span aria-hidden="true">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {o.summary && <p className="mb-4 text-sm text-foreground/80">{o.summary}</p>}

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {o.opens && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" /> Opens: {o.opens}
          </span>
        )}
        {o.deadline && (
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            <Calendar className="h-3 w-3" aria-hidden="true" /> Deadline: {o.deadline}
          </span>
        )}
        {o.eligibility && <span>Eligibility: {o.eligibility}</span>}
      </div>

      {o.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {o.tags.map((t) => (
            <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
              {t}
            </span>
          ))}
        </div>
      )}

      {checked && (
        <p className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Checked {checked}
          {typeof confidenceScore === "number" && confidenceScore < 60 ? " · low source confidence" : ""}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleToggle} aria-expanded={open} aria-controls={detailsId}>
          {open ? (
            <><ChevronUp className="mr-1 h-4 w-4" aria-hidden="true" /> Show less</>
          ) : (
            <><ChevronDown className="mr-1 h-4 w-4" aria-hidden="true" /> Learn more</>
          )}
        </Button>
        {o.url && (
          <Button asChild variant="default" size="sm">
            <a
              href={o.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={trackSourceClick}
            >
              Official source <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
            </a>
          </Button>
        )}
      </div>

      {open && (
        <div id={detailsId} className="mt-6 space-y-5 border-t border-border pt-6">
          {o.funder_about && (
            <Section icon={Info} title="About the funder">
              <p className="text-sm text-foreground/80">{o.funder_about}</p>
            </Section>
          )}
          {o.travel_component && (
            <Section icon={Plane} title="Travel / exchange component">
              <p className="text-sm text-foreground/80">{o.travel_component}</p>
            </Section>
          )}
          {o.sdg_focus.length > 0 && (
            <Section icon={Target} title="SDG focus">
              <div className="flex flex-wrap gap-2">
                {o.sdg_focus.map((s) => (
                  <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}
          {o.past_recipients.length > 0 && (
            <Section icon={Users} title="Businesses previously funded">
              <ul className="space-y-2">
                {o.past_recipients.map((r, idx) => (
                  <li key={idx} className="text-sm text-foreground/80">
                    <span className="font-semibold text-foreground">{r.business_name}</span>
                    {r.founder_name && <> — founded by {r.founder_name}</>}
                    {r.website && (
                      <>
                        {" · "}
                        <a
                          href={r.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-dark underline-offset-4 hover:underline"
                        >
                          website
                        </a>
                      </>
                    )}
                    {r.note && <div className="mt-0.5 text-xs text-muted-foreground">{r.note}</div>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {o.application_tips.length > 0 && (
            <Section icon={Lightbulb} title="Tips for a stellar application">
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground/80">
                {o.application_tips.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </Section>
          )}
          {o.important_notes && (
            <Section icon={Info} title="Important to note">
              <p className="text-sm text-foreground/80">{o.important_notes}</p>
            </Section>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-xs text-foreground/80">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
            <span>
              Verify the current cycle on the funder's site before applying. Never pay any fee to apply for or
              receive a grant — legitimate funders do not charge applicants.
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Info;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-strong">
        <Icon className="h-4 w-4 text-primary-dark" aria-hidden="true" /> {title}
      </h4>
      {children}
    </div>
  );
}

export default OpportunityCard;
