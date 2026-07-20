import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/lib/subscription";
import { SEO } from "@/components/common/SEO";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { OpportunityCardSkeletonList } from "@/components/funding/OpportunityCardSkeleton";
import { FundingPaywall } from "@/components/funding/FundingPaywall";
import { FundingWorkspace } from "@/components/funding/FundingWorkspace";
import { ShieldAlert } from "lucide-react";

function FundingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="bg-navy px-6 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <PageHeader
            onDark
            title="Funding for African SMEs"
            subtitle="Every result links to the funder's own site — verify before you apply, and never pay to apply."
          />
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-primary/30 bg-white/5 p-4 text-xs text-white/80">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Reminder: verify each opportunity on the funder's own site before applying, and{" "}
              <strong>never pay a fee</strong> to apply for or receive a grant.
            </span>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-12">{children}</section>
    </main>
  );
}

const Funding = () => {
  const { user, loading: authLoading } = useAuth();
  const { status, refetch } = useSubscription();

  // 1. Auth still resolving.
  if (authLoading) {
    return (
      <FundingShell>
        <OpportunityCardSkeletonList count={3} />
      </FundingShell>
    );
  }

  // 2. Not signed in → send to auth with a return path.
  if (!user) {
    return <Navigate to="/auth?next=/funding" replace />;
  }

  return (
    <>
      <SEO
        title="Funding"
        description="Curated, verifiable funding opportunities for African SMEs — grants, fellowships, accelerators and more. Every result links to the funder's own site."
      />

      {/* 3. Subscription still loading. */}
      {status === "loading" && (
        <FundingShell>
          <OpportunityCardSkeletonList count={3} />
        </FundingShell>
      )}

      {/* 4. TRUST-CRITICAL (IMPROVEMENTS §2.1): a subscription fetch error NEVER
             shows the paywall — a paying member on a flaky connection is not told
             "members only". The paywall is unreachable from this branch. */}
      {status === "error" && (
        <FundingShell>
          <ErrorState
            title="We couldn't confirm your membership"
            message="This is a connection problem on our side or yours — your subscription is unaffected. Please retry."
            onRetry={refetch}
          />
        </FundingShell>
      )}

      {/* 5. Inactive → paywall with example cards. */}
      {status === "inactive" && <FundingPaywall userEmail={user.email ?? undefined} />}

      {/* 6. Active member → feed-first workspace + AI deep search. */}
      {status === "active" && (
        <FundingShell>
          <FundingWorkspace />
        </FundingShell>
      )}
    </>
  );
};

export default Funding;
