import { Activity, MailCheck, MousePointerClick, UserMinus, UsersRound } from "lucide-react";
import { StatCard } from "@shared/components/common/StatCard";
import { ErrorState } from "@shared/components/common/ErrorState";
import { Badge } from "@shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { useNewsletterOverview } from "@/hooks/queries/adminNewsletter";

const percent = (value: number) => new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 }).format(value || 0);

export default function NewsletterOverview() {
  const query = useNewsletterOverview();
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const data = query.data;
  return <div className="space-y-6 pt-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active subscribers" value={data?.activeSubscribers ?? 0} icon={UsersRound} hint={`${data?.newSubscribers30d ?? 0} joined in 30 days`} loading={query.isLoading} />
      <StatCard label="Delivery rate" value={percent(data?.deliveryRate ?? 0)} icon={MailCheck} hint={`${data?.delivered30d ?? 0} delivered in 30 days`} loading={query.isLoading} />
      <StatCard label="Click rate" value={percent(data?.clickRate ?? 0)} icon={MousePointerClick} hint={`${data?.clicked30d ?? 0} tracked clicks`} loading={query.isLoading} />
      <StatCard label="Unsubscribed" value={data?.unsubscribedSubscribers ?? 0} icon={UserMinus} hint={`${data?.unsubscribed30d ?? 0} in 30 days`} loading={query.isLoading} />
    </div>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
      <Card className="overflow-hidden shadow-soft"><CardHeader className="border-b border-border bg-secondary/40"><div className="flex items-center justify-between"><CardTitle className="font-display text-lg">Recent campaigns</CardTitle><Badge variant="outline">Last 5</Badge></div></CardHeader><CardContent className="p-0">
        {data?.recentCampaigns?.length ? data.recentCampaigns.map((campaign) => <div key={campaign.id} className="flex items-center justify-between gap-4 border-b border-border px-6 py-4 last:border-0"><div className="min-w-0"><p className="truncate font-medium text-ink-strong">{campaign.internal_name}</p><p className="truncate text-sm text-muted-foreground">{campaign.subject}</p></div><Badge variant={campaign.status === "sent" ? "success" : campaign.status === "failed" ? "destructive" : "secondary"}>{campaign.status}</Badge></div>) : <div className="px-6 py-12 text-center text-sm text-muted-foreground">Your first campaign will appear here.</div>}
      </CardContent></Card>
      <Card className="border-navy/10 bg-navy text-white shadow-soft"><CardHeader><CardTitle className="flex items-center gap-2 font-display text-lg"><Activity className="h-5 w-5 text-primary" />Delivery health</CardTitle></CardHeader><CardContent className="space-y-4 text-sm text-white/75"><div className="flex justify-between"><span>Brevo configuration</span><span className={data?.configured ? "text-emerald-300" : "text-amber-300"}>{data?.configured ? "Ready" : "Missing"}</span></div><div className="flex justify-between"><span>Failed contact syncs</span><span className={data?.failedSyncCount ? "text-amber-300" : "text-emerald-300"}>{data?.failedSyncCount ?? 0}</span></div><p className="border-t border-white/10 pt-4 text-xs leading-5 text-white/55">Open rates are approximate because mailbox privacy can preload tracking pixels.</p></CardContent></Card>
    </div>
  </div>;
}
