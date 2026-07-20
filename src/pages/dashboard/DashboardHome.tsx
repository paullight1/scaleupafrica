import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Bookmark, CalendarPlus, CreditCard, Target } from "lucide-react";
import { isSubscriptionActive } from "@/lib/subscription";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { DashboardSkeleton } from "@/components/common/LoadingState";
import {
  useFundingFeed,
  useMyProfile,
  useMySubscription,
  useSavedOpportunities,
} from "@/hooks/queries/dashboard";
import { matchOpportunities } from "@/lib/dashboard/matchOpportunities";
import { countNewThisWeek } from "@/lib/dashboard/feed";
import { computeCompleteness } from "@/lib/dashboard/profileCompleteness";
import { nextBestActions } from "@/lib/dashboard/nextBestAction";
import { MatchedOpportunities } from "@/components/dashboard/MatchedOpportunities";
import { SavedOpportunities } from "@/components/dashboard/SavedOpportunities";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";

const EMDASH = "—";

function greetingName(
  profile: { founder_name: string | null; business_name: string } | null,
  email: string | null | undefined,
): string {
  return (
    profile?.founder_name?.trim() ||
    profile?.business_name?.trim() ||
    email?.split("@")[0] ||
    "there"
  );
}

export function DashboardHome() {
  useEffect(() => {
    document.title = "Funding home — ScaleUp Africa";
  }, []);

  const { user } = useAuth();
  const profileQ = useMyProfile();
  const subQ = useMySubscription();
  const feedQ = useFundingFeed();
  const savedQ = useSavedOpportunities();

  const primaryPending = profileQ.isPending || subQ.isPending || feedQ.isPending;
  if (primaryPending) return <DashboardSkeleton />;

  const profile = profileQ.data ?? null;
  const subscription = subQ.data ?? null;
  const active = isSubscriptionActive(subscription);
  const feed = feedQ.data ?? [];
  const savedCount = savedQ.data?.length ?? 0;

  const feedFailed = feedQ.isError;
  const newThisWeek = feedFailed ? EMDASH : countNewThisWeek(feed);
  const matchedCount = feedFailed || !profile ? EMDASH : matchOpportunities(profile, feed).length;

  const completeness = computeCompleteness(profile);
  const actions = nextBestActions({
    profile,
    completeness,
    subscriptionActive: active,
    savedCount,
    feedNewCount: feedFailed ? 0 : countNewThisWeek(feed),
  });
  const hero = actions[0];

  const membershipValue = active ? "Active" : subscription?.has_access ? "Expired" : "Free";
  const membershipHint = active
    ? subscription?.expires_at
      ? `Renews ${new Date(subscription.expires_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
      : "No expiry set"
    : "Upgrade for the full radar";

  return (
    <div className="space-y-8">
      {/* Greeting + hero action */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-strong md:text-3xl">
          Welcome back, {greetingName(profile, user?.email)}.
        </h1>
        {hero && (
          <div className="mt-4">
            <Button asChild size="lg">
              <Link to={hero.href}>{hero.title}</Link>
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">{hero.why}</p>
          </div>
        )}
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New this week" value={newThisWeek} icon={CalendarPlus} />
        <StatCard label="Matched to you" value={matchedCount} icon={Target} />
        <StatCard label="Saved" value={savedQ.isError ? EMDASH : savedCount} icon={Bookmark} />
        <Link
          to="/dashboard/billing"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <StatCard
            label="Membership"
            value={subQ.isError ? EMDASH : membershipValue}
            hint={subQ.isError ? "Couldn't confirm — open account" : membershipHint}
            icon={CreditCard}
          />
        </Link>
      </div>

      {/* Matched / feed */}
      {feedFailed ? (
        <ErrorState title="Couldn't load opportunities" onRetry={() => feedQ.refetch()} />
      ) : feed.length === 0 ? (
        <EmptyState
          variant="default"
          illustration="empty-funding"
          title="The curated feed is being prepared"
          description="We're lining up fresh funding opportunities — check back soon."
          secondaryAction={{ label: "Browse the directory", to: "/directory" }}
        />
      ) : (
        <>
          <MatchedOpportunities profile={profile} feed={feed} />
          {!savedQ.isError && <SavedOpportunities />}
          {!active && !subQ.isError && <UpgradeBanner />}
        </>
      )}
    </div>
  );
}

export default DashboardHome;
