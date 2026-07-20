import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Eye, Bookmark, Gauge } from "lucide-react";
import { isSubscriptionActive } from "@/lib/subscription";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ErrorState } from "@/components/common/ErrorState";
import { CardSkeleton } from "@/components/common/LoadingState";
import {
  useFundingFeed,
  useMyProfile,
  useMySubscription,
  useSavedOpportunities,
} from "@/hooks/queries/dashboard";
import { computeCompleteness } from "@/lib/dashboard/profileCompleteness";
import { countNewThisWeek } from "@/lib/dashboard/feed";
import { nextBestActions } from "@/lib/dashboard/nextBestAction";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { NextBestActions } from "@/components/dashboard/NextBestActions";

const EMDASH = "—";

export function DashboardActivity() {
  useEffect(() => {
    document.title = "Activity — ScaleUp Africa";
  }, []);

  const profileQ = useMyProfile();
  const subQ = useMySubscription();
  const savedQ = useSavedOpportunities();
  const feedQ = useFundingFeed();

  if (profileQ.isPending || subQ.isPending) {
    return (
      <div className="space-y-8">
        <PageHeader title="Activity" subtitle="Your progress, reach and what to do next." />
        <CardSkeleton lines={6} />
        <div className="grid gap-4 sm:grid-cols-3">
          <CardSkeleton lines={1} />
          <CardSkeleton lines={1} />
          <CardSkeleton lines={1} />
        </div>
      </div>
    );
  }

  if (profileQ.isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Activity" subtitle="Your progress, reach and what to do next." />
        <ErrorState title="Couldn't load your activity" onRetry={() => profileQ.refetch()} />
      </div>
    );
  }

  const profile = profileQ.data ?? null;
  const subscription = subQ.data ?? null;
  const active = isSubscriptionActive(subscription);
  const savedCount = savedQ.data?.length ?? 0;
  const completeness = computeCompleteness(profile);
  const feed = feedQ.data ?? [];

  const actions = nextBestActions({
    profile,
    completeness,
    subscriptionActive: active,
    savedCount,
    feedNewCount: feedQ.isError ? 0 : countNewThisWeek(feed),
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Activity" subtitle="Your progress, reach and what to do next." />

      <OnboardingChecklist profile={profile} subscriptionActive={active} savedCount={savedCount} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Profile views"
          value={profile ? profile.view_count : EMDASH}
          icon={Eye}
          hint="Since you published"
        />
        <StatCard
          label="Saved opportunities"
          value={savedQ.isError ? EMDASH : savedCount}
          icon={Bookmark}
        />
        <Link
          to="/dashboard/profile"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <StatCard label="Profile completeness" value={`${completeness.percent}%`} icon={Gauge} />
        </Link>
      </div>

      <NextBestActions actions={actions} />
    </div>
  );
}

export default DashboardActivity;
