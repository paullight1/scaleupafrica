import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { ErrorState } from "@shared/components/common/ErrorState";
import { TableSkeleton } from "@shared/components/common/LoadingState";
import { ExternalLink, RefreshCw, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  useFundingSourceHealth,
  useRecheckFundingOpportunity,
  useRefreshDueFunding,
  type ApplicationStatus,
  type FundingSourceHealthOpportunity,
} from "@/hooks/queries/fundingSources";

function dateLabel(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function applicationLabel(status: ApplicationStatus): string {
  switch (status) {
    case "open": return "Open";
    case "closing_soon": return "Closing soon";
    case "rolling": return "Rolling";
    case "upcoming": return "Upcoming";
    case "closed": return "Closed";
    case "paused": return "Paused";
    default: return "Unknown";
  }
}

function OpportunityHealthRow({ row }: { row: FundingSourceHealthOpportunity }) {
  const recheck = useRecheckFundingOpportunity();
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink-strong">{row.title}</h3>
            <Badge variant={row.applicationStatus === "unknown" ? "secondary" : row.applicationStatus === "closed" ? "outline" : "success"}>
              {applicationLabel(row.applicationStatus)}
            </Badge>
            <Badge variant={row.verificationStatus === "verified" ? "success" : row.verificationStatus === "stale" ? "warning" : "secondary"}>
              {row.verificationStatus}
            </Badge>
            {row.conflict ? <Badge variant="warning">Conflict</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{row.funder}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>Cycle checked: {dateLabel(row.statusCheckedAt)}</span>
            <span>Last success: {dateLabel(row.lastSuccessAt)}</span>
            {row.consecutiveFailures > 0 ? <span className="font-semibold text-destructive-strong">{row.consecutiveFailures} consecutive failures</span> : null}
          </div>
          {row.lastError ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-destructive-strong">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" /> {row.lastError}
            </p>
          ) : null}
          {row.sourceUrl ? (
            <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-dark underline-offset-4 hover:underline">
              Source <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={() => recheck.mutate(row.id)} disabled={recheck.isPending}>
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" /> Recheck
        </Button>
      </div>
    </div>
  );
}

function Section({ title, description, rows }: { title: string; description: string; rows: FundingSourceHealthOpportunity[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink-strong">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.length ? <div className="grid gap-3">{rows.map((row) => <OpportunityHealthRow key={`${title}-${row.id}`} row={row} />)}</div> : <div className="rounded-xl border border-dashed border-border bg-surface-subtle p-5 text-sm text-muted-foreground">Nothing in this queue.</div>}
    </section>
  );
}

export default function AdminFundingSources() {
  const health = useFundingSourceHealth();
  const refreshDue = useRefreshDueFunding();

  if (health.isLoading) return <TableSkeleton rows={6} columns={5} />;
  if (health.isError || !health.data) return <ErrorState title="Could not load funding source health" onRetry={() => health.refetch()} />;

  const due = health.data.opportunities.filter((row) => row.due);
  const failures = health.data.opportunities.filter((row) => Boolean(row.lastError));
  const conflicts = health.data.opportunities.filter((row) => row.conflict || row.applicationStatus === "unknown");
  const transitions = health.data.recentChecks.filter((check) => !check.errorClass).slice(0, 12);

  return (
    <div>
      <SEO title="Funding sources" noindex />
      <PageHeader
        title="Funding source health"
        subtitle="Monitor authoritative source freshness and current application-cycle evidence. Status changes are classifier-owned — there is no manual force-open control."
        actions={
          <Button onClick={() => refreshDue.mutate()} disabled={refreshDue.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Refresh due
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Due</p><p className="mt-1 text-2xl font-semibold text-ink-strong">{due.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Failures</p><p className="mt-1 text-2xl font-semibold text-ink-strong">{failures.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Conflict / unknown</p><p className="mt-1 text-2xl font-semibold text-ink-strong">{conflicts.length}</p></div>
      </div>

      <div className="mt-8 space-y-10">
        <Section title="Due for refresh" description="These records are past the freshness window for their stored status." rows={due} />
        <Section title="Failures" description="Failed fetch or extraction attempts stay append-only and never refresh an optimistic status." rows={failures} />
        <Section title="Conflicts / Unknown" description="Conflicting authoritative signals and insufficient current-cycle evidence remain unknown until a clean recheck." rows={conflicts} />

        <section>
          <div className="mb-3"><h2 className="font-display text-lg font-semibold text-ink-strong">Sources</h2><p className="mt-1 text-sm text-muted-foreground">Staff-managed authoritative domains and their retrieval health.</p></div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-subtle text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Source</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Last check</th><th className="px-4 py-3">Last success</th><th className="px-4 py-3">Health</th></tr></thead>
              <tbody>{health.data.sources.map((source) => <tr key={source.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><div className="font-medium text-ink-strong">{source.name}</div><a href={source.baseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-dark hover:underline">{source.baseUrl}</a></td><td className="px-4 py-3">{source.active ? "Yes" : "No"}</td><td className="px-4 py-3 text-muted-foreground">{dateLabel(source.lastCheckedAt)}</td><td className="px-4 py-3 text-muted-foreground">{dateLabel(source.lastSuccessAt)}</td><td className="px-4 py-3">{source.lastError ? <span className="inline-flex items-center gap-1 text-destructive-strong"><ShieldAlert className="h-4 w-4" />{source.lastError}</span> : <span className="inline-flex items-center gap-1 text-success-strong"><ShieldCheck className="h-4 w-4" />Healthy</span>}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-3"><h2 className="font-display text-lg font-semibold text-ink-strong">Recent status transitions</h2><p className="mt-1 text-sm text-muted-foreground">Append-only successful source checks. Raw source bodies are never copied into this operational view.</p></div>
          <div className="rounded-xl border border-border bg-card p-4">
            {transitions.length ? <ul className="divide-y divide-border">{transitions.map((check) => <li key={check.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="font-medium text-ink-strong">{applicationLabel(check.classifiedStatus)}</span><span className="text-muted-foreground">{dateLabel(check.checkedAt)}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No successful status checks recorded yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}