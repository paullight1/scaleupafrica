import { useState } from "react";
import { format } from "date-fns";
import { Archive, Copy, FilePenLine, Search, Send, XCircle } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { TableSkeleton } from "@shared/components/common/LoadingState";
import { useCancelNewsletterCampaign, useDuplicateNewsletterCampaign, useNewsletterCampaigns, type CampaignSummary } from "@/hooks/queries/adminNewsletter";

function variant(status: CampaignSummary["status"]): "success" | "destructive" | "warning" | "secondary" | "accent" {
  return status === "sent" ? "success" : status === "failed" ? "destructive" : status === "scheduled" || status === "sending" ? "warning" : status === "draft" ? "accent" : "secondary";
}

export default function CampaignList({ onOpen }: { onOpen: (id: string) => void }) {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const query = useNewsletterCampaigns(status, q.trim());
  const duplicate = useDuplicateNewsletterCampaign();
  const cancel = useCancelNewsletterCampaign();
  return <div className="space-y-5 pt-5">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><h2 className="font-display text-xl font-semibold text-ink-strong">Campaigns</h2><p className="mt-1 text-sm text-muted-foreground">Draft, test, schedule and inspect every Cresciva dispatch.</p></div><div className="flex gap-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9 sm:w-64" aria-label="Search campaigns" placeholder="Search campaigns…" value={q} onChange={(event) => setQ(event.target.value)} /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40" aria-label="Campaign status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["draft", "scheduled", "sending", "sent", "failed", "cancelled", "archived"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div>
    {query.isLoading ? <TableSkeleton rows={5} columns={5} /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : !query.data?.rows.length ? <EmptyState icon={Send} title="No campaigns here" description="Create a rich campaign, send a test, then choose immediate or scheduled delivery." /> : <div className="grid gap-3">{query.data.rows.map((campaign) => <article key={campaign.id} className="rounded-xl border border-border bg-card p-5 shadow-soft"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Badge variant={variant(campaign.status)}>{campaign.status}</Badge><span className="text-xs text-muted-foreground">Revision {campaign.revision}</span></div><h3 className="mt-2 truncate font-display text-lg font-semibold text-ink-strong">{campaign.internal_name}</h3><p className="mt-1 truncate text-sm text-muted-foreground">{campaign.subject}</p></div><div className="flex gap-8 text-sm"><div><p className="text-xs text-muted-foreground">Audience</p><p className="font-medium">{campaign.final_recipient_count ?? campaign.estimated_recipient_count ?? "—"}</p></div><div><p className="text-xs text-muted-foreground">Updated</p><p className="font-medium">{format(new Date(campaign.sent_at ?? campaign.scheduled_at ?? campaign.updated_at), "d MMM, HH:mm")}</p></div></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => onOpen(campaign.id)}>{campaign.status === "draft" ? <FilePenLine className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{campaign.status === "draft" ? "Edit" : "Report"}</Button><Button variant="ghost" size="sm" onClick={() => duplicate.mutate(campaign.id)}><Copy className="h-4 w-4" />Duplicate</Button>{campaign.status === "scheduled" && <Button variant="ghost" size="sm" onClick={() => cancel.mutate(campaign.id)}><XCircle className="h-4 w-4" />Cancel</Button>}</div></div></article>)}</div>}
  </div>;
}
