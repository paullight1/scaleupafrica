import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Search, ChevronDown } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { SEO } from "@/components/common/SEO";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuditLog, type AuditRow } from "@/hooks/queries/adminOps";

function actionLabel(action: string): string {
  return action.replace(/_/g, " ");
}

/** Render the jsonb details as compact key: value pairs (skips empty objects). */
function DetailPairs({ details }: { details: Json }) {
  const entries =
    details && typeof details === "object" && !Array.isArray(details)
      ? Object.entries(details as Record<string, unknown>)
      : [];
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <dl className="grid gap-1 text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">{k}:</dt>
          <dd className="min-w-0 break-words text-ink-strong">
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AuditItem({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false);
  const created = new Date(row.created_at);
  const hasDetails =
    row.details &&
    typeof row.details === "object" &&
    !Array.isArray(row.details) &&
    Object.keys(row.details as Record<string, unknown>).length > 0;

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap align-top">
          <div className="text-sm text-ink-strong">{formatDistanceToNow(created, { addSuffix: true })}</div>
          <div className="text-xs text-muted-foreground">{format(created, "d MMM yyyy, HH:mm")}</div>
        </TableCell>
        <TableCell className="align-top text-sm text-muted-foreground">
          {row.actor_email || "—"}
        </TableCell>
        <TableCell className="align-top">
          <Badge variant="outline">{actionLabel(row.action)}</Badge>
        </TableCell>
        <TableCell className="align-top text-sm">
          {row.entity_type ? (
            <>
              <div className="text-ink-strong">{row.entity_type}</div>
              {row.entity_id && (
                <div className="truncate text-xs text-muted-foreground" title={row.entity_id}>
                  {row.entity_id}
                </div>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="align-top">
          {hasDetails ? (
            <Collapsible open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger className="inline-flex items-center gap-1 text-sm text-primary-dark underline-offset-2 hover:underline">
                {open ? "Hide" : "View"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""} motion-reduce:transition-none`}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <DetailPairs details={row.details} />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
  );
}

const AdminAuditLog = () => {
  const [entityType, setEntityType] = useState("all");
  const [q, setQ] = useState("");

  const query = useAuditLog();
  const allRows = useMemo(() => query.data ?? [], [query.data]);

  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) if (r.entity_type) set.add(r.entity_type);
    return Array.from(set).sort();
  }, [allRows]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allRows.filter((r) => {
      if (entityType !== "all" && r.entity_type !== entityType) return false;
      if (term) {
        const hay = `${r.action} ${r.actor_email ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [allRows, entityType, q]);

  const hasFilters = !!q || entityType !== "all";

  return (
    <>
      <SEO title="Audit log" noindex />
      <PageHeader
        title="Audit log"
        subtitle="A read-only record of admin actions across the platform."
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search action or actor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search audit log"
          />
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="sm:w-52" aria-label="Filter by entity type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {entityTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <TableSkeleton rows={10} columns={5} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            variant={hasFilters ? "search" : "default"}
            title="No activity"
            description={
              hasFilters ? "Try adjusting your filters." : "Admin actions will be recorded here."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <AuditItem key={row.id} row={row} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminAuditLog;
