import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PartyPopper, Eye, ExternalLink } from "lucide-react";
import { PageHeader } from "@shared/components/common/PageHeader";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { Button } from "@shared/components/ui/button";
import { useMyProfile } from "@/hooks/queries/dashboard";
import { computeCompleteness } from "@/lib/dashboard/profileCompleteness";
import { publicProfilePath } from "@/lib/dashboard/profileUrl";
import { PROFILE_SECTIONS, DASHBOARD_PROFILE_EDIT } from "@/lib/dashboard/routes";
import { ProfileSectionRow } from "@/components/dashboard/ProfileSectionRow";
import { ShareLinkCard } from "@/components/dashboard/ShareLinkCard";
import { VisibilityCard } from "@/components/dashboard/VisibilityCard";

/**
 * Profile — "am I findable?".
 *
 * The four disconnected cards this replaces (completeness / preview / share /
 * visibility) each described the profile from a different angle, and none of
 * them let you change it: every fix bounced out to /directory/create with a
 * fragile #anchor. Now the page is the profile's structure — one row per
 * editable section, each showing its own gaps and linking into exactly that
 * part of the form.
 */
export function DashboardProfile() {
  useEffect(() => {
    document.title = "My profile — Cresciva";
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

  const header = (
    <PageHeader title="My profile" subtitle="Your public storefront in the directory." />
  );

  if (isPending) {
    return (
      <div className="space-y-8">
        {header}
        <div className="space-y-3">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        {header}
        <ErrorState title="Couldn't load your profile" onRetry={() => refetch()} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          variant="firstRun"
          title="Your storefront isn't live yet"
          description="A complete profile is how partners, customers and funders find you. It takes about three minutes."
          action={{ label: "Create your profile", to: DASHBOARD_PROFILE_EDIT }}
        />
      </div>
    );
  }

  const completeness = computeCompleteness(profile);
  const gapsBySection = (section: (typeof PROFILE_SECTIONS)[number]) =>
    completeness.missing.filter((m) => m.section === section);

  return (
    <div className="space-y-8">
      {header}

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

      {/* Status strip: the two facts that answer "is this working?" */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-subtle p-5">
        <div>
          <p className="font-display text-2xl font-semibold text-ink-strong tabular-nums">
            {completeness.percent}%
            <span className="ml-2 text-sm font-normal text-muted-foreground">complete</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" aria-hidden="true" />
            {profile.view_count} {profile.view_count === 1 ? "view" : "views"} since you published
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={publicProfilePath(profile)}>
            View public page
            <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <section aria-labelledby="sections-heading">
        <h2 id="sections-heading" className="sr-only">
          Profile sections
        </h2>
        <ul className="space-y-3">
          {PROFILE_SECTIONS.map((section) => (
            <ProfileSectionRow key={section} section={section} gaps={gapsBySection(section)} />
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ShareLinkCard profile={profile} />
        <VisibilityCard profile={profile} />
      </div>
    </div>
  );
}

export default DashboardProfile;
