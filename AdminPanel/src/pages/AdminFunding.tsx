import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Star, BadgeCheck, Eye, EyeOff, Bot, ExternalLink, CircleDollarSign, Clock3 } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { SEO } from "@shared/components/common/SEO";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { TableSkeleton } from "@shared/components/common/LoadingState";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import { Badge } from "@shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@shared/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@shared/components/ui/alert-dialog";
import { StudioDataPanel } from "@/components/studio/StudioDataPanel";
import { StudioMetricStrip } from "@/components/studio/StudioMetricStrip";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { StudioToolbar } from "@/components/studio/StudioToolbar";
import {
  useAdminFunding,
  useSaveFunding,
  useSetFundingStatus,
  useToggleFundingFeatured,
  useVerifyFunding,
  useDeleteFunding,
  type FundingRow,
  type FundingFilters,
  type FundingFormPayload,
  type FundingApplicationStatus,
} from "@/hooks/queries/adminOps";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

const fundingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  funder: z.string().trim().min(1, "Funder is required").max(200),
  type: z.string().trim().max(40),
  summary: z.string().trim().max(2000),
  amount: z.string().trim().max(100),
  opens: z.string().trim().max(300),
  deadline: z.string().trim().max(300),
  eligibility: z.string().trim().max(500),
  url: z.union([z.literal(""), z.string().trim().url("Enter a valid URL")]),
  tags: z.string().max(300),
  country_focus: z.string().max(300),
  status: z.enum(["draft", "published", "archived"]),
  featured: z.boolean(),
});
type FundingFormValues = z.infer<typeof fundingSchema>;
const FORM_DEFAULTS: FundingFormValues = { title: "", funder: "", type: "", summary: "", amount: "", opens: "", deadline: "", eligibility: "", url: "", tags: "", country_focus: "", status: "draft", featured: false };

function splitList(raw: string): string[] { return raw.split(",").map((s) => s.trim()).filter(Boolean); }
function rowToForm(row: FundingRow): FundingFormValues { return { title: row.title ?? "", funder: row.funder ?? "", type: row.type ?? "", summary: row.summary ?? "", amount: row.amount ?? "", opens: row.opens ?? "", deadline: row.deadline ?? "", eligibility: row.eligibility ?? "", url: row.url ?? "", tags: (row.tags ?? []).join(", "), country_focus: (row.country_focus ?? []).join(", "), status: (row.status as FundingFormValues["status"]) ?? "draft", featured: !!row.featured }; }
function formToPayload(values: FundingFormValues): FundingFormPayload { return { title: values.title.trim(), funder: values.funder.trim(), type: values.type.trim() || null, summary: values.summary.trim() || null, amount: values.amount.trim() || null, opens: values.opens.trim() || null, deadline: values.deadline.trim() || null, eligibility: values.eligibility.trim() || null, url: values.url.trim() || null, tags: splitList(values.tags), country_focus: splitList(values.country_focus), status: values.status, featured: values.featured }; }

function dateLabel(value: string | null): string { if (!value) return "Not checked"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
function StatusBadge({ status }: { status: string }) { if (status === "published") return <Badge variant="success">Published</Badge>; if (status === "archived") return <Badge variant="secondary">Archived</Badge>; return <Badge variant="warning">Draft</Badge>; }
function SourceBadge({ source }: { source: string | null }) { return source === "ai" ? <Badge variant="accent" className="gap-1"><Bot className="h-3 w-3" aria-hidden="true" /> AI</Badge> : <Badge variant="outline">Manual</Badge>; }
function ApplicationBadge({ status }: { status: FundingApplicationStatus }) {
  const label = status === "closing_soon" ? "Closing soon" : status === "rolling" ? "Rolling" : status === "upcoming" ? "Upcoming" : status === "closed" ? "Closed" : status === "paused" ? "Paused" : status === "open" ? "Open" : "Unknown";
  const variant = status === "open" || status === "rolling" ? "success" : status === "closing_soon" || status === "paused" ? "warning" : status === "unknown" ? "secondary" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

const AdminFunding = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FundingFilters>({ status: "all", source: "all", q: "" });
  const query = useAdminFunding(filters);
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const save = useSaveFunding();
  const setStatus = useSetFundingStatus();
  const toggleFeatured = useToggleFundingFeatured();
  const verify = useVerifyFunding();
  const del = useDeleteFunding();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FundingRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FundingRow | null>(null);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FundingFormValues>({ resolver: zodResolver(fundingSchema), defaultValues: FORM_DEFAULTS });

  const openCreate = () => { setEditing(null); reset(FORM_DEFAULTS); setDialogOpen(true); };
  const openEdit = (row: FundingRow) => { setEditing(row); reset(rowToForm(row)); setDialogOpen(true); };
  const onSubmit = handleSubmit((values) => { save.mutate({ id: editing?.id, values: formToPayload(values) }, { onSuccess: () => setDialogOpen(false) }); });
  const hasFilters = !!filters.q || filters.status !== "all" || filters.source !== "all";
  const aiDraftCount = useMemo(() => rows.filter((r) => r.source === "ai" && r.status === "draft").length, [rows]);
  const openCount = useMemo(() => rows.filter((r) => r.application_status === "open" || r.application_status === "rolling").length, [rows]);
  const closingSoonCount = useMemo(() => rows.filter((r) => r.application_status === "closing_soon").length, [rows]);
  const verifiedCount = useMemo(() => rows.filter((r) => r.verification_status === "verified").length, [rows]);

  return (
    <>
      <div className="space-y-7">
        <SEO title="Funding" noindex />
        <StudioPageHeader
          eyebrow="Opportunity radar"
          title="Funding opportunities"
          description="Manage opportunity status, deadlines, sources and verification."
          actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New opportunity</Button>}
        />

        <StudioMetricStrip
          items={[
            { label: "Open now", value: openCount.toLocaleString(), hint: "Accepting applications", icon: CircleDollarSign, tone: "cobalt" },
            { label: "Closing soon", value: closingSoonCount.toLocaleString(), hint: "Needs timely attention", icon: Clock3, tone: "orange" },
            { label: "AI drafts", value: aiDraftCount.toLocaleString(), hint: "Awaiting human review", icon: Bot, tone: "navy" },
            { label: "Verified sources", value: verifiedCount.toLocaleString(), hint: "Evidence checked", icon: BadgeCheck, tone: "lime" },
          ]}
        />

        {aiDraftCount > 0 && <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted p-4 text-sm"><Bot className="h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" /><p className="text-ink-strong"><span className="font-semibold">{aiDraftCount}</span> AI-sourced {aiDraftCount === 1 ? "draft is" : "drafts are"} awaiting review. AI drafts cannot become verified/open without authoritative source checks.</p></div>}

        <StudioToolbar className="flex-col sm:flex-row">
        <div className="relative sm:max-w-xs sm:flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="search" className="pl-9" placeholder="Search title or funder…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} aria-label="Search opportunities" /></div>
        <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}><SelectTrigger className="sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select>
        <Select value={filters.source} onValueChange={(v) => setFilters((f) => ({ ...f, source: v }))}><SelectTrigger className="sm:w-40" aria-label="Filter by source"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem><SelectItem value="manual">Manual</SelectItem><SelectItem value="ai">AI</SelectItem></SelectContent></Select>
        </StudioToolbar>

      <div>
        {query.isLoading ? <TableSkeleton rows={8} columns={8} /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : rows.length === 0 ? (
          <EmptyState variant={hasFilters ? "search" : "firstRun"} title="No opportunities found" description={hasFilters ? "Try adjusting your filters." : "Add your first funding opportunity to show it to members."} action={hasFilters ? undefined : { label: "New opportunity", onClick: openCreate }} />
        ) : (
          <StudioDataPanel>
            <Table>
              <TableHeader><TableRow><TableHead>Title / Funder</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Current cycle</TableHead><TableHead>Source trust</TableHead><TableHead>Publication</TableHead><TableHead>Featured</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isAiDraft = row.source === "ai" && row.status === "draft";
                  const confirmedDeadline = row.deadline_status === "confirmed" ? dateLabel(row.deadline_at) : row.deadline_status === "rolling" ? "Rolling intake" : "Deadline unconfirmed";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-xs"><div className="font-medium text-ink-strong">{row.title}</div><div className="text-sm text-muted-foreground">{row.funder}</div>{isAiDraft && <Badge variant="warning" className="mt-1">Needs review</Badge>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.type || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.amount || "—"}</TableCell>
                      <TableCell><div className="space-y-1"><ApplicationBadge status={row.application_status ?? "unknown"} /><div className="text-xs text-muted-foreground">{confirmedDeadline}</div><div className="text-xs text-muted-foreground">Checked {dateLabel(row.status_checked_at)}</div></div></TableCell>
                      <TableCell><div className="space-y-1"><div className="flex flex-wrap gap-1"><SourceBadge source={row.source} /><Badge variant={row.verification_status === "verified" ? "success" : row.verification_status === "stale" ? "warning" : "secondary"}>{row.verification_status ?? "unverified"}</Badge></div>{row.source_url ? <a href={row.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-dark hover:underline">Evidence <ExternalLink className="h-3 w-3" /></a> : <span className="text-xs text-muted-foreground">No source URL</span>}</div></TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                      <TableCell>{row.featured ? <Star className="h-4 w-4 fill-primary text-primary" aria-label="Featured" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right"><div className="flex items-center justify-end gap-2">{isAiDraft && <Button size="sm" onClick={() => openEdit(row)}>Review &amp; publish</Button>}<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>{row.status === "published" ? <DropdownMenuItem onClick={() => setStatus.mutate({ row, status: "draft" })}><EyeOff className="h-4 w-4" /> Unpublish</DropdownMenuItem> : <DropdownMenuItem onClick={() => setStatus.mutate({ row, status: "published" })}><Eye className="h-4 w-4" /> Publish</DropdownMenuItem>}<DropdownMenuItem onClick={() => toggleFeatured.mutate({ row, featured: !row.featured })}><Star className="h-4 w-4" />{row.featured ? "Unfeature" : "Feature"}</DropdownMenuItem><DropdownMenuItem onClick={() => user && verify.mutate({ row, verifiedBy: user.id })}><BadgeCheck className="h-4 w-4" /> Mark source verified</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive-strong focus:text-destructive-strong" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </StudioDataPanel>
        )}
      </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit opportunity" : "New opportunity"}</DialogTitle><DialogDescription>{editing ? "Update descriptive details, then save. Changing the program URL automatically invalidates previous source and application-status trust." : "Add a curated funding opportunity. Current-cycle status is established separately by source verification."}</DialogDescription></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="f-title">Title *</Label><Input id="f-title" {...register("title")} />{errors.title && <p className="text-sm text-destructive-strong">{errors.title.message}</p>}</div><div className="space-y-1.5"><Label htmlFor="f-funder">Funder *</Label><Input id="f-funder" {...register("funder")} />{errors.funder && <p className="text-sm text-destructive-strong">{errors.funder.message}</p>}</div></div>
            <div className="space-y-1.5"><Label htmlFor="f-summary">Summary</Label><Textarea id="f-summary" rows={3} {...register("summary")} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="f-type">Type</Label><Input id="f-type" placeholder="Grant, Accelerator…" {...register("type")} /></div><div className="space-y-1.5"><Label htmlFor="f-amount">Amount</Label><Input id="f-amount" placeholder="Up to $50,000" {...register("amount")} /></div><div className="space-y-1.5"><Label htmlFor="f-opens">Legacy opens text</Label><Input id="f-opens" {...register("opens")} /></div><div className="space-y-1.5"><Label htmlFor="f-deadline">Legacy deadline text</Label><Input id="f-deadline" {...register("deadline")} /></div></div>
            <div className="space-y-1.5"><Label htmlFor="f-eligibility">Eligibility</Label><Textarea id="f-eligibility" rows={2} {...register("eligibility")} /></div>
            <div className="space-y-1.5"><Label htmlFor="f-url">Official program URL</Label><Input id="f-url" type="url" placeholder="https://…" {...register("url")} />{errors.url && <p className="text-sm text-destructive-strong">{errors.url.message}</p>}<p className="text-xs text-muted-foreground">Changing this URL clears existing verification and current-cycle status until rechecked.</p></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="f-tags">Tags (comma-separated)</Label><Input id="f-tags" placeholder="women, fintech" {...register("tags")} /></div><div className="space-y-1.5"><Label htmlFor="f-countries">Country focus (comma-separated)</Label><Input id="f-countries" placeholder="Nigeria, Kenya" {...register("country_focus")} /></div></div>
            <div className="grid items-end gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="f-status">Publication status</Label><Controller control={control} name="status" render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="f-status"><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>} /></div><div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="f-featured">Featured</Label><Controller control={control} name="featured" render={({ field }) => <Switch id="f-featured" checked={field.value} onCheckedChange={field.onChange} />} /></div></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : editing ? "Save changes" : "Create"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this opportunity?</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.title} will be permanently removed. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) del.mutate(deleteTarget); setDeleteTarget(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};

export default AdminFunding;
