import { Link } from "react-router-dom";
import { MapPin, Briefcase, ArrowRight, Star } from "lucide-react";
import type { DirectoryCardRow } from "@/hooks/queries/directory";

/** A directory result. The whole card is a link to the public profile — no inner controls. */
export function DirectoryCard({ profile }: { profile: DirectoryCardRow }) {
  return (
    <Link
      to={`/directory/${profile.slug}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-soft transition-all hover:border-primary/40 hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="mb-4 flex items-start gap-4">
        {profile.logo_url ? (
          <img
            src={profile.logo_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-navy font-display text-xl font-bold text-primary-foreground">
            {profile.business_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-bold text-ink-strong">
            {profile.business_name}
          </h3>
          {profile.founder_name && (
            <p className="truncate text-xs text-muted-foreground">by {profile.founder_name}</p>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {profile.country}
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5" /> {profile.sector}
        </span>
        {profile.featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary-dark">
            <Star className="h-3 w-3" /> Featured
          </span>
        )}
      </div>

      {profile.short_description && (
        <p className="mb-4 line-clamp-3 text-sm text-foreground/80">{profile.short_description}</p>
      )}

      <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-navy transition-colors group-hover:text-primary-dark dark:text-primary">
        View profile
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default DirectoryCard;
