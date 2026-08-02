import { useEffect, useRef } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";
import {
  useProfileBySlug,
  useProfileContact,
  useOwnProfile,
} from "@/hooks/queries/directory";
import { SEO } from "@shared/components/common/SEO";
import { ErrorState } from "@shared/components/common/ErrorState";
import { EmptyState } from "@shared/components/common/EmptyState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { ShareBlock } from "@/components/directory/ShareBlock";
import { ContactReveal } from "@/components/directory/ContactReveal";
import { Button } from "@shared/components/ui/button";
import { sanitizeUrl, socialUrl } from "@/lib/url";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Globe,
  Instagram,
  Linkedin,
  ExternalLink,
  PartyPopper,
  Pencil,
  EyeOff,
} from "lucide-react";

function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const ProfileDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const justPublished = (location.state as { justPublished?: boolean } | null)?.justPublished ?? false;

  const { data: profile, isLoading, isError, refetch } = useProfileBySlug(slug);
  const { data: own } = useOwnProfile(user?.id);
  const isOwner = !!profile && !!own && own.id === profile.id;

  const contactQuery = useProfileContact(profile?.id, { enabled: false });

  // Fire-and-forget view counter once per successful mount (active profiles only).
  const countedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || profile.status !== "active") return;
    if (countedRef.current === profile.id) return;
    countedRef.current = profile.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc("increment_profile_views", { _id: profile.id }).then(
      () => {},
      () => {},
    );
  }, [profile]);

  const canonicalUrl =
    typeof window !== "undefined" ? `${window.location.origin}/directory/${slug}` : "";

  // ---- States: never NotFound-on-error ----
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <CardSkeleton media lines={2} className="mb-6" />
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <CardSkeleton lines={5} />
            </div>
            <CardSkeleton lines={3} />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <ErrorState
            title="Couldn't load this profile"
            message="Something went wrong reaching the directory. Try again."
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  // Genuine miss, or hidden/flagged and the viewer isn't the owner → branded NotFound.
  const hiddenToViewer = !!profile && profile.status !== "active" && !isOwner;
  if (!profile || hiddenToViewer) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title="Profile not found" noindex />
        <div className="mx-auto max-w-4xl px-6 py-16">
          <EmptyState
            variant="default"
            title="This profile doesn't exist or was removed"
            description="The business you're looking for isn't in the directory."
            action={{ label: "Back to the directory", to: "/directory" }}
          />
        </div>
      </div>
    );
  }

  const seoDescription =
    profile.short_description ||
    (profile.long_description ? profile.long_description.slice(0, 160) : undefined);
  const seoImage = profile.logo_url || profile.founder_photo_url || undefined;

  const about = profile.long_description || profile.short_description || "";
  const paragraphs = about ? toParagraphs(about) : [];

  const website = sanitizeUrl(profile.website);
  const linkedin = sanitizeUrl(profile.linkedin);
  const instagram = socialUrl("instagram", profile.instagram);
  const twitter = socialUrl("twitter", profile.twitter);
  const hasLinks = !!(website || instagram || linkedin || twitter);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${profile.business_name} — ${profile.sector} in ${profile.country}`}
        description={seoDescription}
        ogImage={seoImage}
      />

      {/* Header band — navy panel */}
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            to="/directory"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Directory
          </Link>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                alt=""
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-navy-light font-display text-3xl font-bold text-white">
                {profile.business_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold text-white md:text-4xl">
                {profile.business_name}
              </h1>
              {profile.founder_name && (
                <p className="mt-1 flex items-center gap-2 text-white/80">
                  {profile.founder_photo_url && (
                    <img
                      src={profile.founder_photo_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  )}
                  Founded by {profile.founder_name}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to={`/directory?country=${encodeURIComponent(profile.country)}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm text-white transition-colors hover:bg-white/20"
            >
              <MapPin className="h-3.5 w-3.5" /> {profile.country}
            </Link>
            <Link
              to={`/directory?sector=${encodeURIComponent(profile.sector)}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm text-white transition-colors hover:bg-white/20"
            >
              <Briefcase className="h-3.5 w-3.5" /> {profile.sector}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Owner strip */}
        {isOwner && (
          <div className="mb-6 space-y-3">
            {justPublished && (
              <div className="flex flex-col gap-1 rounded-xl border border-primary/30 bg-primary/10 p-4">
                <p className="flex items-center gap-2 font-display font-semibold text-ink-strong">
                  <PartyPopper className="h-5 w-5 text-primary-dark" /> You're live. Share your page:
                </p>
                <p className="text-sm text-muted-foreground">
                  This is exactly what the world sees. Send it to a buyer or partner.
                </p>
              </div>
            )}
            <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">This is your public page.</p>
              <Button asChild variant="outline" className="min-h-[44px]">
                <Link to="/directory/create">
                  <Pencil className="h-4 w-4" /> Edit profile
                </Link>
              </Button>
            </div>
            {profile.status !== "active" && (
              <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/15 p-4 text-sm text-ink-strong">
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
                Only you can see this page right now — it's currently {profile.status}. Visitors get
                a "not found" page until an admin restores it.
              </div>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            {paragraphs.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
                <h2 className="mb-3 font-display text-lg font-semibold text-ink-strong">About</h2>
                <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
                  {paragraphs.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {hasLinks && (
              <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
                <h2 className="mb-3 font-display text-lg font-semibold text-ink-strong">Links</h2>
                <div className="flex flex-wrap gap-2">
                  {website && (
                    <LinkChip href={website} icon={Globe} label="Website" />
                  )}
                  {instagram && <LinkChip href={instagram} icon={Instagram} label="Instagram" />}
                  {linkedin && <LinkChip href={linkedin} icon={Linkedin} label="LinkedIn" />}
                  {twitter && <LinkChip href={twitter} icon={ExternalLink} label="X" />}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <ContactReveal
              revealed={contactQuery.isFetched && !contactQuery.isFetching}
              loading={contactQuery.isFetching}
              contact={contactQuery.data}
              onReveal={() => contactQuery.refetch()}
            />
            <ShareBlock
              url={canonicalUrl}
              title={profile.business_name}
              summary={profile.short_description}
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

function LinkChip({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Globe;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary-dark"
    >
      <Icon className="h-4 w-4" /> {label}
    </a>
  );
}

export default ProfileDetail;
