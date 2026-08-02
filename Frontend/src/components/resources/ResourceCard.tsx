import { Link } from "react-router-dom";
import { ArrowRight, Clock, Download, FileText, Lock } from "lucide-react";
import { Badge } from "@shared/components/ui/badge";
import {
  resourceTypeLabel,
  type ResourceCardRow,
} from "@/hooks/queries/resources";

/** Human file-size label from kilobytes. */
function formatFileSize(kb: number | null): string | null {
  if (!kb || kb <= 0) return null;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** File extension hint (e.g. "PDF") from a file name. */
function fileExt(name: string | null): string | null {
  if (!name) return null;
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * A single resource result. The whole card links to the public detail page.
 * `featured` renders a wider media-forward variant for the top strip.
 */
export function ResourceCard({
  resource,
  featured = false,
}: {
  resource: ResourceCardRow;
  featured?: boolean;
}) {
  const typeLabel = resourceTypeLabel(resource.type);
  const size = formatFileSize(resource.file_size_kb);
  const ext = fileExt(resource.file_name);
  const isDownload = !!resource.file_url;
  const topics = resource.topics?.slice(0, 3) ?? [];

  return (
    <Link
      to={`/resources/${resource.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all hover:border-primary/40 hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Cover / typed placeholder */}
      <div
        className={
          featured
            ? "relative aspect-[16/9] w-full overflow-hidden bg-surface-muted sm:aspect-[2/1]"
            : "relative aspect-[16/9] w-full overflow-hidden bg-surface-muted"
        }
      >
        {resource.cover_image_url ? (
          <img
            src={resource.cover_image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-navy text-white">
            <FileText className="h-8 w-8 text-white/70" aria-hidden />
            <span className="font-display text-sm font-semibold uppercase tracking-wide text-white/90">
              {typeLabel}
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge variant="navy">{typeLabel}</Badge>
          {resource.gated && (
            <Badge variant="accent" className="gap-1">
              <Lock className="h-3 w-3" aria-hidden /> Gated
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {resource.category && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary-dark">
            {resource.category}
          </p>
        )}
        <h3
          className={
            featured
              ? "line-clamp-2 font-display text-xl font-bold text-ink-strong"
              : "line-clamp-2 font-display text-lg font-bold text-ink-strong"
          }
        >
          {resource.title}
        </h3>

        {resource.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm text-foreground/80">
            {resource.excerpt}
          </p>
        )}

        {topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <span
                key={t}
                className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {isDownload ? (
              <>
                <Download className="h-3.5 w-3.5" aria-hidden />
                {[ext, size].filter(Boolean).join(" · ") || "Download"}
              </>
            ) : resource.read_time_min ? (
              <>
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {resource.read_time_min} min read
              </>
            ) : (
              <span className="text-transparent">·</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-navy transition-colors group-hover:text-primary-dark dark:text-primary">
            {isDownload ? "Get it" : "View"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default ResourceCard;
