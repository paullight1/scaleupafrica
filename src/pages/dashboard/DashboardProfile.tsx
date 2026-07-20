import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { CardSkeleton } from "@/components/common/LoadingState";
import { useMyProfile } from "@/hooks/queries/dashboard";
import { ProfileCompletenessCard } from "@/components/dashboard/ProfileCompletenessCard";
import { ProfilePreviewCard } from "@/components/dashboard/ProfilePreviewCard";
import { ShareLinkCard } from "@/components/dashboard/ShareLinkCard";
import { VisibilityCard } from "@/components/dashboard/VisibilityCard";

export function DashboardProfile() {
  useEffect(() => {
    document.title = "My profile — ScaleUp Africa";
  }, []);

  const [params, setParams] = useSearchParams();
  const justPublished = params.get("published") === "1";

  const { data: profile, isPending, isError, refetch } = useMyProfile();

  // Strip ?published=1 after the first render so the banner only shows once.
  useEffect(() => {
    if (justPublished) {
      const next = new URLSearchParams(params);
      next.delete("published");
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isPending) {
    return (
      <div className="space-y-8">
        <PageHeader title="My profile" subtitle="Your public storefront in the directory." />
        <div className="grid gap-6 lg:grid-cols-2">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="My profile" subtitle="Your public storefront in the directory." />
        <ErrorState title="Couldn't load your profile" onRetry={() => refetch()} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <PageHeader title="My profile" subtitle="Your public storefront in the directory." />
        <EmptyState
          variant="firstRun"
          title="Your storefront isn't live yet"
          description="A complete profile is how partners, customers and funders find you."
          action={{ label: "Create your profile", to: "/directory/create" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="My profile" subtitle="Your public storefront in the directory." />

      {justPublished && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl bg-navy p-5 text-white shadow-medium"
        >
          <PartyPopper className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-display text-lg font-semibold text-white">You're live.</p>
            <p className="mt-1 text-sm text-white/80">
              This is what the world sees. Share your link below to start getting found.
            </p>
          </div>
        </div>
      )}

      {/* When freshly published, lead with preview + share (the payoff). */}
      {justPublished ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfilePreviewCard profile={profile} />
          <ShareLinkCard profile={profile} />
          <ProfileCompletenessCard profile={profile} />
          <VisibilityCard profile={profile} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileCompletenessCard profile={profile} />
          <ProfilePreviewCard profile={profile} />
          <ShareLinkCard profile={profile} />
          <VisibilityCard profile={profile} />
        </div>
      )}
    </div>
  );
}

export default DashboardProfile;
