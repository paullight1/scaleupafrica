import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Search,
  Star,
  StarOff,
  EyeOff,
  Eye,
  Flag,
  FlagOff,
  ExternalLink,
  Trash2,
  Building2,
} from "lucide-react";
import {
  useAdminProfiles,
  useModerateProfile,
  useDeleteProfile,
  type AdminProfileRow,
} from "@/hooks/queries/adminUsers";
import { SEO } from "@/components/common/SEO";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_OPTIONS = ["all", "active", "hidden", "flagged"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function isStatusFilter(v: string | null): v is StatusFilter {
  return !!v && (STATUS_OPTIONS as readonly string[]).includes(v);
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "hidden") return <Badge variant="secondary">Hidden</Badge>;
  if (status === "flagged") return <Badge variant="destructive">Flagged</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function BusinessCell({ profile }: { profile: AdminProfileRow }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
        {profile.logo_url ? (
          <img
            src={profile.logo_url}
            alt={`${profile.business_name} logo`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-ink-strong">{profile.business_name}</p>
        {profile.founder_name && (
          <p className="truncate text-xs text-muted-foreground">{profile.founder_name}</p>
        )}
      </div>
    </div>
  );
}

const AdminProfiles = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const status: StatusFilter = isStatusFilter(statusParam) ? statusParam : "all";

  const [sector, setSector] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data, isLoading, isError, refetch } = useAdminProfiles();
  const allRows = useMemo(() => data ?? [], [data]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) if (r.sector) set.add(r.sector);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const term = q.trim().toLowerCase();
  const rows = useMemo(
    () =>
      allRows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (sector !== "all" && r.sector !== sector) return false;
        if (term && !r.business_name.toLowerCase().includes(term)) return false;
        return true;
      }),
    [allRows, status, sector, term],
  );

  const moderate = useModerateProfile();
  const del = useDeleteProfile();
  const busy = moderate.isPending || del.isPending;

  const [deleteTarget, setDeleteTarget] = useState<AdminProfileRow | null>(null);

  const setStatusFilter = (value: StatusFilter) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") next.delete("status");
        else next.set("status", value);
        return next;
      },
      { replace: true },
    );
  };

  const toggleFeatured = (p: AdminProfileRow) =>
    moderate.mutate({
      id: p.id,
      patch: { featured: !p.featured },
      action: p.featured ? "unfeature_profile" : "feature_profile",
      successMessage: p.featured ? "Removed from featured" : "Profile featured",
    });

  const hasFilters = status !== "all" || sector !== "all" || term.length > 0;

  return (
    <div className="space-y-6">
      <SEO
        title="Directory Profiles"
        description="Moderate directory business profiles."
        noindex
      />
      <PageHeader
        title="Directory Profiles"
        subtitle="Feature, hide, flag or remove business profiles in the directory."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search profiles by business name"
            placeholder="Search business name…"
            className="pl-9"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sector} onValueChange={setSector}>
          <SelectTrigger className="sm:w-48" aria-label="Filter by sector">
            <SelectValue placeholder="Sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sectors</SelectItem>
            {sectors.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load profiles"
          message="Something went wrong fetching the directory. Try again."
          onRetry={() => refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          variant={hasFilters ? "search" : "default"}
          title={hasFilters ? "No profiles match" : "No profiles yet"}
          description={
            hasFilters
              ? "Try a different search, status or sector."
              : "Business profiles will appear here once people create them."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="min-w-[220px]">
                    <BusinessCell profile={p} />
                  </TableCell>
                  <TableCell>{p.country ?? "—"}</TableCell>
                  <TableCell>{p.sector ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.featured}
                      onCheckedChange={() => toggleFeatured(p)}
                      disabled={busy}
                      aria-label={
                        p.featured
                          ? `Unfeature ${p.business_name}`
                          : `Feature ${p.business_name}`
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.view_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${p.business_name}`}
                          disabled={busy}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => toggleFeatured(p)}>
                          {p.featured ? (
                            <>
                              <StarOff className="h-4 w-4" /> Unfeature
                            </>
                          ) : (
                            <>
                              <Star className="h-4 w-4" /> Feature
                            </>
                          )}
                        </DropdownMenuItem>

                        {p.status === "hidden" ? (
                          <DropdownMenuItem
                            onSelect={() =>
                              moderate.mutate({
                                id: p.id,
                                patch: { status: "active" },
                                action: "unhide_profile",
                                successMessage: "Profile is visible again",
                              })
                            }
                          >
                            <Eye className="h-4 w-4" /> Unhide
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() =>
                              moderate.mutate({
                                id: p.id,
                                patch: { status: "hidden" },
                                action: "hide_profile",
                                successMessage: "Profile hidden",
                              })
                            }
                          >
                            <EyeOff className="h-4 w-4" /> Hide
                          </DropdownMenuItem>
                        )}

                        {p.status === "flagged" ? (
                          <DropdownMenuItem
                            onSelect={() =>
                              moderate.mutate({
                                id: p.id,
                                patch: { status: "active" },
                                action: "unflag_profile",
                                successMessage: "Flag cleared",
                              })
                            }
                          >
                            <FlagOff className="h-4 w-4" /> Unflag
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() =>
                              moderate.mutate({
                                id: p.id,
                                patch: { status: "flagged" },
                                action: "flag_profile",
                                successMessage: "Profile flagged",
                              })
                            }
                          >
                            <Flag className="h-4 w-4" /> Flag
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        {p.slug && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`/directory/${p.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" /> View public
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive-strong focus:text-destructive-strong"
                          onSelect={() => setDeleteTarget(p)}
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.business_name}" will be permanently removed from the directory. This cannot be undone.`
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive-strong text-destructive-foreground hover:bg-destructive-strong/90"
              onClick={() => {
                if (!deleteTarget) return;
                del.mutate(
                  { id: deleteTarget.id, businessName: deleteTarget.business_name },
                  { onSettled: () => setDeleteTarget(null) },
                );
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProfiles;
