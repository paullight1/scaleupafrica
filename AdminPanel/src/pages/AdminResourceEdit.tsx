import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@shared/hooks/useAuth";
import { slugify } from "@shared/lib/analytics";
import { logAdminAction } from "@shared/lib/audit";
import { Markdown } from "@shared/lib/markdown";

import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { ErrorState } from "@shared/components/common/ErrorState";
import { CardSkeleton } from "@shared/components/common/LoadingState";
import FileUpload from "@/components/FileUpload";

import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Switch } from "@shared/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
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

  const resourceQuery = useAdminResource(id);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();

  const slugTouched = useRef(false);
  const hydrated = useRef(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

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
  const content = watch("content");
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

  const busy = isSubmitting || createResource.isPending || updateResource.isPending;

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

      <form className="grid gap-6 lg:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
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
              <Label htmlFor="content">Content</Label>
              <span className="text-xs text-muted-foreground">Markdown supported</span>
            </div>
            <Tabs defaultValue="write">
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="write">
                <Textarea
                  id="content"
                  rows={16}
                  className="font-mono text-sm"
                  {...register("content")}
                  placeholder={"# Heading\n\nWrite your article in Markdown…"}
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[16rem] rounded-lg border border-border bg-surface-muted/40 p-4">
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
                  <Select value={field.value} onValueChange={field.onChange}>
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
              <Button type="button" onClick={onPublish} disabled={busy}>
                {busy ? "Saving…" : "Publish"}
              </Button>
              <Button type="button" variant="outline" onClick={onSaveDraft} disabled={busy}>
                Save as draft
              </Button>
              {isEdit && status !== "draft" && status !== "published" && (
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
          </section>
        </div>
      </form>
    </div>
  );
};

export default AdminResourceEdit;
