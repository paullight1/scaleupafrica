import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Search, Mail, Download, MoreHorizontal, Check, Archive, Undo2 } from "lucide-react";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { TableSkeleton } from "@shared/components/common/LoadingState";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
  useAdminLeads,
  useUpdateLeadStatus,
  toCsv,
  downloadCsv,
  type LeadRow,
  type LeadFilters,
} from "@/hooks/queries/adminOps";

const SOURCE_OPTIONS = [
  { value: "contact", label: "Contact" },
  { value: "resource_download", label: "Resource download" },
  { value: "demo", label: "Demo" },
  { value: "other", label: "Other" },
] as const;

function sourceLabel(source: string): string {
  return SOURCE_OPTIONS.find((s) => s.value === source)?.label ?? source;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "new") return <Badge variant="accent">New</Badge>;
  if (status === "contacted") return <Badge variant="success">Contacted</Badge>;
  return <Badge variant="secondary">Archived</Badge>;
}

const AdminLeads = () => {
  const [filters, setFilters] = useState<LeadFilters>({ status: "all", source: "all", q: "" });

  const query = useAdminLeads(filters);
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const update = useUpdateLeadStatus();

  const [detail, setDetail] = useState<LeadRow | null>(null);

  const hasFilters = !!filters.q || filters.status !== "all" || filters.source !== "all";
  const newCount = useMemo(() => rows.filter((r) => r.status === "new").length, [rows]);

  const exportCsv = () => {
    const csv = toCsv(
      ["Email", "Name", "Company", "Source", "Status", "Message", "Received"],
      rows.map((r) => [
        r.email,
        r.name ?? "",
        r.company ?? "",
        sourceLabel(r.source),
        r.status,
        r.message ?? "",
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
      ]),
    );
    downloadCsv(`leads-${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
  };

  return (
    <>
      <SEO title="Leads" noindex />
      <PageHeader
        title="Leads"
        subtitle="Inbound messages from the contact form, demos and resource downloads."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search email or name…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            aria-label="Search leads"
          />
        </div>
        <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.source} onValueChange={(v) => setFilters((f) => ({ ...f, source: v }))}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCE_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!query.isLoading && !query.isError && (
          <div className="text-sm text-muted-foreground sm:ml-auto">
            <span className="font-semibold text-ink-strong">{newCount}</span> new
          </div>
        )}
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            variant={hasFilters ? "search" : "default"}
            title="No leads yet"
            description={
              hasFilters
                ? "Try adjusting your filters."
                : "Messages from the contact form and downloads will appear here."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email / Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[16rem]">
                      <a
                        href={`mailto:${row.email}`}
                        className="font-medium text-ink-strong underline-offset-2 hover:underline"
                      >
                        {row.email}
                      </a>
                      {row.name && <div className="text-sm text-muted-foreground">{row.name}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.company || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sourceLabel(row.source)}</Badge>
                      {row.resource_id && (
                        <div className="mt-1 text-xs text-muted-foreground">Resource attached</div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[18rem]">
                      {row.message ? (
                        <button
                          type="button"
                          onClick={() => setDetail(row)}
                          className="line-clamp-2 text-left text-sm text-muted-foreground underline-offset-2 hover:underline"
                        >
                          {row.message}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(row.created_at), "d MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label={`Email ${row.email}`}>
                          <a href={`mailto:${row.email}`}>
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {row.status !== "contacted" && (
                              <DropdownMenuItem
                                onClick={() => update.mutate({ row, status: "contacted" })}
                              >
                                <Check className="h-4 w-4" /> Mark contacted
                              </DropdownMenuItem>
                            )}
                            {row.status !== "archived" && (
                              <DropdownMenuItem
                                onClick={() => update.mutate({ row, status: "archived" })}
                              >
                                <Archive className="h-4 w-4" /> Archive
                              </DropdownMenuItem>
                            )}
                            {row.status !== "new" && (
                              <DropdownMenuItem onClick={() => update.mutate({ row, status: "new" })}>
                                <Undo2 className="h-4 w-4" /> Mark new
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.name || detail?.email}</DialogTitle>
            <DialogDescription>
              {detail && (
                <>
                  {sourceLabel(detail.source)} ·{" "}
                  {format(new Date(detail.created_at), "d MMM yyyy, HH:mm")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-1">
                <span className="text-muted-foreground">Email</span>
                <a
                  href={`mailto:${detail.email}`}
                  className="font-medium text-ink-strong underline-offset-2 hover:underline"
                >
                  {detail.email}
                </a>
              </div>
              {detail.company && (
                <div className="grid gap-1">
                  <span className="text-muted-foreground">Company</span>
                  <span className="text-ink-strong">{detail.company}</span>
                </div>
              )}
              <div className="grid gap-1">
                <span className="text-muted-foreground">Message</span>
                <p className="whitespace-pre-wrap text-ink-strong">{detail.message || "—"}</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${detail.email}`}>
                    <Mail className="h-4 w-4" /> Reply
                  </a>
                </Button>
                {detail.status !== "contacted" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      update.mutate({ row: detail, status: "contacted" });
                      setDetail(null);
                    }}
                  >
                    <Check className="h-4 w-4" /> Mark contacted
                  </Button>
                )}
                {detail.status !== "archived" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      update.mutate({ row: detail, status: "archived" });
                      setDetail(null);
                    }}
                  >
                    <Archive className="h-4 w-4" /> Archive
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminLeads;
