import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Archive,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Inbox,
  ListChecks,
  Mail,
  MoreHorizontal,
  Search,
  Undo2,
} from "lucide-react";
import { BUSINESS_SECTORS } from "@shared/lib/businessSectors";
import { getInquiryDetails, SUPPORT_AREAS } from "@shared/lib/inquiries";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { StatCard } from "@shared/components/common/StatCard";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { TableSkeleton } from "@shared/components/common/LoadingState";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@shared/components/ui/dropdown-menu";
import {
  downloadCsv,
  toCsv,
  useAdminLeads,
  useUpdateLeadStatus,
  type LeadFilters,
  type LeadRow,
} from "@/hooks/queries/adminOps";

const SOURCE_LABELS: Record<string, string> = {
  contact: "Website inquiry",
  resource_download: "Resource request",
  demo: "Demo request",
  other: "Other",
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "new") return <Badge variant="accent">New</Badge>;
  if (status === "contacted") return <Badge variant="success">In progress</Badge>;
  return <Badge variant="secondary">Resolved</Badge>;
}

export default function AdminLeads() {
  const [filters, setFilters] = useState<LeadFilters>({ status: "all", area: "all", sector: "all", q: "" });
  const query = useAdminLeads(filters);
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const update = useUpdateLeadStatus();
  const [detail, setDetail] = useState<LeadRow | null>(null);

  const counts = useMemo(() => rows.reduce((summary, row) => {
    if (row.status === "new") summary.new += 1;
    if (row.status === "contacted") summary.inProgress += 1;
    if (row.status === "archived") summary.resolved += 1;
    summary.total += 1;
    return summary;
  }, { new: 0, inProgress: 0, resolved: 0, total: 0 }), [rows]);
  const hasFilters = !!filters.q || filters.status !== "all" || filters.area !== "all" || filters.sector !== "all";
  const detailClassification = detail ? getInquiryDetails(detail.source, detail.metadata) : null;

  const exportCsv = () => {
    const csv = toCsv(
      ["Email", "Name", "Company", "Support area", "Business sector", "Channel", "Status", "Message", "Received"],
      rows.map((row) => {
        const classification = getInquiryDetails(row.source, row.metadata);
        return [
          row.email,
          row.name ?? "",
          row.company ?? "",
          classification.areaLabel,
          classification.sector ?? "",
          sourceLabel(row.source),
          row.status,
          row.message ?? "",
          format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
        ];
      }),
    );
    downloadCsv(`inquiries-${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
  };

  return (
    <>
      <SEO title="Support Inbox" noindex />
      <PageHeader
        title="Support inbox"
        subtitle="Review questions, resource requests and partnership conversations in one place."
        actions={<Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}><Download className="h-4 w-4" /> Export CSV</Button>}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New inquiries" value={counts.new} icon={Inbox} />
        <StatCard label="In progress" value={counts.inProgress} icon={Clock3} />
        <StatCard label="Resolved" value={counts.resolved} icon={CheckCircle2} />
        <StatCard label="Total inquiries" value={counts.total} icon={ListChecks} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1fr)_11rem_13rem_15rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search contact, company or message…"
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            aria-label="Search inquiries"
          />
        </div>
        <Select value={filters.status} onValueChange={(status) => setFilters((current) => ({ ...current, status }))}>
          <SelectTrigger aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">In progress</SelectItem>
            <SelectItem value="archived">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.area} onValueChange={(area) => setFilters((current) => ({ ...current, area }))}>
          <SelectTrigger aria-label="Filter by support area"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All support areas</SelectItem>
            {SUPPORT_AREAS.map((area) => <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.sector} onValueChange={(sector) => setFilters((current) => ({ ...current, sector }))}>
          <SelectTrigger aria-label="Filter by business sector"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All business sectors</SelectItem>
            {BUSINESS_SECTORS.map((sector) => <SelectItem key={sector} value={sector}>{sector}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            variant={hasFilters ? "search" : "default"}
            title={hasFilters ? "No matching inquiries" : "Inbox clear"}
            description={hasFilters ? "Try adjusting your filters." : "New support and resource inquiries will appear here."}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Support area</TableHead>
                  <TableHead>Business sector</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const classification = getInquiryDetails(row.source, row.metadata);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[16rem]">
                        <a href={`mailto:${row.email}`} className="font-medium text-ink-strong underline-offset-2 hover:underline">{row.email}</a>
                        {row.name ? <div className="text-sm text-muted-foreground">{row.name}</div> : null}
                        {row.company ? <div className="text-xs text-muted-foreground">{row.company}</div> : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{classification.areaLabel}</Badge>
                        <div className="mt-1 text-xs text-muted-foreground">{sourceLabel(row.source)}</div>
                      </TableCell>
                      <TableCell className="max-w-[13rem] text-sm text-muted-foreground">{classification.sector ?? "Not provided"}</TableCell>
                      <TableCell className="max-w-[18rem]">
                        {row.message ? (
                          <button type="button" onClick={() => setDetail(row)} className="line-clamp-2 text-left text-sm text-muted-foreground underline-offset-2 hover:underline">{row.message}</button>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{format(new Date(row.created_at), "d MMM yyyy")}</TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" aria-label={`Email ${row.email}`}><a href={`mailto:${row.email}`}><Mail className="h-4 w-4" /></a></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {row.status !== "contacted" ? <DropdownMenuItem onClick={() => update.mutate({ row, status: "contacted" })}><Check className="h-4 w-4" /> Mark in progress</DropdownMenuItem> : null}
                              {row.status !== "archived" ? <DropdownMenuItem onClick={() => update.mutate({ row, status: "archived" })}><Archive className="h-4 w-4" /> Resolve</DropdownMenuItem> : null}
                              {row.status !== "new" ? <DropdownMenuItem onClick={() => update.mutate({ row, status: "new" })}><Undo2 className="h-4 w-4" /> Reopen</DropdownMenuItem> : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.name || detail?.email}</DialogTitle>
            <DialogDescription>{detail ? `${sourceLabel(detail.source)} · ${format(new Date(detail.created_at), "d MMM yyyy, HH:mm")}` : null}</DialogDescription>
          </DialogHeader>
          {detail && detailClassification ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-4 rounded-xl bg-surface-muted p-4 sm:grid-cols-2">
                <div><p className="text-muted-foreground">Support area</p><p className="mt-1 font-medium text-ink-strong">{detailClassification.areaLabel}</p></div>
                <div><p className="text-muted-foreground">Business sector</p><p className="mt-1 font-medium text-ink-strong">{detailClassification.sector ?? "Not provided"}</p></div>
              </div>
              <div className="grid gap-1"><span className="text-muted-foreground">Email</span><a href={`mailto:${detail.email}`} className="font-medium text-ink-strong underline-offset-2 hover:underline">{detail.email}</a></div>
              {detail.company ? <div className="grid gap-1"><span className="text-muted-foreground">Company</span><span className="text-ink-strong">{detail.company}</span></div> : null}
              <div className="grid gap-1"><span className="text-muted-foreground">Message</span><p className="whitespace-pre-wrap text-ink-strong">{detail.message || "—"}</p></div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild variant="outline" size="sm"><a href={`mailto:${detail.email}`}><Mail className="h-4 w-4" /> Reply</a></Button>
                {detail.status !== "contacted" ? <Button size="sm" onClick={() => { update.mutate({ row: detail, status: "contacted" }); setDetail(null); }}><Check className="h-4 w-4" /> Mark in progress</Button> : null}
                {detail.status !== "archived" ? <Button variant="outline" size="sm" onClick={() => { update.mutate({ row: detail, status: "archived" }); setDetail(null); }}><Archive className="h-4 w-4" /> Resolve</Button> : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
