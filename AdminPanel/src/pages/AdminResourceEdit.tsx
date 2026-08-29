import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ExternalLink, Link2, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@shared/hooks/useAuth";
import { useRole } from "@shared/hooks/useRole";
import { contentPermissions, type ContentStatus } from "@/lib/contentPermissions";
import { slugify } from "@shared/lib/analytics";
import { logAdminAction } from "@shared/lib/audit";
import { resourceDeliveryKind, type ResourceLinkMetadata } from "@shared/lib/resourceLinks";
import { fetchResourceLinkPreview } from "@/lib/resourceLinkPreview";

import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { ErrorState } from "@shared/components/common/ErrorState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import FileUpload from "@/components/FileUpload";
import { RichMarkdownEditor } from "@/components/RichMarkdownEditor";

import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";

import {
  RESOURCE_STATUSES,
  RESOURCE_TYPES,
  SlugConflictError,
  useAdminResource,
  useCreateResource,
  useUpdateResource,
  type ResourceInsert,
  type ResourceStatus,
  type ResourceType,
} from "@/hooks/queries/adminResources";

const TYPE_VALUES = RESOURCE_TYPES.map((t) => t.value) as [
  ResourceType,
  ...ResourceType[],
];
const STATUS_VALUES = RESOURCE_STATUSES.map((s) => s.value) as [
  ResourceStatus,
  ...ResourceStatus[],
];

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Keep the title under 200 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(80, "Keep the slug under 80 characters")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only"),
  type: z.enum(TYPE_VALUES),
  category: z.string().trim().max(100, "Keep the category under 100 characters"),
  topics: z.string().max(500, "That's a lot of topics — please shorten the list"),
  excerpt: z.string().max(600, "Keep the excerpt under 600 characters"),
  content: z.string(),
  gated: z.boolean(),
  featured: z.boolean(),
  read_time_min: z
    .number()
    .int("Enter a whole number")
    .positive("Enter a positive number")
    .max(999, "That's too long")
    .nullable(),
  status: z.enum(STATUS_VALUES),
  cover_image_url: z.string().nullable(),
  file_url: z.string().nullable(),
  file_name: z.string().nullable(),
  file_size_kb: z.number().nullable(),
});

type FormValues = z.infer<typeof schema>;
type DeliveryKind = "upload" | "link";

const DEFAULTS: FormValues = {
  title: "",
  slug: "",
  type: "template",
  category: "",
  topics: "",
  excerpt: "",
  content: "",
  gated: false,
  featured: false,
  read_time_min: null,
  status: "draft",
  cover_image_url: null,
  file_url: null,
  file_name: null,
  file_size_kb: null,
};

/** "a, b ,c" -> ["a","b","c"]; empty entries dropped. */
function parseTopics(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

const AdminResourceEdit = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isEditor } = useRole();

  const resourceQuery = useAdminResource(id);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();

  const slugTouched = useRef(false);
  const hydrated = useRef(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [deliveryKind, setDeliveryKind] = useState<DeliveryKind | null>(
    isEdit ? "upload" : null,
  );
  const [linkUrl, setLinkUrl] = useState("");
  const [linkMetadata, setLinkMetadata] = useState<ResourceLinkMetadata | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isFetchingLink, setIsFetchingLink] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  const title = watch("title");
  const slug = watch("slug");
  const status = watch("status");
  const coverUrl = watch("cover_image_url");
  const fileUrl = watch("file_url");

  // Auto-derive the slug from the title until the user edits it themselves.
  useEffect(() => {
    if (isEdit) return;
    if (!slugTouched.current) {
      setValue("slug", slugify(title), { shouldValidate: false });
    }
  }, [title, isEdit, setValue]);

  // Hydrate the form once the existing resource arrives.
  useEffect(() => {
    const row = resourceQuery.data;
    if (!row || hydrated.current) return;
    hydrated.current = true;
    slugTouched.current = true;
    setPublishedAt(row.published_at);
    const savedDeliveryKind = resourceDeliveryKind(row.file_url);
    setDeliveryKind(savedDeliveryKind === "link" ? "link" : "upload");
    if (savedDeliveryKind === "link") setLinkUrl(row.file_url ?? "");
    reset({
      title: row.title,
      slug: row.slug,
      type: (row.type as ResourceType) ?? "template",
      category: row.category ?? "",
      topics: (row.topics ?? []).join(", "),
      excerpt: row.excerpt ?? "",
      content: row.content ?? "",
      gated: row.gated,
      featured: row.featured,
      read_time_min: row.read_time_min,
      status: (row.status as ResourceStatus) ?? "draft",
      cover_image_url: row.cover_image_url,
      file_url: row.file_url,
      file_name: row.file_name,
      file_size_kb: row.file_size_kb,
    });
  }, [resourceQuery.data, reset]);

  const persist = async (values: FormValues, nextStatus: ResourceStatus) => {
    const permissions = contentPermissions({
      isAdmin,
      isEditor,
      status: (resourceQuery.data?.status ?? "draft") as ContentStatus,
    });
    if (!permissions.canEdit || (nextStatus === "published" && !permissions.canPublish)) return;
    if (!isAdmin) nextStatus = "draft";
    const willPublish = nextStatus === "published";
    const nextPublishedAt =
      willPublish && !publishedAt ? new Date().toISOString() : publishedAt;

    const authorName = user?.email ?? null;
    const payload: ResourceInsert = {
      title: values.title.trim(),
      slug: values.slug.trim(),
      type: values.type,
      category: values.category.trim() || null,
      excerpt: values.excerpt.trim() || null,
      content: values.content || null,
      cover_image_url: values.cover_image_url,
      file_url: values.file_url,
      file_name: values.file_name,
      file_size_kb: values.file_size_kb,
      topics: parseTopics(values.topics),
      gated: values.gated,
      featured: values.featured,
      read_time_min: values.read_time_min,
      status: nextStatus,
      author_id: user?.id ?? null,
      author_name: authorName,
      published_at: nextPublishedAt,
    };

    try {
      if (isEdit && id) {
        await updateResource.mutateAsync({ id, values: payload });
        void logAdminAction("resource_update", {
          entityType: "resource",
          entityId: id,
        });
      } else {
        const created = await createResource.mutateAsync(payload);
        void logAdminAction("resource_create", {
          entityType: "resource",
          entityId: created.id,
        });
      }
      toast.success(
        willPublish ? "Resource published." : isEdit ? "Changes saved." : "Draft created.",
      );
      navigate("/admin/resources");
    } catch (err) {
      if (err instanceof SlugConflictError) {
        setError("slug", { type: "manual", message: err.message });
        toast.error(err.message);
        return;
      }
      toast.error(err instanceof Error ? err.message : "Couldn't save the resource.");
    }
  };

  const onSaveDraft = handleSubmit((values) => persist(values, "draft"));
  const onPublish = handleSubmit((values) => persist(values, "published"));
  // "Save" keeps the current status (e.g. re-saving an archived or published item).
  const onSave = handleSubmit((values) => persist(values, values.status));

  const onFetchLinkDetails = async () => {
    const candidate = linkUrl.trim();
    if (!candidate) {
      setLinkError("Enter a resource link first.");
      return;
    }

    setIsFetchingLink(true);
    setLinkError(null);
    try {
      const metadata = await fetchResourceLinkPreview(candidate);
      setLinkMetadata(metadata);
      setLinkUrl(metadata.url);
      setValue("file_url", metadata.url, { shouldDirty: true });
      setValue("file_name", metadata.siteName, { shouldDirty: true });
      setValue("file_size_kb", null, { shouldDirty: true });
      if (metadata.title) {
        setValue("title", metadata.title, { shouldDirty: true, shouldValidate: true });
      }
      if (metadata.description) {
        setValue("excerpt", metadata.description, { shouldDirty: true, shouldValidate: true });
      }
      if (metadata.imageUrl) {
        setValue("cover_image_url", metadata.imageUrl, { shouldDirty: true });
      }
    } catch (error) {
      setLinkError(
        error instanceof Error
          ? error.message
          : "Couldn't read link details. Check the URL and try again.",
      );
    } finally {
      setIsFetchingLink(false);
    }
  };

  const busy = isSubmitting || createResource.isPending || updateResource.isPending;
  const permissions = contentPermissions({
    isAdmin,
    isEditor,
    status: (resourceQuery.data?.status ?? "draft") as ContentStatus,
  });

  if (isEdit && resourceQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SEO title="Edit resource" noindex />
        <CardSkeleton lines={6} />
        <CardSkeleton lines={6} />
      </div>
    );
  }

  if (isEdit && resourceQuery.isError) {
    return (
      <div className="space-y-6">
        <SEO title="Edit resource" noindex />
        <ErrorState
          title="Couldn't load this resource"
          message="Something went wrong. Please try again."
          onRetry={() => void resourceQuery.refetch()}
        />
      </div>
    );
  }

  if (isEdit && !resourceQuery.isLoading && !resourceQuery.data) {
    return (
      <div className="space-y-6">
        <SEO title="Resource not found" noindex />
        <PageHeader title="Resource not found" />
        <p className="text-sm text-muted-foreground">
          This resource may have been deleted.{" "}
          <Link to="/admin/resources" className="text-navy underline underline-offset-4">
            Back to resources
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO title={isEdit ? "Edit resource" : "New resource"} noindex />
      <PageHeader
        title={isEdit ? "Edit resource" : "New resource"}
        breadcrumb={
          <Link
            to="/admin/resources"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink-strong"
          >
            <ArrowLeft className="h-4 w-4" /> Resources
          </Link>
        }
        actions={
          isEdit && status === "published" && slug ? (
            <Button variant="outline" asChild>
              <a href={`/resources/${slug}`} target="_blank" rel="noopener noreferrer">
                View public <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : undefined
        }
      />

      {!permissions.canEdit && (
        <p role="status" className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Published content is read-only for editors. Ask an administrator to return it to draft.
        </p>
      )}

      {!deliveryKind && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl font-semibold text-ink-strong">
              How are you sharing this resource?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a downloadable file or send readers to an existing page.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-border p-5 text-left transition-colors hover:border-primary hover:bg-secondary/40"
                onClick={() => setDeliveryKind("upload")}
              >
                <UploadCloud className="h-6 w-6 text-primary" />
                <span className="mt-3 block font-display text-lg font-semibold text-ink-strong">
                  Upload a file
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Add a PDF, template, presentation, or other downloadable asset.
                </span>
              </button>
              <button
                type="button"
                className="rounded-xl border border-border p-5 text-left transition-colors hover:border-primary hover:bg-secondary/40"
                onClick={() => setDeliveryKind("link")}
              >
                <Link2 className="h-6 w-6 text-primary" />
                <span className="mt-3 block font-display text-lg font-semibold text-ink-strong">
                  Paste a link
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Share a guide, document, video, or tool hosted elsewhere.
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {deliveryKind && <form className="grid gap-6 lg:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        <fieldset disabled={!permissions.canEdit} className="contents">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {deliveryKind === "link" && (
            <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-strong">Link details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fetch the page title, description, and preview image, then edit them below.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="resource-link">Resource link</Label>
                  <Input
                    id="resource-link"
                    type="url"
                    value={linkUrl}
                    onChange={(event) => {
                      setLinkUrl(event.target.value);
                      setLinkError(null);
                    }}
                    placeholder="https://example.com/resource"
                    aria-invalid={!!linkError}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onFetchLinkDetails()}
                  disabled={isFetchingLink || !linkUrl.trim()}
                >
                  {isFetchingLink && <Loader2 className="h-4 w-4 animate-spin" />}
                  Fetch link details
                </Button>
              </div>
              {linkError && <p className="text-sm text-destructive-strong">{linkError}</p>}
              {(linkMetadata?.imageUrl || (fileUrl && coverUrl)) && (
                <div className="overflow-hidden rounded-lg border border-border bg-surface-muted/40">
                  {(linkMetadata?.imageUrl || coverUrl) && (
                    <img
                      src={linkMetadata?.imageUrl ?? coverUrl ?? undefined}
                      alt="Link preview"
                      className="aspect-[16/7] w-full object-cover"
                    />
                  )}
                  {fileUrl && (
                    <div className="flex items-center justify-between gap-3 p-4">
                      <span className="truncate text-sm text-muted-foreground">
                        {linkMetadata?.siteName ?? fileUrl}
                      </span>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        View original link <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} aria-invalid={!!errors.title} />
              {errors.title && (
                <p className="text-sm text-destructive-strong">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                {...register("slug", {
                  onChange: () => {
                    slugTouched.current = true;
                  },
                })}
                aria-invalid={!!errors.slug}
              />
              <p className="text-xs text-muted-foreground">
                Public URL: /resources/{slug || "your-slug"}
              </p>
              {errors.slug && (
                <p className="text-sm text-destructive-strong">{errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                rows={3}
                {...register("excerpt")}
                placeholder="Short summary shown in the library and previews."
                aria-invalid={!!errors.excerpt}
              />
              {errors.excerpt && (
                <p className="text-sm text-destructive-strong">{errors.excerpt.message}</p>
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <Label>Content</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Format visually or switch to Markdown source when you need precise control.
                </p>
              </div>
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                Stored as Markdown
              </span>
            </div>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichMarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={!permissions.canEdit}
                />
              )}
            />
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink-strong">Publishing</h2>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!isAdmin}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="gated">Gated download</Label>
                <p className="text-xs text-muted-foreground">Require an email before download.</p>
              </div>
              <Controller
                control={control}
                name="gated"
                render={({ field }) => (
                  <Switch
                    id="gated"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Gated download"
                  />
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="featured">Featured</Label>
                <p className="text-xs text-muted-foreground">Highlight in the library.</p>
              </div>
              <Controller
                control={control}
                name="featured"
                render={({ field }) => (
                  <Switch
                    id="featured"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Featured"
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {permissions.canPublish && <Button type="button" onClick={onPublish} disabled={busy}>
                {busy ? "Saving…" : "Publish"}
              </Button>}
              {permissions.canSaveDraft && <Button type="button" variant="outline" onClick={onSaveDraft} disabled={busy}>
                Save as draft
              </Button>}
              {permissions.canEdit && isEdit && status !== "draft" && status !== "published" && (
                <Button type="button" variant="ghost" onClick={onSave} disabled={busy}>
                  Save changes
                </Button>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink-strong">Details</h2>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                {...register("category")}
                placeholder="e.g. Fundraising"
                aria-invalid={!!errors.category}
              />
              {errors.category && (
                <p className="text-sm text-destructive-strong">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="topics">Topics</Label>
              <Input
                id="topics"
                {...register("topics")}
                placeholder="finance, growth, hiring"
                aria-invalid={!!errors.topics}
              />
              <p className="text-xs text-muted-foreground">Comma-separated.</p>
              {errors.topics && (
                <p className="text-sm text-destructive-strong">{errors.topics.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="read_time_min">Read time (minutes)</Label>
              <Input
                id="read_time_min"
                type="number"
                min={1}
                {...register("read_time_min", {
                  setValueAs: (v) =>
                    v === "" || v === null || v === undefined ? null : Number(v),
                })}
                aria-invalid={!!errors.read_time_min}
              />
              {errors.read_time_min && (
                <p className="text-sm text-destructive-strong">
                  {errors.read_time_min.message}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold text-ink-strong">Media</h2>

            <div className="space-y-2">
              <Label>Cover image</Label>
              <FileUpload
                bucket="content-media"
                kind="image"
                value={coverUrl}
                onChange={(f) =>
                  setValue("cover_image_url", f?.url ?? null, { shouldDirty: true })
                }
              />
            </div>

            {deliveryKind === "upload" && (
              <div className="space-y-2">
                <Label>Downloadable file</Label>
                <FileUpload
                  bucket="resource-files"
                  kind="file"
                  value={fileUrl}
                  onChange={(f) => {
                    setValue("file_url", f?.url ?? null, { shouldDirty: true });
                    setValue("file_name", f?.name ?? null, { shouldDirty: true });
                    setValue("file_size_kb", f?.sizeKb ?? null, { shouldDirty: true });
                  }}
                />
              </div>
            )}
          </section>
        </div>
        </fieldset>
      </form>}
    </div>
  );
};

export default AdminResourceEdit;
