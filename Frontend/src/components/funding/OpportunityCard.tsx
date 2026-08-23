import { useId } from "react";
import { Button } from "@shared/components/ui/button";
import { trackEvent } from "@shared/lib/analytics";
import type { Opportunity } from "@/lib/fundingSchema";
import type { EligibilityStatus } from "@/lib/funding/recommendationEngine";
import type { MemberOpportunityStateName } from "@/hooks/queries/memberOpportunityState";
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
  Clock3,
  Bookmark,
  ClipboardCheck,
  Trophy,
  XCircle,
} from "lucide-react";

export type CardApplicationStatus = "open"|"closing_soon"|"rolling"|"upcoming"|"closed"|"paused"|"unknown";

interface OpportunityCardProps {
  opportunity: Opportunity;
  opportunityId?: string;
  open: boolean;
  onToggle: () => void;
  sample?: boolean;
  lastVerifiedAt?: string | null;
  verificationStatus?: "verified" | "stale" | "unverified";
  applicationStatus?: CardApplicationStatus;
  statusCheckedAt?: string | null;
  applicationUrl?: string | null;
  deadlineAt?: string | null;
  deadlineStatus?: "confirmed" | "rolling" | "unknown";
  primaryApplyEligible?: boolean;
  matchScore?: number;
  confidenceScore?: number;
  matchReasons?: string[];
  eligibilityStatus?: EligibilityStatus;
  eligibilityBlockers?: string[];
  missingInformation?: string[];
  memberState?: MemberOpportunityStateName | null;
  onMemberStateChange?: (state: MemberOpportunityStateName) => void;
  memberStatePending?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function normalizedStatus(value: unknown): CardApplicationStatus {
  return value === "open" || value === "closing_soon" || value === "rolling" || value === "upcoming" || value === "closed" || value === "paused" ? value : "unknown";
}

function StatusPill({ status }: { status: CardApplicationStatus }) {
  if (status === "open") return <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-success-strong">Open now</span>;
  if (status === "closing_soon") return <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-foreground">Closing soon</span>;
  if (status === "rolling") return <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-dark">Rolling applications</span>;
  if (status === "upcoming") return <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">Upcoming</span>;
  if (status === "closed") return <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Closed</span>;
  if (status === "paused") return <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-foreground">Paused</span>;
  return <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Current status unconfirmed</span>;
}

function EligibilityPill({ status }: { status: EligibilityStatus }) {
  if (status === "eligible") return <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-success-strong">Eligible</span>;
  if (status === "possibly_eligible") return <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-foreground">Possibly eligible</span>;
  if (status === "insufficient_information") return <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-foreground">Needs information</span>;
  return <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Not eligible</span>;
}

function memberStateLabel(state: MemberOpportunityStateName): string {
  switch (state) {
    case "saved": return "Saved";
    case "preparing": return "Preparing";
    case "applied": return "Applied";
    case "won": return "Won";
    case "rejected": return "Rejected";
    case "dismissed": return "Not relevant";
  }
}

export function OpportunityCard({
  opportunity: o,
  opportunityId,
  open,
  onToggle,
  sample,
  lastVerifiedAt,
  verificationStatus,
  applicationStatus,
  statusCheckedAt,
  applicationUrl,
  deadlineAt,
  deadlineStatus,
  primaryApplyEligible = false,
  matchScore,
  confidenceScore,
  matchReasons = [],
  eligibilityStatus,
  eligibilityBlockers = [],
  missingInformation = [],
  memberState = null,
  onMemberStateChange,
  memberStatePending = false,
}: OpportunityCardProps) {
  const detailsId = useId();
  const checked = lastVerifiedAt ? formatDate(lastVerifiedAt) : "";
  const statusChecked = statusCheckedAt ? formatDate(statusCheckedAt) : "";
  const aiDiscovery = o.discovery_source === "ai_assisted";
  const resolvedVerification = o.verification_status ?? verificationStatus;
  const resolvedStatus = aiDiscovery ? "unknown" : normalizedStatus(o.application_status ?? applicationStatus);
  const resolvedDeadlineStatus = o.deadline_status ?? deadlineStatus ?? "unknown";
  const resolvedDeadlineAt = o.deadline_at ?? deadlineAt ?? null;
  const resolvedApplicationUrl = o.application_url ?? applicationUrl ?? null;
  const confirmedDeadline = resolvedDeadlineStatus === "confirmed" && resolvedDeadlineAt ? formatDate(resolvedDeadlineAt) : "";
  const canApplyNow = Boolean(primaryApplyEligible && resolvedApplicationUrl && resolvedVerification === "verified" && eligibilityStatus === "eligible" && (resolvedStatus === "open" || resolvedStatus === "closing_soon" || resolvedStatus === "rolling"));

  const handleToggle = () => {
    if (!open && typeof matchScore === "number") {
      void trackEvent("recommendation_open", {
        entityType: "funding_opportunity",
        entityId: opportunityId,
        metadata: {
          match_score: matchScore,
          confidence_score: confidenceScore ?? null,
          verification_status: resolvedVerification ?? null,
          application_status: resolvedStatus,
          eligibility_status: eligibilityStatus ?? null,
          primary_apply_eligible: canApplyNow,
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
        application_status: resolvedStatus,
        eligibility_status: eligibilityStatus ?? null,
        match_score: matchScore ?? null,
      },
    });
  };

  const trackApplyClick = () => {
    const metadata = {
      match_score: matchScore ?? null,
      verification_status: resolvedVerification ?? null,
      application_status: resolvedStatus,
      eligibility_status: eligibilityStatus ?? null,
    };
    void trackEvent("recommendation_apply_click", {
      entityType: "funding_opportunity",
      entityId: opportunityId,
      metadata,
    });
    void trackEvent("application_started", {
      entityType: "funding_opportunity",
      entityId: opportunityId,
      metadata,
    });
  };

  return (
    <article className="rounded-xl border border-border bg-card p-6 shadow-soft transition-colors hover:border-primary/40">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {typeof matchScore === "number" && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-dark">{matchScore}% match</span>}
            {eligibilityStatus ? <EligibilityPill status={eligibilityStatus} /> : null}
            <StatusPill status={resolvedStatus} />
            {aiDiscovery ? (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">AI discovery · unverified</span>
            ) : resolvedVerification === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-success-strong"><ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified source</span>
            ) : resolvedVerification === "stale" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-foreground"><ShieldAlert className="h-3 w-3" aria-hidden="true" /> Source needs recheck</span>
            ) : resolvedVerification === "unverified" ? (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">Unverified</span>
            ) : null}
            {memberState && memberState !== "dismissed" ? <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">{memberStateLabel(memberState)}</span> : null}
            {sample && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">Example</span>}
            {o.type && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{o.type}</span>}
            {o.travel_component && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary-dark"><Plane className="h-3 w-3" aria-hidden="true" /> Travel</span>}
          </div>
          <h3 className="mb-1 font-display text-xl font-bold text-ink-strong">{o.title}</h3>
          <p className="text-sm text-muted-foreground">by {o.funder}</p>
        </div>
        {o.amount && <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-dark">{o.amount}</span>}
      </div>

      {matchReasons.length > 0 && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary-dark">Why it matches</p>
          <ul className="space-y-1 text-sm text-foreground/80">
            {matchReasons.slice(0, 3).map((reason) => <li key={reason} className="flex gap-2"><span aria-hidden="true">✓</span><span>{reason}</span></li>)}
          </ul>
        </div>
      )}

      {missingInformation.length > 0 && (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Eligibility information needed</p>
          <ul className="mt-1 space-y-1 text-sm text-foreground/80">{missingInformation.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul>
        </div>
      )}

      {eligibilityBlockers.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-surface-subtle p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eligibility blocker</p>
          <ul className="mt-1 space-y-1 text-sm text-foreground/80">{eligibilityBlockers.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}</ul>
        </div>
      )}

      {o.summary && <p className="mb-4 text-sm text-foreground/80">{o.summary}</p>}

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {o.opens_at && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" aria-hidden="true" /> Opens: {formatDate(o.opens_at)}</span>}
        {confirmedDeadline && <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Calendar className="h-3 w-3" aria-hidden="true" /> Confirmed deadline: {confirmedDeadline}</span>}
        {resolvedDeadlineStatus === "rolling" && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden="true" /> No fixed deadline · rolling intake</span>}
        {o.eligibility && <span>Eligibility: {o.eligibility}</span>}
      </div>

      {o.tags.length > 0 && <div className="mb-4 flex flex-wrap gap-2">{o.tags.map((t) => <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{t}</span>)}</div>}

      {(checked || statusChecked) && (
        <p className="mb-4 inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {checked ? `Source verified ${checked}` : ""}
          {checked && statusChecked ? " · " : ""}
          {statusChecked ? `cycle checked ${statusChecked}` : ""}
          {typeof confidenceScore === "number" && confidenceScore < 60 ? " · low source confidence" : ""}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleToggle} aria-expanded={open} aria-controls={detailsId}>
          {open ? <><ChevronUp className="mr-1 h-4 w-4" aria-hidden="true" /> Show less</> : <><ChevronDown className="mr-1 h-4 w-4" aria-hidden="true" /> Learn more</>}
        </Button>
        {canApplyNow && resolvedApplicationUrl && (
          <Button asChild variant="default" size="sm">
            <a href={resolvedApplicationUrl} target="_blank" rel="noopener noreferrer nofollow" onClick={trackApplyClick}>Apply on official site <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" /></a>
          </Button>
        )}
        {o.url && (
          <Button asChild variant={canApplyNow ? "outline" : "default"} size="sm">
            <a href={o.url} target="_blank" rel="noopener noreferrer nofollow" onClick={trackSourceClick}>Official source <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" /></a>
          </Button>
        )}
      </div>

      {onMemberStateChange && opportunityId ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button type="button" variant={memberState === "saved" ? "secondary" : "ghost"} size="sm" disabled={memberStatePending} onClick={() => onMemberStateChange("saved")}><Bookmark className="mr-1.5 h-4 w-4" />Save</Button>
          <Button type="button" variant={memberState === "preparing" ? "secondary" : "ghost"} size="sm" disabled={memberStatePending} onClick={() => onMemberStateChange("preparing")}><ClipboardCheck className="mr-1.5 h-4 w-4" />I'm preparing</Button>
          <Button type="button" variant={memberState === "applied" ? "secondary" : "ghost"} size="sm" disabled={memberStatePending} onClick={() => onMemberStateChange("applied")}>Applied</Button>
          <Button type="button" variant={memberState === "won" ? "secondary" : "ghost"} size="sm" disabled={memberStatePending} onClick={() => onMemberStateChange("won")}><Trophy className="mr-1.5 h-4 w-4" />Won</Button>
          <Button type="button" variant={memberState === "rejected" ? "secondary" : "ghost"} size="sm" disabled={memberStatePending} onClick={() => onMemberStateChange("rejected")}><XCircle className="mr-1.5 h-4 w-4" />Rejected</Button>
          <Button type="button" variant="ghost" size="sm" disabled={memberStatePending} onClick={() => onMemberStateChange("dismissed")}>Not relevant</Button>
        </div>
      ) : null}

      {open && (
        <div id={detailsId} className="mt-6 space-y-5 border-t border-border pt-6">
          {o.funder_about && <Section icon={Info} title="About the funder"><p className="text-sm text-foreground/80">{o.funder_about}</p></Section>}
          {o.travel_component && <Section icon={Plane} title="Travel / exchange component"><p className="text-sm text-foreground/80">{o.travel_component}</p></Section>}
          {o.sdg_focus.length > 0 && <Section icon={Target} title="SDG focus"><div className="flex flex-wrap gap-2">{o.sdg_focus.map((s) => <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{s}</span>)}</div></Section>}
          {o.past_recipients.length > 0 && <Section icon={Users} title="Businesses previously funded"><ul className="space-y-2">{o.past_recipients.map((r, idx) => <li key={idx} className="text-sm text-foreground/80"><span className="font-semibold text-foreground">{r.business_name}</span>{r.founder_name && <> — founded by {r.founder_name}</>}{r.website && <> · <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-primary-dark underline-offset-4 hover:underline">website</a></>}{r.note && <div className="mt-0.5 text-xs text-muted-foreground">{r.note}</div>}</li>)}</ul></Section>}
          {o.application_tips.length > 0 && <Section icon={Lightbulb} title="Tips for a stellar application"><ul className="list-inside list-disc space-y-1 text-sm text-foreground/80">{o.application_tips.map((t, idx) => <li key={idx}>{t}</li>)}</ul></Section>}
          {o.important_notes && <Section icon={Info} title="Important to note"><p className="text-sm text-foreground/80">{o.important_notes}</p></Section>}

          <div className="flex items-start gap-2 rounded-lg bg-warning/15 p-3 text-xs text-foreground/80">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
            <span>{resolvedStatus === "unknown" ? "Cresciva could not confirm the current application cycle recently enough. Check the official source before acting." : "Verify the final application instructions on the funder's site before submitting. Never pay any fee to apply for or receive a grant — legitimate funders do not charge applicants."}</span>
          </div>
        </div>
      )}
    </article>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return <div><h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-strong"><Icon className="h-4 w-4 text-primary-dark" aria-hidden="true" /> {title}</h4>{children}</div>;
}

export default OpportunityCard;
