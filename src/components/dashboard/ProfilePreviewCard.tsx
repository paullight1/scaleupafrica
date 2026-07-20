import { Link } from "react-router-dom";
import { ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicProfilePath } from "@/lib/dashboard/profileUrl";
import type { Profile } from "@/lib/dashboard/types";

/**
 * Renders the founder's own directory card roughly as the public sees it, plus
 * edit / view-public actions. NOTE: plan 03 asked for a shared
 * `src/components/directory/ProfileCard.tsx` extracted from Directory.tsx — that
 * extraction touches Directory.tsx (plan 04's file), so this widget renders a
 * self-contained preview instead. Plan 04 can later swap in the shared card.
 */
export function ProfilePreviewCard({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-lg font-semibold text-ink-strong">Your public card</h2>
      <p className="mt-1 text-sm text-muted-foreground">This is what the directory shows.</p>

      <div className="mt-4 rounded-xl border border-border bg-surface-subtle p-5">
        <div className="flex items-start gap-4">
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt={`${profile.business_name} logo`}
              className="h-14 w-14 rounded-xl object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 font-display text-xl font-semibold text-primary">
              {profile.business_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-ink-strong">
              {profile.business_name}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {[profile.sector, profile.country].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        {profile.short_description && (
          <p className="mt-3 line-clamp-3 text-sm text-foreground">{profile.short_description}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/directory/create">
            <Pencil className="h-4 w-4" /> Edit profile
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={publicProfilePath(profile)}>
            <ExternalLink className="h-4 w-4" /> View public page
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default ProfilePreviewCard;
