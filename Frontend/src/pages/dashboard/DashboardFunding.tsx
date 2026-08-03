import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { useSubscription } from "@/lib/subscription";
import { PageHeader } from "@shared/components/common/PageHeader";
import { ErrorState } from "@shared/components/common/ErrorState";
import { OpportunityCardSkeletonList } from "@/components/funding/OpportunityCardSkeleton";
import { FundingPaywall } from "@/components/funding/FundingPaywall";
import { FundingWorkspace } from "@/components/funding/FundingWorkspace";
import { SavedOpportunities } from "@/components/dashboard/SavedOpportunities";
import { FundingTeaserPanel } from "@/components/dashboard/FundingTeaserPanel";
import { useFundingTeaser } from "@/hooks/queries/dashboard";

/**
 * The one funding surface. Previously this lived at `/funding` as a separate
 * page with its own navy hero, while the dashboard home ALSO listed matched and
 * saved opportunities — two places to learn, with contradictory gating between
 * them. Everything funding now happens here.
 *
 * `useSubscription` is the single client-side home of the access rule
 * (`Frontend/src/lib/subscription.ts`); this page never re-derives it. Its
 * "error" state is load-bearing: a subscription read that FAILS must render an
 * error, never the paywall, so a paying member on a bad connection is never told
 * "members only".
 */
export function DashboardFunding() {
  useEffect(() => {
    document.title = "Funding — Cresciva";
  }, []);

  const { user } = useAuth();
  const { status, refetch } = useSubscription();
  const teaserQ = useFundingTeaser(status === "inactive");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Funding radar"
        subtitle="Curated opportunities for African SMEs, refreshed weekly."
      />

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs text-foreground/80">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" aria-hidden="true" />
        <span>
          Verify each opportunity on the funder's own site before applying, and{" "}
          <strong>never pay a fee</strong> to apply for or receive a grant.
        </span>
      </div>

      {status === "loading" && <OpportunityCardSkeletonList count={3} />}

      {status === "error" && (
        <ErrorState
          title="We couldn't confirm your membership"
          message="This is a connection problem on our side or yours — your subscription is unaffected. Please retry."
          onRetry={refetch}
        />
      )}

      {status === "inactive" && (
        <>
          {/* Real opportunities first, argument second. A prospect who can see
              three genuine, currently-open titles has evidence; a prospect shown
              only a value proposition has a claim. */}
          {teaserQ.isPending ? (
            <OpportunityCardSkeletonList count={3} />
          ) : teaserQ.isError || !teaserQ.data ? (
            <ErrorState
              title="Couldn't load this week's funding"
              onRetry={() => teaserQ.refetch()}
            />
          ) : (
            <FundingTeaserPanel teaser={teaserQ.data} heading="Open right now" />
          )}
          <FundingPaywall userEmail={user?.email ?? undefined} />
        </>
      )}

      {status === "active" && (
        <>
          <FundingWorkspace />
          <SavedOpportunities />
        </>
      )}
    </div>
  );
}

export default DashboardFunding;
