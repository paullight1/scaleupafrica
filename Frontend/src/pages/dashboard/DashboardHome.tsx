import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { isSubscriptionActive } from "@/lib/subscription";
import { useAuth } from "@shared/hooks/useAuth";
import { Button } from "@shared/components/ui/button";
import { ErrorState } from "@shared/components/common/ErrorState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import {
  useFundingFeed,
  useFundingTeaser,
  useMyProfile,
  useMySubscription,
  useSavedOpportunities,
} from "@/hooks/queries/dashboard";
import { computeCompleteness } from "@/lib/dashboard/profileCompleteness";
import { onboardingState } from "@/lib/dashboard/onboarding";
import { nextBestActions } from "@/lib/dashboard/nextBestAction";
import { OnboardingCard } from "@/components/dashboard/OnboardingCard";
import { ClosingSoonCard } from "@/components/dashboard/ClosingSoonCard";
import { MatchedOpportunities } from "@/components/dashboard/MatchedOpportunities";
import { FundingTeaserPanel } from "@/components/dashboard/FundingTeaserPanel";
import { FundingPaywall } from "@/components/funding/FundingPaywall";
import { DASHBOARD_FUNDING, DASHBOARD_PROFILE } from "@/lib/dashboard/routes";

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

/**
 * Home — "what should I do right now?".
 *
 * Two shapes, one route. While the user still has activation steps left the
 * page is led by the single next step; once those are done it becomes a digest —
 * deadlines, matches, and a quiet line of numbers at the bottom.
 *
 * Two structural changes from the previous version worth knowing about:
 *
 * 1. NO PAGE-WIDE PENDING GATE. The old code blocked the whole page on
 *    `profile || subscription || feed`, so the greeting and the checklist — both
 *    of which need only the fast profile read — waited on the slowest call on
 *    the page. Each block now resolves independently.
 *
 * 2. The four-card stat row is gone from the top. Counts nobody acts on had the
 *    most valuable space on the page; they survive as one summary line.
 */
export function DashboardHome() {
  useEffect(() => {
    document.title = "Home — Cresciva";
  }, []);

  const { user } = useAuth();
  const profileQ = useMyProfile();
  const subQ = useMySubscription();
  const savedQ = useSavedOpportunities();
  const feedQ = useFundingFeed();

  const profile = profileQ.data ?? null;
  const subscription = subQ.data ?? null;
  const active = isSubscriptionActive(subscription);

  // TRUST-1: a failed subscription read is "unknown", never "inactive". A paying
  // member on a flaky connection must never be pushed at the upgrade path.
  const membership: "loading" | "error" | "active" | "inactive" = subQ.isPending
    ? "loading"
    : subQ.isError
      ? "error"
      : active
        ? "active"
        : "inactive";

  const teaserQ = useFundingTeaser(membership === "inactive");

  const feed = feedQ.data ?? [];
  const savedCount = savedQ.data?.length ?? 0;
  const onboarding = onboardingState(profile);
  const completeness = computeCompleteness(profile);

  const actions = nextBestActions({
    profile,
    completeness,
    subscriptionActive: membership === "error" ? "unknown" : active,
    savedCount,
    feedNewCount: 0,
  });
  // While onboarding owns the top of the page a second competing "do this next"
  // is just noise — the hero action belongs to the digest shape only.
  const hero = onboarding.complete ? actions[0] : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-strong md:text-3xl">
          {onboarding.complete ? "Welcome back" : "Welcome"}, {greetingName(profile, user?.email)}.
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

      {/* Activation — shown only until genuinely finished, then gone for good. */}
      {profileQ.isPending ? (
        <CardSkeleton lines={4} />
      ) : (
        !onboarding.complete && <OnboardingCard state={onboarding} />
      )}

      {/* Funding. Resolves independently of everything above. */}
      {membership === "loading" ? (
        <CardSkeleton lines={4} />
      ) : membership === "error" ? (
        <ErrorState
          title="We couldn't confirm your membership"
          message="This is a connection problem — your subscription is unaffected. Please retry."
          onRetry={() => subQ.refetch()}
        />
      ) : membership === "inactive" ? (
        teaserQ.isPending ? (
          <CardSkeleton lines={4} />
        ) : teaserQ.isError || !teaserQ.data ? (
          <FundingPaywall userEmail={user?.email ?? undefined} />
        ) : (
          <FundingTeaserPanel teaser={teaserQ.data} />
        )
      ) : feedQ.isPending ? (
        <CardSkeleton lines={4} />
      ) : feedQ.isError ? (
        <ErrorState title="Couldn't load opportunities" onRetry={() => feedQ.refetch()} />
      ) : (
        <>
          <ClosingSoonCard feed={feed} />
          <MatchedOpportunities profile={profile} feed={feed} />
        </>
      )}

      {/* The numbers, demoted to one quiet line. Each links to the page where it
          can actually be acted on. */}
      {!profileQ.isPending && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link to={DASHBOARD_PROFILE} className="font-medium text-foreground hover:underline">
            {profile?.view_count ?? 0} profile {profile?.view_count === 1 ? "view" : "views"}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to={DASHBOARD_FUNDING} className="font-medium text-foreground hover:underline">
            {savedQ.isError ? "—" : savedCount} saved
          </Link>
          <span aria-hidden="true">·</span>
          <Link to={DASHBOARD_PROFILE} className="font-medium text-foreground hover:underline">
            {completeness.percent}% complete
          </Link>
          {onboarding.complete && (
            <Link
              to={DASHBOARD_FUNDING}
              className="ml-auto inline-flex items-center gap-1 font-semibold text-navy hover:text-navy-light dark:text-primary"
            >
              Funding radar
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </p>
      )}
    </div>
  );
}

export default DashboardHome;
