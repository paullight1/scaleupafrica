import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { useRole } from "@shared/hooks/useRole";
import { contentPermissions, type ContentStatus } from "@/lib/contentPermissions";
import { slugify } from "@shared/lib/analytics";
import { Markdown } from "@shared/lib/markdown";
import FileUpload from "@/components/FileUpload";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { LoadingState } from "@shared/components/common/LoadingState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
  useAdminBlogPost,
  useSaveBlogPost,
  isDuplicateSlugError,
  type BlogStatus,
} from "@/hooks/queries/adminBlog";
import type { TablesInsert } from "@shared/integrations/supabase/types";

const STATUS_VALUES = ["draft", "published", "archived"] as const;

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(160, "Keep the title under 160 characters."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(80, "Keep the slug under 80 characters.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only."),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  tags: z.string().max(300).optional().or(z.literal("")),
  excerpt: z.string().max(500, "Keep the excerpt under 500 characters.").optional().or(z.literal("")),
  content: z.string().optional().or(z.literal("")),
  featured: z.boolean(),
  read_time_min: z
    .union([z.coerce.number().int().min(0).max(600), z.nan()])
    .optional(),
  status: z.enum(STATUS_VALUES),
  seo_title: z.string().max(160).optional().or(z.literal("")),
  seo_description: z.string().max(320).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULTS: FormValues = {
  title: "",
  slug: "",
  category: "",
  tags: "",
  excerpt: "",
  content: "",
  featured: false,
  read_time_min: undefined,
  status: "draft",
  seo_title: "",
  seo_description: "",
};

const SEO_DESC_TARGET = 160;

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

const AdminBlogEdit = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isEditor } = useRole();

  const { data: existing, isLoading, isError, refetch } = useAdminBlogPost(id);
  const save = useSaveBlogPost();

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const hydrated = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
  });

  // Hydrate the form once the existing post loads.
  useEffect(() => {
    if (isNew || !existing || hydrated.current) return;
    hydrated.current = true;
    reset({
      title: existing.title,
      slug: existing.slug,
      category: existing.category ?? "",
      tags: (existing.tags ?? []).join(", "),
      excerpt: existing.excerpt ?? "",
      content: existing.content ?? "",
      featured: existing.featured,
      read_time_min: existing.read_time_min ?? undefined,
      status: (STATUS_VALUES as readonly string[]).includes(existing.status)
        ? (existing.status as BlogStatus)
        : "draft",
      seo_title: existing.seo_title ?? "",
      seo_description: existing.seo_description ?? "",
    });
    setCoverUrl(existing.cover_image_url ?? null);
    setPublishedAt(existing.published_at ?? null);
    setSlugTouched(true);
  }, [existing, isNew, reset]);

  const title = watch("title");
  const content = watch("content") ?? "";
  const featured = watch("featured");
  const status = watch("status");
  const seoDescription = watch("seo_description") ?? "";
  const slug = watch("slug");

  // Auto-derive the slug from the title until the user edits it directly.
  useEffect(() => {
    if (slugTouched) return;
    setValue("slug", slugify(title || ""), { shouldValidate: false });
  }, [title, slugTouched, setValue]);

  const persist = async (values: FormValues, targetStatus: BlogStatus) => {
    const rowStatus = (existing?.status ?? "draft") as ContentStatus;
    const permissions = contentPermissions({ isAdmin, isEditor, status: rowStatus });
    if (!permissions.canEdit || (targetStatus === "published" && !permissions.canPublish)) return;
    if (!isAdmin) targetStatus = "draft";
    const tags = parseTags(values.tags);
    const willPublish = targetStatus === "published";
    const nextPublishedAt =
      willPublish && !publishedAt ? new Date().toISOString() : publishedAt;

    const readTime =
      values.read_time_min !== undefined && !Number.isNaN(values.read_time_min)
        ? values.read_time_min
        : null;

    const payload: TablesInsert<"blog_posts"> = {
      title: values.title.trim(),
      slug: values.slug.trim(),
      excerpt: values.excerpt?.trim() || null,
      content: values.content ?? "",
      cover_image_url: coverUrl,
      category: values.category?.trim() || null,
      tags,
      status: targetStatus,
      featured: values.featured,
      read_time_min: readTime,
      author_id: user?.id ?? null,
      author_name: user?.email ?? null,
      seo_title: values.seo_title?.trim() || null,
      seo_description: values.seo_description?.trim() || null,
      published_at: nextPublishedAt,
    };

    try {
      const row = await save.mutateAsync({ id, values: payload });
      setValue("status", targetStatus);
      setPublishedAt(row.published_at ?? null);
      toast.success(isNew ? "Post created." : "Post saved.");
      navigate("/admin/blog");
    } catch (e) {
      if (isDuplicateSlugError(e)) {
        setError("slug", {
          type: "manual",
          message: "That slug is already taken. Try a different one.",
        });
        toast.error("That slug is already taken.");
        return;
      }
      toast.error("Couldn't save the post. Please try again.");
    }
  };

  const onSaveDraft = handleSubmit((values) =>
    persist(values, values.status === "archived" ? "archived" : "draft"),
  );
  const onPublish = handleSubmit((values) => persist(values, "published"));

  const busy = isSubmitting || save.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="space-y-6">
        <SEO title="Edit post" noindex />
        <LoadingState label="Loading post…" />
      </div>
    );
  }

  if (!isNew && isError) {
    return (
      <div className="space-y-6">
        <SEO title="Edit post" noindex />
        <ErrorState message="We couldn't load this post." onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!isNew && !existing) {
    return (
      <div className="space-y-6">
        <SEO title="Post not found" noindex />
        <ErrorState
          title="Post not found"
          message="This post may have been deleted."
          onRetry={() => navigate("/admin/blog")}
          retryLabel="Back to blog"
        />
      </div>
    );
  }

  const isPublished = status === "published";
  const permissions = contentPermissions({
    isAdmin,
    isEditor,
    status: (existing?.status ?? "draft") as ContentStatus,
  });

  return (
    <div className="space-y-6">
      <SEO title={isNew ? "New post" : "Edit post"} noindex />
      <PageHeader
        title={isNew ? "New post" : "Edit post"}
        breadcrumb={
          <Link
            to="/admin/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to blog
          </Link>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isPublished && slug && (
              <Button asChild variant="outline">
                <a href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> View public
                </a>
              </Button>
            )}
            {permissions.canSaveDraft && <Button variant="outline" onClick={onSaveDraft} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save draft
            </Button>}
            {permissions.canPublish && <Button onClick={onPublish} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publish
            </Button>}
          </div>
        }
      />

      {!permissions.canEdit && (
        <p role="status" className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Published content is read-only for editors. Ask an administrator to return it to draft.
        </p>
      )}

      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <fieldset disabled={!permissions.canEdit} className="contents">
        {/* Main column */}
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} placeholder="Post title" />
              {errors.title && (
                <p className="text-sm text-destructive-strong">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/blog/</span>
                <Input
                  id="slug"
                  {...register("slug")}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setValue("slug", e.target.value);
                  }}
                  placeholder="post-slug"
                />
              </div>
              {errors.slug ? (
                <p className="text-sm text-destructive-strong">{errors.slug.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Auto-generated from the title. Edit to customise the URL.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                {...register("excerpt")}
                rows={2}
                placeholder="A short summary shown in listings."
              />
              {errors.excerpt && (
                <p className="text-sm text-destructive-strong">{errors.excerpt.message}</p>
              )}
            </div>
          </section>

          {/* Content with Write / Preview tabs */}
          <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-soft">
            <Label htmlFor="content">Content (Markdown)</Label>
            <Tabs defaultValue="write">
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write" className="mt-3">
                <Textarea
                  id="content"
                  {...register("content")}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Write your article in Markdown…"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                <div className="min-h-[20rem] rounded-lg border border-border bg-surface-muted/40 p-4">
                  {content.trim() ? (
                    <Markdown content={content} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nothing to preview yet.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </section>

          {/* SEO */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink-strong">
              Search &amp; social
            </h2>
            <div className="space-y-2">
              <Label htmlFor="seo_title">SEO title</Label>
              <Input
                id="seo_title"
                {...register("seo_title")}
                placeholder="Defaults to the post title"
              />
              {errors.seo_title && (
                <p className="text-sm text-destructive-strong">
                  {errors.seo_title.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo_description">SEO description</Label>
                <span
                  className={`text-xs ${
                    seoDescription.length > SEO_DESC_TARGET
                      ? "text-destructive-strong"
                      : "text-muted-foreground"
                  }`}
                >
                  {seoDescription.length}/{SEO_DESC_TARGET}
                </span>
              </div>
              <Textarea
                id="seo_description"
                {...register("seo_description")}
                rows={3}
                placeholder="A concise description for search engines and social cards."
              />
              {errors.seo_description && (
                <p className="text-sm text-destructive-strong">
                  {errors.seo_description.message}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setValue("status", v as BlogStatus)}
                disabled={!isAdmin}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-surface-muted/50 px-3 py-2">
              <Label htmlFor="featured" className="cursor-pointer">
                Featured
              </Label>
              <Switch
                id="featured"
                checked={featured}
                onCheckedChange={(v) => setValue("featured", v)}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
            <p className="text-sm font-medium text-ink-strong">Cover image</p>
            <FileUpload
              bucket="content-media"
              kind="image"
              value={coverUrl}
              onChange={(file) => setCoverUrl(file?.url ?? null)}
            />
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                {...register("category")}
                placeholder="e.g. Funding"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                {...register("tags")}
                placeholder="Comma-separated, e.g. grants, women-led"
              />
              <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="read_time_min">Read time (minutes)</Label>
              <Input
                id="read_time_min"
                type="number"
                min={0}
                {...register("read_time_min")}
                placeholder="Optional"
              />
              {errors.read_time_min && (
                <p className="text-sm text-destructive-strong">
                  {errors.read_time_min.message}
                </p>
              )}
            </div>
          </section>
        </aside>
        </fieldset>
      </form>
    </div>
  );
};

export default AdminBlogEdit;
