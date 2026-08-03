import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Clock } from "lucide-react";
import { supabase } from "@shared/integrations/supabase/client";
import { trackEvent } from "@shared/lib/analytics";
import { Markdown } from "@shared/lib/markdown";
import { SEO } from "@shared/components/common/SEO";
import { articleLd, breadcrumbLd } from "@shared/lib/structuredData";
import { ErrorState } from "@shared/components/common/ErrorState";
import { EmptyState } from "@shared/components/common/EmptyState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { BlogCard } from "@/components/blog/BlogCard";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import NewsletterSignup from "@/components/NewsletterSignup";
import { useBlogPost, useRelatedPosts } from "@/hooks/queries/blog";

const BlogDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError, refetch } = useBlogPost(slug);
  const { data: related } = useRelatedPosts(post?.category, post?.id, 3);

  // Fire-and-forget analytics + view counter, once per successful mount.
  const countedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!post) return;
    if (countedRef.current === post.id) return;
    countedRef.current = post.id;
    void trackEvent("blog_view", { entityType: "blog_post", entityId: post.id });
    supabase.rpc("increment_post_views", { _id: post.id }).then(
      () => {},
      () => {},
    );
  }, [post]);

  if (isLoading) {
    return (
      <>
        <SEO title="Blog" description="Insights, playbooks and founder stories from across Africa." />
        <div className="mx-auto max-w-3xl px-6 py-10">
          <CardSkeleton media lines={2} className="mb-6" />
          <CardSkeleton lines={6} />
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <SEO title="Blog" description="Insights, playbooks and founder stories from across Africa." />
        <div className="mx-auto max-w-3xl px-6 py-16">
          <ErrorState
            title="Couldn't load this article"
            message="Something went wrong. Check your connection and try again."
            onRetry={() => refetch()}
          />
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <SEO
          title="Post not found"
          description="This article could not be found."
          noindex
        />
        <div className="mx-auto max-w-3xl px-6 py-16">
          <EmptyState
            variant="search"
            title="Post not found"
            description="This article may have been moved or unpublished."
            action={{ label: "Back to the blog", to: "/blog" }}
          />
        </div>
      </>
    );
  }

  const dateLabel = post.published_at
    ? format(new Date(post.published_at), "MMMM d, yyyy")
    : null;

  return (
    <>
      <SEO
        title={post.seo_title || post.title}
        description={post.seo_description || post.excerpt || undefined}
        ogImage={post.cover_image_url || undefined}
        canonical={`/blog/${post.slug}`}
        jsonLd={[
          articleLd({
            headline: post.title,
            description: post.seo_description || post.excerpt || undefined,
            url: `/blog/${post.slug}`,
            image: post.cover_image_url || undefined,
            datePublished: post.published_at || undefined,
            authorName: post.author_name || undefined,
          }),
          breadcrumbLd([
            { name: "Home", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: post.title, url: `/blog/${post.slug}` },
          ]),
        ]}
      />

      <article className="mx-auto max-w-3xl px-6 py-10">
        <Link
          to="/blog"
          className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-dark dark:hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to the blog
        </Link>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {post.category && <Badge variant="accent">{post.category}</Badge>}
          {post.tags?.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="mb-4 font-display text-3xl font-bold text-ink-strong md:text-4xl">
          {post.title}
        </h1>

        <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
                <Clock className="h-4 w-4" /> {post.read_time_min} min read
              </span>
            </>
          ) : null}
        </div>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt=""
            loading="lazy"
            className="mb-10 aspect-[16/9] w-full rounded-xl border border-border object-cover"
          />
        )}

        {post.content ? (
          <Markdown content={post.content} />
        ) : post.excerpt ? (
          <p className="text-lg text-foreground/80">{post.excerpt}</p>
        ) : null}

        {/* Newsletter CTA */}
        <div className="mt-12 rounded-xl border border-border bg-surface-subtle p-8">
          <h2 className="font-display text-xl font-bold text-ink-strong">
            Get the next one in your inbox
          </h2>
          <p className="mb-5 mt-2 text-sm text-muted-foreground">
            Playbooks, funding intel and founder stories from across Africa — no spam.
          </p>
          <NewsletterSignup source="blog" variant="card" />
        </div>
      </article>

      {related && related.length > 0 && (
        <section className="border-t border-border bg-surface-subtle">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <h2 className="mb-6 font-display text-2xl font-bold text-ink-strong">
              Related articles
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <BlogCard key={r.id} post={r} />
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <Button asChild variant="outline" size="lg">
                <Link to="/blog">Browse all articles</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default BlogDetail;
