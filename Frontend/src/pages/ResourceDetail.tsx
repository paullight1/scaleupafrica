import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Download,
  FileText,
  Lock,
  User,
} from "lucide-react";
import { supabase } from "@shared/integrations/supabase/client";
import { trackEvent } from "@shared/lib/analytics";
import { Markdown } from "@shared/lib/markdown";
import { SEO } from "@shared/components/common/SEO";
import { ErrorState } from "@shared/components/common/ErrorState";
import { EmptyState } from "@shared/components/common/EmptyState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import {
  useResourceBySlug,
  useRelatedResources,
  resourceTypeLabel,
} from "@/hooks/queries/resources";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatFileSize(kb: number | null): string | null {
  if (!kb || kb <= 0) return null;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Best-effort download-metric increment (never throws). */
function incrementDownload(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any)
    .rpc("increment_resource_metric", { _id: id, _metric: "download" })
    .then(
      () => {},
      () => {},
    );
}

const ResourceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: resource, isLoading, isError, refetch } = useResourceBySlug(slug);

  const relatedQuery = useRelatedResources(resource?.type, resource?.id, 3);

  // Lead-capture state (gated downloads).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // Fire the view event + increment once per resource.
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!resource) return;
    if (viewedRef.current === resource.id) return;
    viewedRef.current = resource.id;
    void trackEvent("resource_view", {
      entityType: "resource",
      entityId: resource.id,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .rpc("increment_resource_metric", { _id: resource.id, _metric: "view" })
      .then(
        () => {},
        () => {},
      );
  }, [resource]);

  const publishedLabel = useMemo(() => {
    const d = resource?.published_at ?? resource?.created_at;
    if (!d) return null;
    try {
      return format(new Date(d), "d MMM yyyy");
    } catch {
      return null;
    }
  }, [resource]);

  // ---- States (never crash on a miss) ----
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <CardSkeleton media lines={2} className="mb-6" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <CardSkeleton lines={6} />
          </div>
          <CardSkeleton lines={3} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <ErrorState
          title="Couldn't load this resource"
          message="Something went wrong reaching the library. Try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <SEO title="Resource not found" noindex />
        <EmptyState
          variant="default"
          title="Resource not found"
          description="The resource you're looking for doesn't exist or is no longer available."
          action={{ label: "Back to resources", to: "/resources" }}
        />
      </div>
    );
  }

  const typeLabel = resourceTypeLabel(resource.type);
  const size = formatFileSize(resource.file_size_kb);
  const hasFile = !!resource.file_url;
  const canDownloadNow = hasFile && (!resource.gated || unlocked);
  const seoImage = resource.cover_image_url || undefined;

  const handleDownload = () => {
    if (!resource.file_url) return;
    void trackEvent("resource_download", {
      entityType: "resource",
      entityId: resource.id,
      metadata: { resource_title: resource.title },
    });
    incrementDownload(resource.id);
    window.open(resource.file_url, "_blank", "noopener,noreferrer");
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      toast.error("Enter a valid email address to get your download.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        email: trimmedEmail,
        name: name.trim() || null,
        company: company.trim() || null,
        source: "resource_download",
        resource_id: resource.id,
        metadata: { resource_title: resource.title },
      });
      if (error) throw error;

      setUnlocked(true);
      incrementDownload(resource.id);
      void trackEvent("lead_submit", {
        entityType: "resource",
        entityId: resource.id,
        metadata: { resource_title: resource.title, source: "resource_download" },
      });
      void trackEvent("resource_download", {
        entityType: "resource",
        entityId: resource.id,
        metadata: { resource_title: resource.title, gated: true },
      });
      toast.success("Your download is ready.");
    } catch {
      toast.error("Couldn't submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const related = relatedQuery.data ?? [];

  return (
    <>
      <SEO title={resource.title} description={resource.excerpt ?? undefined} ogImage={seoImage} />

      {/* Header band */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            to="/resources"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Resource Library
          </Link>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="accent">{typeLabel}</Badge>
            {resource.category && (
              <span className="text-sm text-white/70">{resource.category}</span>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">
            {resource.title}
          </h1>

          {resource.excerpt && (
            <p className="mt-3 max-w-2xl text-white/80">{resource.excerpt}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
            {resource.author_name && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" aria-hidden /> {resource.author_name}
              </span>
            )}
            {publishedLabel && <span>{publishedLabel}</span>}
            {resource.read_time_min && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden /> {resource.read_time_min} min read
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 md:col-span-2">
            {resource.cover_image_url && (
              <img
                src={resource.cover_image_url}
                alt=""
                loading="lazy"
                className="w-full rounded-xl border border-border object-cover"
              />
            )}

            {resource.topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {resource.topics.map((t) => (
                  <Link
                    key={t}
                    to={`/resources?topic=${encodeURIComponent(t)}`}
                    className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary-dark"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}

            {resource.content ? (
              <Markdown content={resource.content} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {hasFile
                  ? "Use the download panel to grab this resource."
                  : "This resource has no additional detail yet."}
              </p>
            )}
          </div>

          {/* Sidebar: download / gate */}
          <aside className="space-y-6">
            {hasFile && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-soft md:sticky md:top-6">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-navy dark:text-white">
                    <FileText className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-ink-strong">
                      {resource.gated && !unlocked ? "Get this resource" : "Download"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[resource.file_name, size].filter(Boolean).join(" · ") || typeLabel}
                    </p>
                  </div>
                </div>

                {canDownloadNow ? (
                  <Button className="w-full" size="lg" onClick={handleDownload}>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-3" noValidate>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" aria-hidden />
                      Tell us where to send it.
                    </p>
                    <div className="space-y-1.5">
                      <Label htmlFor="lead-name">Name</Label>
                      <Input
                        id="lead-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lead-email">
                        Email <span className="text-destructive-strong">*</span>
                      </Label>
                      <Input
                        id="lead-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="you@company.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lead-company">Company</Label>
                      <Input
                        id="lead-company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        autoComplete="organization"
                        placeholder="Your business"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={submitting}
                    >
                      {submitting ? "Submitting…" : "Get the download"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      We'll email you occasional resources. Unsubscribe anytime.
                    </p>
                  </form>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 font-display text-xl font-bold text-ink-strong">
              Related resources
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default ResourceDetail;
