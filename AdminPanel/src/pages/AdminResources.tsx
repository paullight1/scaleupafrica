import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Copy,
  Download,
  Eye,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { TableSkeleton } from "@shared/components/common/LoadingState";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
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
import { logAdminAction } from "@shared/lib/audit";
import {
  resourceTypeLabel,
  useAdminResources,
  useDeleteResource,
  useDuplicateResource,
  useToggleResourceStatus,
  type ResourceRow,
} from "@/hooks/queries/adminResources";

type StatusFilter = "all" | "published" | "draft" | "archived";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
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

const AdminResources = () => {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<ResourceRow | null>(null);

  const { data, isLoading, isError, refetch } = useAdminResources();
  const toggleStatus = useToggleResourceStatus();
  const duplicate = useDuplicateResource();
  const remove = useDeleteResource();

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const statusMatch = status === "all" || r.status === status;
      const searchMatch = !term || r.title.toLowerCase().includes(term);
      return statusMatch && searchMatch;
    });
  }, [data, status, search]);

  const handleTogglePublish = (row: ResourceRow) => {
    const publish = row.status !== "published";
    toggleStatus.mutate(
      { row, publish },
      {
        onSuccess: (updated) => {
          toast.success(publish ? "Resource published." : "Resource unpublished.");
          void logAdminAction(publish ? "resource_publish" : "resource_unpublish", {
            entityType: "resource",
            entityId: updated.id,
          });
        },
        onError: (err) => toast.error(err.message || "Couldn't update status."),
      },
    );
  };

  const handleDuplicate = (row: ResourceRow) => {
    duplicate.mutate(row, {
      onSuccess: (created) => {
        toast.success("Duplicated as a draft.");
        void logAdminAction("resource_duplicate", {
          entityType: "resource",
          entityId: created.id,
          details: { source_id: row.id },
        });
      },
      onError: (err) => toast.error(err.message || "Couldn't duplicate resource."),
    });
  };

  const handleDelete = () => {
    if (!toDelete) return;
    const id = toDelete.id;
    remove.mutate(id, {
      onSuccess: () => {
        toast.success("Resource deleted.");
        void logAdminAction("resource_delete", {
          entityType: "resource",
          entityId: id,
        });
        setToDelete(null);
      },
      onError: (err) => {
        toast.error(err.message || "Couldn't delete resource.");
        setToDelete(null);
      },
    });
  };

  const filtersActive = !!search || status !== "all";

  return (
    <div className="space-y-6">
      <SEO title="Resources" noindex />
      <PageHeader
        title="Resources"
        subtitle="Templates, playbooks, guides and downloads for the resource library."
        actions={
          <Button asChild>
            <Link to="/admin/resources/new">
              <Plus className="h-4 w-4" /> New resource
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          type="search"
          placeholder="Search by title…"
          aria-label="Search resources by title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load resources"
          message="Something went wrong loading the resource library."
          onRetry={() => void refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant={filtersActive ? "search" : "firstRun"}
          title={filtersActive ? "No resources match your filters" : "No resources yet"}
          description={
            filtersActive
              ? "Try a different search term or status filter."
              : "Create your first template, playbook or guide to build out the library."
          }
          action={
            filtersActive ? undefined : { label: "New resource", to: "/admin/resources/new" }
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Views / Downloads</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {row.cover_image_url ? (
                        <img
                          src={row.cover_image_url}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-muted" />
                      )}
                      <div className="min-w-0">
                        <Link
                          to={`/admin/resources/${row.id}`}
                          className="block truncate font-medium text-ink-strong underline-offset-4 hover:underline"
                        >
                          {row.title}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {row.gated && (
                            <span className="inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              <span>Gated</span>
                            </span>
                          )}
                          {row.featured && <span>Featured</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{resourceTypeLabel(row.type)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.category || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        {row.view_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {row.download_count}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${row.title}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/resources/${row.id}`}>
                            <Pencil className="h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleTogglePublish(row)}
                          disabled={toggleStatus.isPending}
                        >
                          <Eye className="h-4 w-4" />
                          {row.status === "published" ? "Unpublish" : "Publish"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(row)}
                          disabled={duplicate.isPending}
                        >
                          <Copy className="h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive-strong focus:text-destructive-strong"
                          onClick={() => setToDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `"${toDelete.title}" will be permanently removed. This can't be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminResources;
