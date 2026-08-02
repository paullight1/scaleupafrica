import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading, Reveal } from "@shared/components/marketing";
import { ErrorState } from "@shared/components/common/ErrorState";
import { EmptyState } from "@shared/components/common/EmptyState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { BlogCard } from "@/components/blog/BlogCard";
import { useLatestPosts } from "@/hooks/queries/blog";

/**
 * The page's one data-bound section, and therefore the one with real states.
 *
 * An error offers a RETRY rather than rendering null: a failed fetch is a real
 * event, and silently hiding the section makes it look like there is no blog.
 */
const Insights = () => {
  const { data, isPending, isError, refetch } = useLatestPosts(3);
  const posts = data ?? [];

  return (
    <Section tone="light">
      <SectionHeading
        eyebrow="Insights"
        title="Notes on funding and growth"
        lead="Practical writing for African founders — how funders think, and what actually moves a business forward."
      />

      <div className="mt-14">
        {isPending ? (
          <div role="status" aria-busy="true" className="grid gap-6 md:grid-cols-3">
            <span className="sr-only">Loading posts…</span>
            <CardSkeleton media />
            <CardSkeleton media />
            <CardSkeleton media />
          </div>
        ) : isError ? (
          <ErrorState
            title="We couldn't load the latest posts"
            message="Check your connection and try again — the blog itself is still there."
            onRetry={() => refetch()}
          />
        ) : posts.length === 0 ? (
          <EmptyState
            illustration="empty-insights"
            title="No posts yet"
            description="We're writing the first ones now. The blog is where new funding and growth notes land."
            action={{ label: "Visit the blog", to: "/blog" }}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {posts.map((post, index) => (
              <Reveal key={post.id} delay={index * 80} className="h-full">
                <BlogCard post={post} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {posts.length > 0 && (
        <p className="mt-10 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm font-semibold text-navy underline-offset-4 hover:underline"
          >
            Read the blog
            <ArrowRight className="h-4 w-4" />
          </Link>
        </p>
      )}
    </Section>
  );
};

export default Insights;
