import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Pencil,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Star,
  Search as SearchIcon,
  Newspaper,
  FilePenLine,
  Archive,
  Plus,
} from "lucide-react";
import { SEO } from "@shared/components/common/SEO";
import { useRole } from "@shared/hooks/useRole";
import { contentPermissions, type ContentStatus } from "@/lib/contentPermissions";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { TableSkeleton } from "@shared/components/common/LoadingState";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { StudioDataPanel } from "@/components/studio/StudioDataPanel";
import { StudioMetricStrip } from "@/components/studio/StudioMetricStrip";
import { StudioPageHeader } from "@/components/studio/StudioPageHeader";
import { StudioToolbar } from "@/components/studio/StudioToolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/components/ui/alert-dialog";
import {
  useAdminBlogPosts,
  useTogglePublish,
  useDuplicateBlogPost,
  useDeleteBlogPost,
  type BlogPost,
} from "@/hooks/queries/adminBlog";

type StatusFilter = "all" | "published" | "draft" | "archived";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "published") return <Badge variant="success">Published</Badge>;
  if (status === "archived") return <Badge variant="warning">Archived</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
}

const AdminBlog = () => {
  const { isAdmin, isEditor } = useRole();
  const { data, isLoading, isError, refetch } = useAdminBlogPosts();
  const togglePublish = useTogglePublish();
  const duplicate = useDuplicateBlogPost();
  const remove = useDeleteBlogPost();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<BlogPost | null>(null);
  const allPosts = useMemo(() => data ?? [], [data]);
  const publishedCount = allPosts.filter((post) => post.status === "published").length;
  const draftCount = allPosts.filter((post) => post.status === "draft").length;
  const archivedCount = allPosts.filter((post) => post.status === "archived").length;
  const totalViews = allPosts.reduce((sum, post) => sum + (post.view_count ?? 0), 0);

  const posts = useMemo(() => {
    const rows = allPosts;
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (q && !p.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allPosts, status, search]);

  const handleToggle = (post: BlogPost) => {
    if (!isAdmin) return;
    togglePublish.mutate(post, {
      onSuccess: (row) =>
        toast.success(
          row.status === "published" ? "Post published." : "Post unpublished.",
        ),
      onError: () => toast.error("Couldn't update the post. Please try again."),
    });
  };

  const handleDuplicate = (post: BlogPost) => {
    if (!isAdmin) return;
    duplicate.mutate(post, {
      onSuccess: () => toast.success("Post duplicated as a draft."),
      onError: () => toast.error("Couldn't duplicate the post. Please try again."),
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete || !isAdmin) return;
    const title = pendingDelete.title;
    remove.mutate(pendingDelete.id, {
      onSuccess: () => toast.success(`Deleted "${title}".`),
      onError: () => toast.error("Couldn't delete the post. Please try again."),
    });
    setPendingDelete(null);
  };

  return (
    <div className="space-y-7">
      <SEO title="Blog" noindex />
      <StudioPageHeader
        eyebrow="Content studio"
        title="Stories worth sharing"
        description="Shape ideas into useful stories, then send the strongest ones out into the world."
        actions={
          <Button asChild>
            <Link to="/admin/blog/new"><Plus className="h-4 w-4" /> New story</Link>
          </Button>
        }
      />

      <StudioMetricStrip
        items={[
          { label: "Published stories", value: publishedCount.toLocaleString(), hint: "Live for readers", icon: Newspaper, tone: "cobalt" },
          { label: "Drafts in progress", value: draftCount.toLocaleString(), hint: "Still taking shape", icon: FilePenLine, tone: "orange" },
          { label: "Archived", value: archivedCount.toLocaleString(), hint: "Kept for reference", icon: Archive, tone: "lime" },
          { label: "Total views", value: totalViews.toLocaleString(), hint: "Across every story", icon: Eye, tone: "navy" },
        ]}
      />

      {/* Filters */}
      <StudioToolbar className="flex-col sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="pl-9"
            aria-label="Search posts by title"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </StudioToolbar>

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : isError ? (
        <ErrorState
          message="We couldn't load your posts."
          onRetry={() => void refetch()}
        />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          variant="firstRun"
          title="No posts yet"
          description="Create your first article to start building the Cresciva blog."
          action={{ label: "New post", to: "/admin/blog/new" }}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          variant="search"
          title="No matching posts"
          description="Try a different search term or status filter."
          action={{
            label: "Clear filters",
            onClick: () => {
              setSearch("");
              setStatus("all");
            },
          }}
        />
      ) : (
        <StudioDataPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => {
                const tags = post.tags ?? [];
                const isPublished = post.status === "published";
                const permissions = contentPermissions({
                  isAdmin,
                  isEditor,
                  status: post.status as ContentStatus,
                });
                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-14 shrink-0 rounded-lg bg-surface-muted" />
                        )}
                        <div className="min-w-0">
                          <Link
                            to={`/admin/blog/${post.id}`}
                            className="flex items-center gap-1.5 font-medium text-ink-strong hover:text-primary"
                          >
                            <span className="truncate">{post.title}</span>
                            {post.featured && (
                              <Star
                                className="h-3.5 w-3.5 shrink-0 fill-primary text-primary"
                                aria-label="Featured"
                              />
                            )}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            /{post.slug}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {post.category || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 2).map((t) => (
                          <Badge key={t} variant="outline" className="font-normal">
                            {t}
                          </Badge>
                        ))}
                        {tags.length > 2 && (
                          <Badge variant="outline" className="font-normal">
                            +{tags.length - 2}
                          </Badge>
                        )}
                        {tags.length === 0 && (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={post.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {post.view_count ?? 0}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {post.updated_at
                        ? format(new Date(post.updated_at), "d MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {permissions.canEdit && <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${post.title}`}
                        >
                          <Link to={`/admin/blog/${post.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>}
                        {(permissions.canPublish || permissions.canUnpublish) && <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(post)}
                          disabled={togglePublish.isPending}
                          aria-label={isPublished ? "Unpublish" : "Publish"}
                          title={isPublished ? "Unpublish" : "Publish"}
                        >
                          {isPublished ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>}
                        {permissions.canDuplicate && <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(post)}
                          disabled={duplicate.isPending}
                          aria-label="Duplicate"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>}
                        {permissions.canDelete && <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(post)}
                          aria-label="Delete"
                          title="Delete"
                          className="text-destructive-strong hover:text-destructive-strong"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </StudioDataPanel>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" will be permanently removed. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBlog;
