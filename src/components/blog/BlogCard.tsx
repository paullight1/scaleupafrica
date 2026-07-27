import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BlogCardRow } from "@/hooks/queries/blog";

/** A blog listing result. The whole card links to the post. */
export function BlogCard({ post }: { post: BlogCardRow }) {
  const dateLabel = post.published_at
    ? format(new Date(post.published_at), "MMM d, yyyy")
    : null;

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-all hover:border-primary/40 hover:shadow-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-surface-muted">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-navy font-display text-3xl font-bold text-primary-foreground">
            {post.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        {post.category && (
          <Badge variant="accent" className="mb-3 w-fit">
            {post.category}
          </Badge>
        )}

        <h3 className="mb-2 font-display text-lg font-bold text-ink-strong">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="mb-4 line-clamp-3 text-sm text-foreground/80">{post.excerpt}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {post.author_name && <span className="font-medium">{post.author_name}</span>}
          {dateLabel && (
            <>
              {post.author_name && <span aria-hidden>·</span>}
              <time dateTime={post.published_at ?? undefined}>{dateLabel}</time>
            </>
          )}
          {post.read_time_min ? (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {post.read_time_min} min read
              </span>
            </>
          ) : null}
        </div>

        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-navy transition-colors group-hover:text-primary-dark dark:text-primary">
          Read article
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default BlogCard;
