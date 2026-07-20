import { useId } from "react";
import { Button } from "@/components/ui/button";
import type { Opportunity } from "@/lib/fundingSchema";
import {
  ExternalLink, Calendar, ChevronDown, ChevronUp, Info, Target, Users, Lightbulb, Plane, ShieldAlert, ShieldCheck,
} from "lucide-react";

interface OpportunityCardProps {
  opportunity: Opportunity;
  /** Controlled by the parent (a Set of open keys) so many cards stay open at once. */
  open: boolean;
  onToggle: () => void;
  /** Renders a neutral "Example" badge for paywall preview cards. */
  sample?: boolean;
  /** Feed items show "Last verified {date}". */
  lastVerifiedAt?: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function OpportunityCard({ opportunity: o, open, onToggle, sample, lastVerifiedAt }: OpportunityCardProps) {
  const detailsId = useId();
  const verified = lastVerifiedAt ? formatDate(lastVerifiedAt) : "";

  return (
    <article className="rounded-xl border border-border bg-card p-6 shadow-soft transition-colors hover:border-primary/40">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
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

      {verified && (
        <p className="mb-4 inline-flex items-center gap-1.5 text-xs text-success-strong">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Last verified {verified}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onToggle} aria-expanded={open} aria-controls={detailsId}>
          {open ? (
            <><ChevronUp className="mr-1 h-4 w-4" aria-hidden="true" /> Show less</>
          ) : (
            <><ChevronDown className="mr-1 h-4 w-4" aria-hidden="true" /> Learn more</>
          )}
        </Button>
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

          {o.url && (
            <Button asChild variant="default" size="sm">
              <a href={o.url} target="_blank" rel="noopener noreferrer">
                Visit funder site <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
              </a>
            </Button>
          )}
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
