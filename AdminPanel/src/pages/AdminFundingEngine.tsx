import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, CircleHelp, Clock3, Database, ExternalLink, Link2, Play, Plus, RefreshCw, Server, Sparkles, X } from "lucide-react";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { ErrorState } from "@shared/components/common/ErrorState";
import { TableSkeleton } from "@shared/components/common/LoadingState";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Progress } from "@shared/components/ui/progress";
import {
  FundingEngineGuide,
} from "@/components/funding/FundingEngineGuide";
import {
  hasSeenFundingEngineGuide,
  rememberFundingEngineGuide,
} from "@/components/funding/fundingEngineGuideStorage";
import {
  useFundingEngineRuns,
  useFundingEngineOpportunities,
  useFundingEngineSources,
  useFundingEngineStatus,
  useAddFundingEngineSource,
  useImportFundingEngineGrants,
  useStartFundingEngineRun,
} from "@/hooks/queries/fundingEngine";
import type { EngineGrant, EngineRun } from "@/lib/fundingEngineApi";
import { getFundingRunPresentation } from "@/lib/fundingEngineRun";

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function runSourceLabel(run: { source_name?: string | null; warnings?: Array<{ name?: string | null }> }) {
  if (run.source_name) return run.source_name;
  const names = [...new Set((run.warnings ?? []).map((warning) => warning.name).filter(Boolean))];
  if (names.length === 1) return names[0];
  if (names.length > 1) return `${names.length} sources`;
  return "All sources";
}

function isActiveRun(run?: EngineRun) {
  return Boolean(run && ["queued", "pending", "running", "processing", "started"].includes(run.status.toLowerCase()));
}

function isFinishedRun(run?: EngineRun) {
  return Boolean(run && ["completed", "failed", "error"].includes(run.status.toLowerCase()));
}

function runCompletedSources(run?: EngineRun) {
  return (run?.warnings ?? []).filter((warning) => warning.status || warning.itemsFound !== undefined).length;
}

function runResultCount(run?: EngineRun) {
  return run?.opportunities_found ?? run?.items_found ?? run?.urls_saved ?? 0;
}

function safeGrantUrl(...values: Array<string | null | undefined>) {
  for (const value of values) {
    try {
      const url = new URL(value ?? "");
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch {
      // Try the next Edutu URL field.
    }
  }
  return null;
}

export default function AdminFundingEngine() {
  const status = useFundingEngineStatus();
  const sources = useFundingEngineSources();
  const runs = useFundingEngineRuns();
  const opportunities = useFundingEngineOpportunities();
  const { refetch: refetchOpportunities } = opportunities;
  const addSource = useAddFundingEngineSource();
  const importGrants = useImportFundingEngineGrants();
  const startRun = useStartFundingEngineRun();
  const [sourceId, setSourceId] = useState("all");
  const [maxPages, setMaxPages] = useState(3);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceError, setNewSourceError] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [importedGrantIds, setImportedGrantIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hasSeenFundingEngineGuide()) setGuideOpen(true);
  }, []);

  const changeGuideOpen = (open: boolean) => {
    setGuideOpen(open);
    if (!open) rememberFundingEngineGuide();
  };

  const refresh = () => void Promise.all([status.refetch(), sources.refetch(), runs.refetch(), opportunities.refetch()]);
  const launch = () => {
    setRunStartedAt(Date.now());
    setRunDialogOpen(true);
    startRun.mutate({
      ...(sourceId === "all" ? { allSources: true } : { sourceId: Number(sourceId) }),
      maxPages,
      incremental: true,
    }, {
      onSuccess: () => void runs.refetch(),
      onError: () => {
        setRunStartedAt(null);
        setRunDialogOpen(false);
      },
    });
  };
  const openSourceDialog = () => {
    setNewSourceName("");
    setNewSourceUrl("");
    setNewSourceError(null);
    setSourceDialogOpen(true);
  };
  const submitSource = () => {
    const name = newSourceName.trim();
    const url = newSourceUrl.trim();
    if (!name || !url) {
      setNewSourceError("Add a name and URL for this source.");
      return;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    } catch {
      setNewSourceError("Enter a valid HTTP or HTTPS URL.");
      return;
    }
    setNewSourceError(null);
    addSource.mutate({ name, url, category: "grant", tier: 2 }, {
      onSuccess: () => {
        setSourceDialogOpen(false);
        setSourceId("all");
        void sources.refetch();
      },
    });
  };
  const importForReview = (grants: EngineGrant[]) => {
    importGrants.mutate(grants, {
      onSuccess: (result) => setImportedGrantIds((current) => new Set([...current, ...result.importedIds])),
    });
  };

  const latestRun = runs.data?.[0];
  const sessionRun = runStartedAt === null
    ? undefined
    : runs.data?.find((run) => {
        const createdAt = run.created_at ? Date.parse(run.created_at) : Number.NaN;
        return Number.isFinite(createdAt) && createdAt >= runStartedAt - 10_000;
      });
  const trackedRun = sessionRun ?? (!runStartedAt && isActiveRun(latestRun) ? latestRun : undefined);
  const runPresentation = getFundingRunPresentation(trackedRun, startRun.isPending);
  const runIsFinished = isFinishedRun(trackedRun);
  const finishedRunId = runIsFinished ? trackedRun?.id : undefined;
  const runIsVisible = Boolean(runStartedAt !== null || trackedRun);
  const activeRunSource = sourceId === "all" ? "All enabled sources" : (sources.data ?? []).find((source) => String(source.id) === sourceId)?.name ?? "Selected source";

  useEffect(() => {
    if (finishedRunId) void refetchOpportunities();
  }, [finishedRunId, refetchOpportunities]);

  const revealResults = () => {
    setRunDialogOpen(false);
    setRunStartedAt(null);
    void refresh();
    window.requestAnimationFrame(() => document.getElementById("grant-feed")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const revealRunHistory = () => {
    setRunDialogOpen(false);
    setRunStartedAt(null);
    void refresh();
    window.requestAnimationFrame(() => document.getElementById("run-history")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const dismissRun = () => {
    setRunDialogOpen(false);
    setRunStartedAt(null);
  };

  if (status.isLoading && sources.isLoading && runs.isLoading) return <TableSkeleton rows={6} columns={4} />;
  if (status.isError) {
    return <ErrorState title="Opportunity engine unavailable" message={status.error instanceof Error ? status.error.message : undefined} onRetry={refresh} />;
  }

  const engine = status.data;
  const databaseHealthy = engine?.database?.reachable === true || engine?.database?.connected === true || engine?.database?.status === "connected" || engine?.database?.status === "healthy";
  const aiHealthy = engine?.ai?.enabled === true || engine?.ai?.deepseekConfigured === true || engine?.ai?.configured === true || engine?.ai?.status === "configured" || engine?.ai?.status === "healthy";
  const runtimeLabel = engine?.runtime?.version ?? engine?.runtime?.deployment;
  const runtime = runtimeLabel && runtimeLabel !== "unknown" ? runtimeLabel : "Edutu API online";

  return <div className="space-y-7">
    <SEO title="Funding engine" noindex />
    <PageHeader
      title="Opportunity engine"
      subtitle="Run Edutu's grant discovery API from Cresciva and monitor the results it returns."
      actions={<div className="flex flex-wrap gap-2"><Button onClick={openSourceDialog}><Plus className="mr-2 h-4 w-4" />Add source</Button><Button variant="outline" onClick={() => setGuideOpen(true)}><CircleHelp className="mr-2 h-4 w-4" />How it works</Button><Button variant="outline" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>}
    />

    <FundingEngineGuide open={guideOpen} onOpenChange={changeGuideOpen} />

    <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an opportunity source</DialogTitle>
          <DialogDescription>Add a public grants page or feed. Edutu will fetch it during the next discovery run.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-engine-source-name">Source name</Label>
            <Input id="new-engine-source-name" value={newSourceName} onChange={(event) => setNewSourceName(event.target.value)} placeholder="Example Foundation grants" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-engine-source-url">URL</Label>
            <Input id="new-engine-source-url" type="url" value={newSourceUrl} onChange={(event) => setNewSourceUrl(event.target.value)} placeholder="https://example.org/grants" onKeyDown={(event) => { if (event.key === "Enter") submitSource(); }} />
          </div>
          {newSourceError ? <p className="text-sm text-destructive" role="alert">{newSourceError}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSourceDialogOpen(false)}>Cancel</Button>
          <Button onClick={submitSource} disabled={addSource.isPending}>{addSource.isPending ? "Adding…" : "Add source"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {runIsVisible ? <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
      <DialogContent className="overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${runPresentation.phase === "failed" ? "bg-destructive/10 text-destructive" : runPresentation.phase === "completed" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"}`}>
              {runPresentation.phase === "failed" ? <AlertTriangle className="h-5 w-5" /> : runPresentation.phase === "completed" ? <CheckCircle2 className="h-5 w-5" /> : <RefreshCw className="h-5 w-5 animate-spin" />}
            </span>
            <div>
              <DialogTitle>{runPresentation.title}</DialogTitle>
              <DialogDescription className="mt-1">{runPresentation.detail}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-ink-strong">Live progress</span>
              <span className="text-muted-foreground">{runPresentation.phase === "completed" ? "100%" : runPresentation.phase === "failed" ? "Stopped" : "Working…"}</span>
            </div>
            <Progress value={runPresentation.progress} className={runPresentation.phase === "failed" ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"} aria-label="Discovery progress" />
            <p className="mt-2 text-xs text-muted-foreground">You can close this window — Edutu will keep working in the background.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <RunMetric label="Source" value={trackedRun ? runSourceLabel(trackedRun) : activeRunSource} />
            <RunMetric label="Grant results" value={runIsFinished ? String(runResultCount(trackedRun)) : "Collecting…"} />
            <RunMetric label="Sources checked" value={trackedRun ? String(runCompletedSources(trackedRun)) : "Starting…"} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {runIsFinished ? runPresentation.phase === "completed" ? <Button onClick={revealResults}><CheckCircle2 className="h-4 w-4" />See results</Button> : <Button variant="outline" onClick={revealRunHistory}><AlertTriangle className="h-4 w-4" />View run history</Button> : <Button variant="outline" onClick={() => setRunDialogOpen(false)}><Clock3 className="h-4 w-4" />Run in background</Button>}
          <Button variant="ghost" onClick={() => runIsFinished ? dismissRun() : setRunDialogOpen(false)}>{runIsFinished ? "Dismiss" : "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog> : null}

    {runIsVisible && !runDialogOpen ? <div className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border bg-card p-4 shadow-elevated">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 rounded-lg p-2 ${runPresentation.phase === "failed" ? "bg-destructive/10 text-destructive" : runPresentation.phase === "completed" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"}`}>
          {runPresentation.phase === "failed" ? <AlertTriangle className="h-4 w-4" /> : runPresentation.phase === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4 animate-spin" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink-strong">{runPresentation.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{runIsFinished ? runPresentation.phase === "completed" ? `${runResultCount(trackedRun)} grant results found` : "Run stopped — check the history" : "Edutu is still working in the background"}</p>
        </div>
        {runIsFinished ? <button type="button" onClick={dismissRun} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Dismiss run notification"><X className="h-4 w-4" /></button> : null}
      </div>
      <Progress value={runPresentation.progress} className="mt-3 h-2" aria-label="Background discovery progress" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{runIsFinished ? "Ready to review" : "Polling for updates"}</span>
        <Button size="sm" variant={runIsFinished && runPresentation.phase === "completed" ? "default" : "outline"} onClick={() => runIsFinished ? runPresentation.phase === "completed" ? revealResults() : revealRunHistory() : setRunDialogOpen(true)}>{runIsFinished ? runPresentation.phase === "completed" ? "See results" : "View history" : "View progress"}</Button>
      </div>
    </div> : null}

    <section className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="rounded-lg bg-primary p-2 text-primary-foreground"><Link2 className="h-5 w-5" /></span>
        <div>
          <p className="font-semibold text-ink-strong">Connected to the Edutu Engine API</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Cresciva sends commands through a protected Supabase Edge Function to the Edutu API on Render. Edutu performs the scraping and classification, then returns grant-tagged results.</p>
        </div>
      </div>
      <Badge className="w-fit shrink-0">grants only</Badge>
    </section>

    <div className="grid gap-4 sm:grid-cols-3">
      <StatusCard icon={Server} label="Engine API" value={runtime} healthy />
      <StatusCard icon={Database} label="Engine database" value={databaseHealthy ? "Connected" : "Needs attention"} healthy={databaseHealthy} />
      <StatusCard icon={Sparkles} label="AI enrichment" value={aiHealthy ? "Configured" : "Needs attention"} healthy={aiHealthy} />
    </div>

    <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-strong">Start discovery run</h2>
          <p className="mt-1 text-sm text-muted-foreground">Edutu runs in the background, skips recently checked links, and keeps only opportunities classified as grants.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:items-end xl:grid-cols-[minmax(200px,1fr)_130px_110px_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="engine-source">Source</Label>
            <select id="engine-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All enabled sources</option>
              {(sources.data ?? []).filter((source) => source.enabled).map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Opportunity type</Label>
            <div className="flex h-10 items-center rounded-md border border-primary/20 bg-primary/5 px-3 text-sm font-semibold text-primary">Grants only</div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="engine-pages">Max pages</Label>
            <select id="engine-pages" value={maxPages} onChange={(event) => setMaxPages(Number(event.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {[1, 2, 3, 5, 10].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <Button onClick={launch} disabled={startRun.isPending || sources.isError}>
            {startRun.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {startRun.isPending ? "Starting…" : "Start run"}
          </Button>
        </div>
      </div>
    </section>

    <section id="grant-feed">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-display text-xl font-semibold text-ink-strong">Grant feed from Edutu</h2><p className="mt-1 text-sm text-muted-foreground">Only records classified and tagged <strong>grants</strong> by the Edutu Engine API appear here.</p><p className="mt-1 text-xs text-muted-foreground">Import a draft for review in Opportunities; publish it there to make it available to active subscribers.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{opportunities.data?.length ?? 0} grants</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => importForReview((opportunities.data ?? []).filter((grant) => !importedGrantIds.has(grant.id)))}
            disabled={importGrants.isPending || !(opportunities.data ?? []).some((grant) => !importedGrantIds.has(grant.id))}
          >
            {importGrants.isPending ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Import all for review
          </Button>
        </div>
      </div>
      {opportunities.isLoading ? <TableSkeleton rows={4} columns={4} /> : opportunities.isError ? <ErrorState compact title="Could not load Edutu grants" onRetry={() => opportunities.refetch()} /> : (opportunities.data ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center text-sm text-muted-foreground">No grant-tagged opportunities have been returned by Edutu yet.</div> : <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-surface-subtle text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Grant</th><th className="px-4 py-3">Organisation</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Edutu status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{(opportunities.data ?? []).map((grant) => { const url = safeGrantUrl(grant.application_url, grant.apply_url, grant.canonical_url, grant.source_url); const imported = importedGrantIds.has(grant.id); return <tr key={grant.id} className="border-b border-border last:border-0"><td className="max-w-md px-4 py-3"><p className="font-medium text-ink-strong">{grant.title}</p><Badge variant="secondary" className="mt-1.5">grants</Badge></td><td className="px-4 py-3 text-muted-foreground">{grant.organization || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{grant.close_date || "Not stated"}</td><td className="px-4 py-3"><Badge variant={grant.status === "active" ? "success" : "warning"}>{grant.status || "review"}</Badge></td><td className="px-4 py-3"><div className="flex flex-wrap items-center justify-end gap-2">{imported ? <Badge variant="success">Draft imported</Badge> : <Button size="sm" variant="outline" onClick={() => importForReview([grant])} disabled={importGrants.isPending}>Import draft</Button>}{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">Open <ExternalLink className="h-3.5 w-3.5" /></a> : <span className="text-muted-foreground">—</span>}</div></td></tr>; })}</tbody></table></div>}
    </section>

    <section id="run-history">
      <div className="mb-3 flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold text-ink-strong">Recent grant runs</h2><p className="mt-1 text-sm text-muted-foreground">Grant-only history returned by the Edutu Engine API.</p></div><Badge variant="secondary">{sources.data?.length ?? 0} sources</Badge></div>
      {runs.isLoading ? <TableSkeleton rows={5} columns={4} /> : runs.isError ? <ErrorState compact title="Could not load engine runs" onRetry={() => runs.refetch()} /> : (runs.data ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-border bg-surface-subtle p-8 text-center text-sm text-muted-foreground">No discovery runs yet.</div> : <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-surface-subtle text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Found</th><th className="px-4 py-3">Started</th></tr></thead><tbody>{(runs.data ?? []).map((run) => <tr key={run.id} className="border-b border-border last:border-0"><td className="px-4 py-3 font-medium text-ink-strong">{runSourceLabel(run)}</td><td className="px-4 py-3"><Badge variant={run.status === "completed" ? "success" : run.status === "failed" ? "destructive" : "secondary"}>{run.status}</Badge></td><td className="px-4 py-3">{run.urls_scraped ?? run.items_found ?? run.opportunities_found ?? 0}</td><td className="px-4 py-3 text-muted-foreground">{dateLabel(run.started_at ?? run.created_at)}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

function StatusCard({ icon: Icon, label, value, healthy }: { icon: typeof Activity; label: string; value: string; healthy: boolean }) {
  return <div className="rounded-xl border border-border bg-card p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span><Badge variant={healthy ? "success" : "warning"}>{healthy ? "Ready" : "Check"}</Badge></div><p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate font-semibold text-ink-strong">{value}</p></div>;
}

function RunMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold text-ink-strong">{value}</p></div>;
}
