import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  BadgeCheck,
  Building2,
  BookOpen,
  Newspaper,
  Mail,
  UserPlus,
  Search,
  Inbox,
  Flag,
  FilePen,
  Landmark,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { StatCard } from "@shared/components/common/StatCard";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { CardSkeleton, DashboardSkeleton } from "@shared/components/common/LoadingState";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import {
  useAdminStats,
  useAdminTimeseries,
  useProfilesBySector,
  useAdminReportingSummary,
  useAdminContentPerformance,
  type AdminStats,
  type TimeseriesPoint,
} from "@/hooks/queries/adminDashboard";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const numberFmt = new Intl.NumberFormat("en-US");
const fmt = (n: number | undefined) => numberFmt.format(n ?? 0);

/** "2026-07-01" -> "Jul 1". Defensive against full timestamps. */
function formatDay(day: string): string {
  const d = new Date(day.length <= 10 ? `${day}T00:00:00` : day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Respect prefers-reduced-motion — disable chart entry animations. */
const prefersReducedMotion =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const chartAnimation = !prefersReducedMotion;

// ---------------------------------------------------------------------------
// Shared chart chrome
// ---------------------------------------------------------------------------
const AXIS_TICK = { fontSize: 12, fill: "hsl(var(--muted-foreground))" } as const;
const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: "0.75rem",
  color: "hsl(var(--ink-strong))",
  boxShadow: "var(--shadow-soft, 0 1px 3px rgb(0 0 0 / 0.1))",
} as const;

interface PanelProps {
  title: string;
  description?: string;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  emptyLabel?: string;
  children: React.ReactNode;
  className?: string;
}

/** Card wrapper that owns a chart's loading / error / empty / content states. */
function ChartPanel({
  title,
  description,
  isLoading,
  isError,
  isEmpty,
  onRetry,
  emptyLabel = "No data yet.",
  children,
  className,
}: PanelProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-soft",
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-ink-strong">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {isLoading ? (
        <CardSkeleton lines={4} className="border-0 p-0 shadow-none" />
      ) : isError ? (
        <ErrorState compact onRetry={onRetry} />
      ) : isEmpty ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Quick links / attention row
// ---------------------------------------------------------------------------
interface QuickLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  emphasize?: boolean;
}

function QuickLink({ to, icon: Icon, label, value, hint, emphasize }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-soft transition-colors",
        "hover:border-primary/50 hover:bg-surface-subtle",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        emphasize ? "border-primary/40" : "border-border",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
          emphasize
            ? "bg-primary/10 text-primary-dark"
            : "bg-surface-muted text-navy dark:text-white",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold text-ink-strong">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// KPI grid
// ---------------------------------------------------------------------------
function KpiGrid({ s }: { s: AdminStats }) {
  const draftResources = Math.max((s.total_resources ?? 0) - (s.published_resources ?? 0), 0);
  const draftPosts = Math.max((s.total_posts ?? 0) - (s.published_posts ?? 0), 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Users"
        value={fmt(s.total_users)}
        icon={Users}
        delta={
          s.new_users_7d > 0
            ? { value: `+${fmt(s.new_users_7d)}`, direction: "up" }
            : undefined
        }
        hint="new this week"
      />
      <StatCard
        label="Active Subscriptions"
        value={fmt(s.active_subscriptions)}
        icon={BadgeCheck}
        hint={`${fmt(s.total_users)} total users`}
      />
      <StatCard
        label="Directory Profiles"
        value={fmt(s.total_profiles)}
        icon={Building2}
        delta={
          s.new_profiles_7d > 0
            ? { value: `+${fmt(s.new_profiles_7d)}`, direction: "up" }
            : undefined
        }
        hint="new this week"
      />
      <StatCard
        label="Published Resources"
        value={fmt(s.published_resources)}
        icon={BookOpen}
        hint={draftResources > 0 ? `${fmt(draftResources)} drafts` : `${fmt(s.total_resources)} total`}
      />
      <StatCard
        label="Published Blog Posts"
        value={fmt(s.published_posts)}
        icon={Newspaper}
        hint={draftPosts > 0 ? `${fmt(draftPosts)} drafts` : `${fmt(s.total_posts)} total`}
      />
      <StatCard
        label="Newsletter Subscribers"
        value={fmt(s.newsletter_subs)}
        icon={Mail}
      />
      <StatCard
        label="New Inquiries"
        value={fmt(s.new_leads)}
        icon={UserPlus}
        hint={`${fmt(s.total_leads)} total inquiries`}
      />
      <StatCard
        label="Funding Searches (30d)"
        value={fmt(s.funding_searches_30d)}
        icon={Search}
        hint={`${fmt(s.page_views_30d)} page views (30d)`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const AdminDashboard = () => {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const statsQuery = useAdminStats();
  const reportingQuery = useAdminReportingSummary(period);
  const performanceQuery = useAdminContentPerformance(period, 10);
  const signupsQuery = useAdminTimeseries("signups", period);
  const searchesQuery = useAdminTimeseries("funding_search", period);
  const sectorsQuery = useProfilesBySector(6);

  const signups = useMemo<TimeseriesPoint[]>(
    () => signupsQuery.data ?? [],
    [signupsQuery.data],
  );
  const searches = useMemo<TimeseriesPoint[]>(
    () => searchesQuery.data ?? [],
    [searchesQuery.data],
  );
  const sectors = sectorsQuery.data ?? [];

  const signupsHasData = signups.some((p) => p.count > 0);
  const searchesHasData = searches.some((p) => p.count > 0);

  const header = (
    <PageHeader
      title="Dashboard"
      subtitle="Audience, content, revenue and operational health."
      actions={
        <div className="flex rounded-lg border border-border bg-card p-1" aria-label="Reporting period">
          {([7, 30, 90] as const).map((days) => (
            <Button key={days} size="sm" variant={period === days ? "default" : "ghost"} onClick={() => setPeriod(days)}>
              {days} days
            </Button>
          ))}
        </div>
      }
    />
  );

  // Stats drive the whole page — block on them, retry on failure.
  if (statsQuery.isLoading) {
    return (
      <div className="space-y-8">
        <SEO title="Dashboard" noindex />
        {header}
        <DashboardSkeleton />
      </div>
    );
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <div className="space-y-8">
        <SEO title="Dashboard" noindex />
        {header}
        <ErrorState
          title="Couldn't load dashboard stats"
          message="We couldn't reach the analytics service. Check your connection and try again."
          onRetry={() => statsQuery.refetch()}
        />
      </div>
    );
  }

  const s = statsQuery.data;

  return (
    <div className="space-y-8">
      <SEO title="Dashboard" noindex />
      {header}

      {/* KPI grid */}
      <KpiGrid s={s} />

      {reportingQuery.isError ? (
        <ErrorState title="Couldn't load reporting" onRetry={() => reportingQuery.refetch()} />
      ) : reportingQuery.isLoading || !reportingQuery.data ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink-strong">Audience</h2>
            <p className="mt-1 text-sm text-muted-foreground">Last {period} days</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-muted-foreground">Page views</dt><dd className="text-2xl font-bold">{fmt(reportingQuery.data.audience.page_views)}</dd></div>
              <div><dt className="text-sm text-muted-foreground">Unique sessions</dt><dd className="text-2xl font-bold">{fmt(reportingQuery.data.audience.unique_sessions)}</dd></div>
              <div><dt className="text-sm text-muted-foreground">New users</dt><dd className="text-2xl font-bold">{fmt(reportingQuery.data.audience.new_users)}</dd></div>
              <div><dt className="text-sm text-muted-foreground">Funding searches</dt><dd className="text-2xl font-bold">{fmt(reportingQuery.data.audience.funding_searches)}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink-strong">Revenue</h2>
            <p className="mt-1 text-sm text-muted-foreground">Verified successful payments, kept separate by currency.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(reportingQuery.data.revenue.byCurrency).length === 0 ? (
                <p className="text-sm text-muted-foreground">No successful payments in this period.</p>
              ) : Object.entries(reportingQuery.data.revenue.byCurrency).map(([currency, amount]) => (
                <div key={currency} className="rounded-lg bg-surface-muted p-4">
                  <p className="text-sm text-muted-foreground">{currency}</p>
                  <p className="text-2xl font-bold text-ink-strong">{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100)}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{fmt(reportingQuery.data.revenue.successfulPayments)} successful · {fmt(reportingQuery.data.revenue.failedPayments)} failed or abandoned</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-soft xl:col-span-2">
            <h2 className="font-display text-lg font-semibold text-ink-strong">Content performance</h2>
            {performanceQuery.isError ? <ErrorState compact onRetry={() => performanceQuery.refetch()} /> : performanceQuery.isLoading ? <CardSkeleton lines={4} /> : (performanceQuery.data ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No content performance data yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="text-muted-foreground"><tr><th className="pb-3">Content</th><th className="pb-3">Type</th><th className="pb-3 text-right">Views</th><th className="pb-3 text-right">Downloads</th></tr></thead>
                  <tbody>{performanceQuery.data?.map((row) => <tr key={`${row.contentType}-${row.contentId}`} className="border-t border-border"><td className="py-3 font-medium">{row.title}</td><td className="py-3 capitalize text-muted-foreground">{row.contentType}</td><td className="py-3 text-right">{fmt(row.views)}</td><td className="py-3 text-right">{fmt(row.downloads)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-soft xl:col-span-2">
            <h2 className="font-display text-lg font-semibold text-ink-strong">Operations</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(reportingQuery.data.operations).map(([key, value]) => <div key={key} className="rounded-lg bg-surface-muted p-4"><p className="text-sm capitalize text-muted-foreground">{key.replace(/_/g, " ")}</p><p className="text-2xl font-bold">{fmt(value)}</p></div>)}
            </div>
          </section>
        </div>
      )}

      {/* Time-series charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="New signups"
          description="New users per day over the last 30 days."
          isLoading={signupsQuery.isLoading}
          isError={signupsQuery.isError}
          isEmpty={!signupsHasData}
          onRetry={() => signupsQuery.refetch()}
          emptyLabel="No signups in the last 30 days."
        >
          <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={signups} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickFormatter={formatDay}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(label) => formatDay(String(label))}
                formatter={(value: number) => [fmt(value), "Signups"]}
                cursor={{ stroke: "hsl(var(--border))" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Signups"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#signupsFill)"
                isAnimationActive={chartAnimation}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="Funding searches"
          description="Member funding searches per day over the last 30 days."
          isLoading={searchesQuery.isLoading}
          isError={searchesQuery.isError}
          isEmpty={!searchesHasData}
          onRetry={() => searchesQuery.refetch()}
          emptyLabel="No funding searches in the last 30 days."
        >
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={searches} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickFormatter={formatDay}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(label) => formatDay(String(label))}
                formatter={(value: number) => [fmt(value), "Searches"]}
                cursor={{ fill: "hsl(var(--surface-muted))" }}
              />
              <Bar
                dataKey="count"
                name="Searches"
                fill="hsl(var(--data-teal))"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={chartAnimation}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {/* Sector breakdown + attention row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="Profiles by sector"
          description="Top sectors across the directory."
          isLoading={sectorsQuery.isLoading}
          isError={sectorsQuery.isError}
          isEmpty={sectors.length === 0}
          onRetry={() => sectorsQuery.refetch()}
          emptyLabel="No directory profiles yet."
        >
          <ResponsiveContainer width="100%" height={256}>
            <BarChart
              data={sectors}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="sector"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number) => [fmt(value), "Profiles"]}
                cursor={{ fill: "hsl(var(--surface-muted))" }}
              />
              <Bar dataKey="count" name="Profiles" radius={[0, 4, 4, 0]} isAnimationActive={chartAnimation}>
                {sectors.map((entry) => (
                  <Cell key={entry.sector} fill="hsl(var(--data-teal))" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <section aria-labelledby="attention-heading" className="space-y-4">
          <div>
            <h2 id="attention-heading" className="font-display text-lg font-semibold text-ink-strong">
              Needs attention
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Jump straight to what's waiting.</p>
          </div>

          {s.total_leads === 0 &&
          s.flagged_profiles === 0 &&
          (s.total_resources ?? 0) - (s.published_resources ?? 0) === 0 ? (
            <EmptyState
              variant="firstRun"
              title="All clear"
              description="No new inquiries, flagged profiles, or pending drafts right now."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <QuickLink
                to="/admin/leads"
                icon={Inbox}
                label="New inquiries"
                value={fmt(s.new_leads)}
                hint={`${fmt(s.total_leads)} total`}
                emphasize={s.new_leads > 0}
              />
              <QuickLink
                to="/admin/profiles?status=flagged"
                icon={Flag}
                label="Flagged profiles"
                value={fmt(s.flagged_profiles)}
                hint="review moderation queue"
                emphasize={s.flagged_profiles > 0}
              />
              <QuickLink
                to="/admin/resources"
                icon={FilePen}
                label="Resource drafts"
                value={fmt(Math.max((s.total_resources ?? 0) - (s.published_resources ?? 0), 0))}
                hint={`${fmt(s.published_resources)} published`}
              />
              <QuickLink
                to="/admin/funding"
                icon={Landmark}
                label="Funding searches (30d)"
                value={fmt(s.funding_searches_30d)}
                hint="manage funding feed"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
