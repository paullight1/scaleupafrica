import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Search, Download, Mail, UserMinus, UserPlus } from "lucide-react";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { StatCard } from "@shared/components/common/StatCard";
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
  useAdminSubscribers,
  useUpdateSubscriberStatus,
  toCsv,
  downloadCsv,
  type SubscriberFilters,
} from "@/hooks/queries/adminOps";

const AdminNewsletter = () => {
  const [filters, setFilters] = useState<SubscriberFilters>({ status: "all", q: "" });

  const query = useAdminSubscribers(filters);
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const update = useUpdateSubscriberStatus();

  const hasFilters = !!filters.q || filters.status !== "all";
  const subscribedCount = useMemo(
    () => rows.filter((r) => r.status === "subscribed").length,
    [rows],
  );

  const exportCsv = () => {
    const subscribed = rows.filter((r) => r.status === "subscribed");
    const csv = toCsv(
      ["Email", "Source", "Joined"],
      subscribed.map((r) => [
        r.email,
        r.source ?? "",
        format(new Date(r.created_at), "yyyy-MM-dd"),
      ]),
    );
    downloadCsv(`newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`, csv);
  };

  return (
    <>
      <SEO title="Newsletter" noindex />
      <PageHeader
        title="Newsletter"
        subtitle="Manage newsletter subscribers and export the active list."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={subscribedCount === 0}>
            <Download className="h-4 w-4" /> Export subscribed
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Subscribed"
          value={subscribedCount}
          icon={Mail}
          hint="active in current view"
          loading={query.isLoading}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search email…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            aria-label="Search subscribers"
          />
        </div>
        <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="subscribed">Subscribed</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <TableSkeleton rows={8} columns={4} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            variant={hasFilters ? "search" : "default"}
            title="No subscribers yet"
            description={
              hasFilters ? "Try adjusting your filters." : "New sign-ups will appear here."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const subscribed = row.status === "subscribed";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-ink-strong">{row.email}</TableCell>
                      <TableCell>
                        {subscribed ? (
                          <Badge variant="success">Subscribed</Badge>
                        ) : (
                          <Badge variant="secondary">Unsubscribed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.source || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(row.created_at), "d MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {subscribed ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => update.mutate({ row, status: "unsubscribed" })}
                          >
                            <UserMinus className="h-4 w-4" /> Unsubscribe
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => update.mutate({ row, status: "subscribed" })}
                          >
                            <UserPlus className="h-4 w-4" /> Resubscribe
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminNewsletter;
