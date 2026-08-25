import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  Download,
  Eye,
  FileText,
  Inbox,
  Newspaper,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SEO } from "@shared/components/common/SEO";
import { ErrorState } from "@shared/components/common/ErrorState";
import { CardSkeleton, DashboardSkeleton } from "@shared/components/common/LoadingState";
import { Button } from "@shared/components/ui/button";
import { useAuth } from "@shared/hooks/useAuth";
import { cn } from "@shared/lib/utils";
import {
  useAdminContentPerformance,
  useAdminReportingSummary,
  useAdminStats,
  useAdminTimeseries,
  type AdminStats,
  type ContentPerformanceRow,
  type TimeseriesPoint,
} from "@/hooks/queries/adminDashboard";

const numberFmt = new Intl.NumberFormat("en-US");
const fmt = (n: number | undefined) => numberFmt.format(n ?? 0);

function formatDay(day: string): string {
  const date = new Date(day.length <= 10 ? `${day}T00:00:00` : day);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const prefersReducedMotion =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" } as const;
const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "0.75rem",
  color: "hsl(var(--ink-strong))",
  boxShadow: "var(--shadow-soft)",
} as const;

type SummaryTone = "blue" | "green" | "peach" | "yellow";

const SUMMARY_TONES: Record<SummaryTone, { card: string; icon: string; accent: string }> = {
  blue: { card: "border-[#dce8fa] bg-[#eef5ff]", icon: "text-[#4f7fc9]", accent: "bg-[#dbeafe] text-[#285f9e]" },
  green: { card: "border-[#d8eadf] bg-[#eef8f1]", icon: "text-[#4a9b6d]", accent: "bg-[#dff2e5] text-[#27764a]" },
  peach: { card: "border-[#f2ded2] bg-[#fff3ec]", icon: "text-[#d98255]", accent: "bg-[#f9e4d8] text-[#a44b28]" },
  yellow: { card: "border-[#eee4bb] bg-[#fff9df]", icon: "text-[#b88a22]", accent: "bg-[#f7edbc] text-[#87610c]" },
};

function SummaryCard({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: LucideIcon; tone: SummaryTone }) {
  const palette = SUMMARY_TONES[tone];
  return (
    <article className={cn("group relative min-h-40 overflow-hidden rounded-2xl border p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-medium motion-reduce:transform-none", palette.card)}>
      <Icon className={cn("pointer-events-none absolute -bottom-7 -right-5 h-32 w-32 stroke-[1.25] opacity-[0.12] transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 motion-reduce:transform-none", palette.icon)} aria-hidden="true" />
      <div className="relative z-10 flex h-full flex-col items-start">
        <p className="text-sm font-medium text-ink/70">{label}</p>
        <p className="mt-3 font-display text-4xl font-bold tracking-tight text-ink-strong">{value}</p>
        <span className={cn("mt-auto inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", palette.accent)}>{hint}</span>
      </div>
    </article>
  );
}

function KpiGrid({ stats }: { stats: AdminStats }) {
  const subscriptionShare = stats.total_users > 0 ? Math.round((stats.active_subscriptions / stats.total_users) * 100) : 0;
  return (
    <section aria-label="Business summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="Total users" value={fmt(stats.total_users)} hint={stats.new_users_7d > 0 ? `+${fmt(stats.new_users_7d)} this week` : "No new users this week"} icon={Users} tone="blue" />
      <SummaryCard label="Active subscriptions" value={fmt(stats.active_subscriptions)} hint={`${subscriptionShare}% of the community`} icon={BadgeCheck} tone="green" />
      <SummaryCard label="Directory profiles" value={fmt(stats.total_profiles)} hint={stats.new_profiles_7d > 0 ? `+${fmt(stats.new_profiles_7d)} this week` : "Directory is up to date"} icon={Building2} tone="peach" />
      <SummaryCard label="New inquiries" value={fmt(stats.new_leads)} hint={stats.new_leads > 0 ? "Ready for follow-up" : "Inbox is clear"} icon={Inbox} tone="yellow" />
    </section>
  );
}

function DonutBreakdown({ label, value, data, colors, legend }: { label: string; value: number; data: Array<{ name: string; value: number }>; colors: string[]; legend: Array<{ label: string; value: number; color: string }> }) {
  const hasData = data.some((entry) => entry.value > 0);
  const chartData = hasData ? data : [{ name: "No data", value: 1 }];
  return (
    <figure role="img" aria-label={label} className="flex min-w-0 items-center gap-3">
      <div className="relative h-28 w-28 shrink-0">
        <PieChart width={112} height={112}>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={39} outerRadius={52} startAngle={90} endAngle={-270} stroke="none" isAnimationActive={!prefersReducedMotion}>
            {chartData.map((entry, index) => <Cell key={entry.name} fill={hasData ? colors[index % colors.length] : "hsl(var(--border))"} />)}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-ink-strong">{fmt(value)}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">total</span>
        </div>
      </div>
      <figcaption className="min-w-0 space-y-3">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
            <div className="min-w-0"><p className="text-xs leading-tight text-muted-foreground">{item.label}</p><p className="font-display text-base font-bold text-ink-strong">{fmt(item.value)}</p></div>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}

function ContentType({ type }: { type: string }) {
  const isBlog = type.toLocaleLowerCase() === "blog";
  const Icon = isBlog ? Newspaper : BookOpen;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", isBlog ? "bg-[#fff0e8] text-[#a84e2d]" : "bg-[#e9f3ff] text-[#2e629f]")}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />{isBlog ? "Blog post" : "Resource"}
    </span>
  );
}

function ContentPerformance({ rows, isLoading, isError, onRetry }: { rows: ContentPerformanceRow[]; isLoading: boolean; isError: boolean; onRetry: () => void }) {
  return (
    <section aria-labelledby="content-performance-heading" className="h-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0e8] text-[#c45f35]"><Newspaper className="h-5 w-5" aria-hidden="true" /></span>
          <div><h2 id="content-performance-heading" className="font-display text-lg font-semibold text-ink-strong">Content performance</h2><p className="text-xs text-muted-foreground">What readers are engaging with</p></div>
        </div>
        <Link to="/admin/blog" className="hidden items-center gap-1 text-sm font-semibold text-primary-dark hover:text-primary sm:flex">Manage content <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      {isError ? (
        <div className="p-5"><ErrorState compact onRetry={onRetry} /></div>
      ) : isLoading ? (
        <CardSkeleton lines={5} className="border-0 shadow-none" />
      ) : rows.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><FileText className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-ink-strong">No performance data yet</p><p className="mt-1 text-xs text-muted-foreground">Published content will appear here once readers engage.</p></div>
      ) : (
        <ol className="divide-y divide-border">
          {rows.slice(0, 3).map((row) => (
            <li key={`${row.contentType}-${row.contentId}`} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle sm:px-5">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", row.contentType.toLocaleLowerCase() === "blog" ? "bg-[#fff5ef] text-[#c45f35]" : "bg-[#eff6ff] text-[#3f73b5]")}>
                {row.contentType.toLocaleLowerCase() === "blog" ? <Newspaper className="h-5 w-5" role="img" aria-label="Blog post icon" /> : <BookOpen className="h-5 w-5" role="img" aria-label="Resource icon" />}
              </span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink-strong">{row.title}</p><div className="mt-1"><ContentType type={row.contentType} /></div></div>
              <div className="hidden shrink-0 items-center gap-5 text-xs text-muted-foreground sm:flex"><span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" aria-hidden="true" />{fmt(row.views)} views</span>{row.downloads > 0 && <span className="inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5" aria-hidden="true" />{fmt(row.downloads)} downloads</span>}</div>
              <span className="w-10 text-right font-display text-base font-bold text-ink-strong sm:hidden">{fmt(row.totalEngagement)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const AdminDashboard = () => {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const { user } = useAuth();
  const statsQuery = useAdminStats();
  const reportingQuery = useAdminReportingSummary(period);
  const performanceQuery = useAdminContentPerformance(period, 3);
  const signupsQuery = useAdminTimeseries("signups", period);
  const signups = useMemo<TimeseriesPoint[]>(() => signupsQuery.data ?? [], [signupsQuery.data]);
  const fullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const firstName = fullName.split(/\s+/)[0] || "";
  const greeting = `${greetingForHour(new Date().getHours())}${firstName ? `, ${firstName}` : ""}`;

  const header = (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark"><Sparkles className="h-4 w-4" aria-hidden="true" /> Daily overview</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-strong md:text-4xl">{greeting}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Here’s what’s happening across Cresciva today.</p>
      </div>
      <div className="inline-flex w-fit rounded-xl border border-border bg-card p-1 shadow-sm" aria-label="Reporting period">
        {([7, 30, 90] as const).map((days) => (
          <Button key={days} size="sm" variant="ghost" aria-pressed={period === days} onClick={() => setPeriod(days)} className={cn("rounded-lg px-3 text-xs", period === days && "bg-ink-strong text-white shadow-soft hover:bg-ink-strong hover:text-white")}>{days} days</Button>
        ))}
      </div>
    </div>
  );

  if (statsQuery.isLoading) return <div className="space-y-7"><SEO title="Dashboard" noindex />{header}<DashboardSkeleton /></div>;
  if (statsQuery.isError || !statsQuery.data) {
    return <div className="space-y-7"><SEO title="Dashboard" noindex />{header}<ErrorState title="Couldn't load dashboard stats" message="We couldn't reach the analytics service. Check your connection and try again." onRetry={() => statsQuery.refetch()} /></div>;
  }

  const stats = statsQuery.data;
  const report = reportingQuery.data;
  const sessions = report?.audience.unique_sessions ?? 0;
  const newUsers = Math.min(report?.audience.new_users ?? 0, sessions);
  const returningUsers = Math.max(sessions - newUsers, 0);
  const publishedPosts = stats.published_posts ?? 0;
  const publishedResources = stats.published_resources ?? 0;
  const audienceColors = ["#ff5b45", "#193451"];
  const publishingColors = ["#e59a5f", "#4f88c6"];

  return (
    <div className="space-y-7">
      <SEO title="Dashboard" noindex />
      {header}
      <KpiGrid stats={stats} />

      <section aria-label="Dashboard insights" className="grid items-stretch gap-6 xl:grid-cols-2">
        <ContentPerformance rows={performanceQuery.data ?? []} isLoading={performanceQuery.isLoading} isError={performanceQuery.isError} onRetry={() => performanceQuery.refetch()} />
        <section className="h-full rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-semibold text-ink-strong">At a glance</h2><p className="mt-1 text-xs text-muted-foreground">A cleaner view of audience and publishing</p></div><TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" /></div>
          {reportingQuery.isError ? (
            <div className="mt-5"><ErrorState compact onRetry={() => reportingQuery.refetch()} /></div>
          ) : reportingQuery.isLoading || !report ? (
            <CardSkeleton lines={5} className="mt-5 border-0 p-0 shadow-none" />
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-surface-subtle p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audience mix</p>
                <DonutBreakdown label={`Audience mix: ${newUsers} new and ${returningUsers} returning sessions`} value={sessions} data={[{ name: "New", value: newUsers }, { name: "Returning", value: returningUsers }]} colors={audienceColors} legend={[{ label: "New", value: newUsers, color: audienceColors[0] }, { label: "Returning", value: returningUsers, color: audienceColors[1] }]} />
              </div>
              <div className="rounded-xl bg-surface-subtle p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Publishing mix</p>
                <DonutBreakdown label={`Publishing mix: ${publishedPosts} blog posts and ${publishedResources} resources`} value={publishedPosts + publishedResources} data={[{ name: "Blog posts", value: publishedPosts }, { name: "Resources", value: publishedResources }]} colors={publishingColors} legend={[{ label: "Blog posts", value: publishedPosts, color: publishingColors[0] }, { label: "Resources", value: publishedResources, color: publishingColors[1] }]} />
              </div>
            </div>
          )}
        </section>
      </section>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-semibold text-ink-strong">Growth trend</h2><p className="mt-1 text-xs text-muted-foreground">New users over the last {period} days</p></div><span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#2f68a9]">{fmt(signups.reduce((total, point) => total + point.count, 0))} signups</span></div>
          {signupsQuery.isError ? (
            <div className="mt-5"><ErrorState compact onRetry={() => signupsQuery.refetch()} /></div>
          ) : signupsQuery.isLoading ? (
            <CardSkeleton lines={4} className="mt-5 border-0 p-0 shadow-none" />
          ) : signups.length === 0 || !signups.some((point) => point.count > 0) ? (
            <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No signups in this period.</div>
          ) : (
            <div className="mt-5 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signups} margin={{ top: 8, right: 6, bottom: 0, left: -22 }}>
                  <defs><linearGradient id="dashboardSignupsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff5b45" stopOpacity={0.24} /><stop offset="100%" stopColor="#ff5b45" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 4" />
                  <XAxis dataKey="day" tickFormatter={formatDay} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={38} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(label) => formatDay(String(label))} formatter={(value: number) => [fmt(value), "Signups"]} cursor={{ stroke: "hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="count" stroke="#ff5b45" strokeWidth={2.5} fill="url(#dashboardSignupsFill)" isAnimationActive={!prefersReducedMotion} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="flex flex-col rounded-2xl border border-border bg-[#193451] p-6 text-white shadow-soft">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/55">Revenue</p><h2 className="mt-2 font-display text-xl font-semibold text-white">Payment health</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><BadgeCheck className="h-5 w-5 text-[#ff8a72]" aria-hidden="true" /></span></div>
          {reportingQuery.isLoading || !report ? (
            <div className="mt-6 h-28 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
          ) : Object.entries(report.revenue.byCurrency).length === 0 ? (
            <div className="my-auto py-8"><p className="font-display text-3xl font-bold">No payments</p><p className="mt-2 text-sm text-white/60">There were no successful payments in this period.</p></div>
          ) : (
            <div className="mt-6 space-y-3">{Object.entries(report.revenue.byCurrency).map(([currency, amount]) => <div key={currency} className="rounded-xl border border-white/10 bg-white/[0.07] p-4"><p className="text-xs font-semibold text-white/55">{currency}</p><p className="mt-1 font-display text-2xl font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100)}</p></div>)}</div>
          )}
          {report && <div className="mt-auto flex items-center gap-5 border-t border-white/10 pt-5 text-xs text-white/65"><span><strong className="text-white">{fmt(report.revenue.successfulPayments)}</strong> successful</span><span><strong className="text-white">{fmt(report.revenue.failedPayments)}</strong> unsuccessful</span></div>}
        </section>
      </div>

      {(stats.new_leads > 0 || stats.flagged_profiles > 0) && (
        <section className="flex flex-col gap-4 rounded-2xl border border-[#f1d9ce] bg-[#fff6f1] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><UserPlus className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="font-display text-base font-semibold text-ink-strong">A few things need your attention</h2><p className="mt-0.5 text-xs text-muted-foreground">{fmt(stats.new_leads)} new inquiries · {fmt(stats.flagged_profiles)} flagged profiles</p></div></div>
          <Button asChild size="sm" className="w-full sm:w-auto"><Link to="/admin/leads">Open inbox <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
        </section>
      )}
    </div>
  );
};

export default AdminDashboard;
