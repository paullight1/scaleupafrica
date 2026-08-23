import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import { PageHeader } from "@shared/components/common/PageHeader";
import { SEO } from "@shared/components/common/SEO";
import { ErrorState } from "@shared/components/common/ErrorState";
import { EmptyState } from "@shared/components/common/EmptyState";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/components/ui/table";
import { toast } from "sonner";

const KEY = ["admin", "funding-reports"] as const;

type FundingReportRow = {
  id: string;
  opportunity_id: string;
  category: "closed" | "deadline" | "eligibility" | "source" | "other";
  message: string | null;
  status: "new" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  funding_opportunities: { title?: string | null; funder?: string | null; source_url?: string | null; url?: string | null } | null;
};

function useFundingReports() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funding_opportunity_reports")
        .select("id, opportunity_id, category, message, status, created_at, funding_opportunities(title,funder,source_url,url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FundingReportRow[];
    },
  });
}

const AdminFundingReports = () => {
  const query = useFundingReports();
  const client = useQueryClient();
  const { user } = useAuth();
  const rows = useMemo(() => query.data ?? [], [query.data]);

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FundingReportRow["status"] }) => {
      const { error } = await supabase
        .from("funding_opportunity_reports")
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEY });
      toast.success("Funding report updated.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't update report."),
  });

  return (
    <>
      <SEO title="Funding reports" noindex />
      <PageHeader title="Funding reports" subtitle="Review member reports about closed, outdated or incorrect funding information before changing canonical source/status data." />

      <div className="mt-6">
        {query.isPending ? <p className="text-sm text-muted-foreground">Loading reports…</p> : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState variant="firstRun" title="No funding reports" description="Member reports about stale or incorrect funding records will appear here." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
            <Table>
              <TableHeader><TableRow><TableHead>Opportunity</TableHead><TableHead>Issue</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead><TableHead>Reported</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const opportunity = row.funding_opportunities;
                  const sourceUrl = opportunity?.source_url || opportunity?.url || null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell><div className="font-medium text-ink-strong">{opportunity?.title || row.opportunity_id}</div><div className="text-xs text-muted-foreground">{opportunity?.funder || "Unknown funder"}</div>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-dark hover:underline">Open source</a> : null}</TableCell>
                      <TableCell><Badge variant="outline">{row.category}</Badge></TableCell>
                      <TableCell className="max-w-sm whitespace-normal text-sm text-muted-foreground">{row.message || "—"}</TableCell>
                      <TableCell><Badge variant={row.status === "resolved" ? "success" : row.status === "reviewing" ? "warning" : "secondary"}>{row.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right"><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: row.id, status: "reviewing" })}>Reviewing</Button><Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: row.id, status: "resolved" })}>Resolved</Button><Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => update.mutate({ id: row.id, status: "dismissed" })}>Dismiss</Button></div></TableCell>
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

export default AdminFundingReports;
