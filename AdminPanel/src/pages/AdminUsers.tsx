import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCog,
  CalendarClock,
  KeyRound,
  KeySquare,
} from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import {
  useAdminUsers,
  useSetAccess,
  useSetExpiry,
  useSetRole,
  subscriptionActive,
  type AdminUserRow,
} from "@/hooks/queries/adminUsers";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";
import { EmptyState } from "@shared/components/common/EmptyState";
import { ErrorState } from "@shared/components/common/ErrorState";
import { TableSkeleton } from "@shared/components/common/LoadingState";
import { Input } from "@shared/components/ui/input";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Label } from "@shared/components/ui/label";

/** yyyy-MM-dd for a date input, from an ISO timestamp (or today). */
function toDateInput(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return format(new Date(), "yyyy-MM-dd");
  return format(d, "yyyy-MM-dd");
}

function SubscriptionCell({ user }: { user: AdminUserRow }) {
  const active = subscriptionActive(user);
  if (!active) {
    return <Badge variant="secondary">None</Badge>;
  }
  return (
    <div className="flex flex-col gap-1">
      <Badge variant="success" className="w-fit">
        Active
      </Badge>
      {user.expires_at && (
        <span className="text-xs text-muted-foreground">
          until {format(new Date(user.expires_at), "d MMM yyyy")}
        </span>
      )}
    </div>
  );
}

function RolesCell({ user }: { user: AdminUserRow }) {
  if (!user.is_admin && !user.is_editor) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {user.is_admin && <Badge variant="navy">Admin</Badge>}
      {user.is_editor && <Badge variant="accent">Editor</Badge>}
    </div>
  );
}

const AdminUsers = () => {
  const { user: currentUser } = useAuth();

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce the search term (~300ms) before it reaches the roster query.
  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isLoading, isError, refetch } = useAdminUsers(search);
  const rows = useMemo(() => data ?? [], [data]);

  const setAccess = useSetAccess();
  const setExpiry = useSetExpiry();
  const setRole = useSetRole();

  const anyPending = setAccess.isPending || setExpiry.isPending || setRole.isPending;

  // Set-expiry dialog state.
  const [expiryTarget, setExpiryTarget] = useState<AdminUserRow | null>(null);
  const [expiryDate, setExpiryDate] = useState("");

  const openExpiry = (u: AdminUserRow) => {
    setExpiryTarget(u);
    setExpiryDate(toDateInput(u.expires_at));
  };

  const submitExpiry = () => {
    if (!expiryTarget || !expiryDate) return;
    setExpiry.mutate(
      { userId: expiryTarget.user_id, expiresAt: new Date(expiryDate).toISOString() },
      { onSuccess: () => setExpiryTarget(null) },
    );
  };

  return (
    <div className="space-y-6">
      <SEO title="Users" description="Manage user accounts, subscriptions and roles." noindex />
      <PageHeader
        title="Users"
        subtitle="Manage accounts, subscription access and staff roles."
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Search users by email or business"
          placeholder="Search by email or business…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : isError ? (
        <ErrorState
          title="Couldn't load users"
          message="Something went wrong fetching the roster. Try again."
          onRetry={() => refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          variant={search ? "search" : "default"}
          title={search ? "No users match" : "No users yet"}
          description={
            search
              ? "Try a different email, name or business."
              : "Users will appear here once people sign up."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => {
                const active = subscriptionActive(u);
                const isSelf = currentUser?.id === u.user_id;
                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium text-ink-strong">
                      {u.email ?? "—"}
                    </TableCell>
                    <TableCell>{u.business_name ?? "—"}</TableCell>
                    <TableCell>{u.country ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(u.created_at), "d MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <SubscriptionCell user={u} />
                    </TableCell>
                    <TableCell>
                      <RolesCell user={u} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${u.email ?? "user"}`}
                            disabled={anyPending}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Subscription</DropdownMenuLabel>
                          {active ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                setAccess.mutate({ userId: u.user_id, grant: false })
                              }
                            >
                              <ShieldOff className="h-4 w-4" /> Revoke access
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                setAccess.mutate({ userId: u.user_id, grant: true })
                              }
                            >
                              <ShieldCheck className="h-4 w-4" /> Grant access (1 year)
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => openExpiry(u)}>
                            <CalendarClock className="h-4 w-4" /> Set expiry…
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Roles</DropdownMenuLabel>
                          {u.is_admin ? (
                            <DropdownMenuItem
                              disabled={isSelf}
                              onSelect={() =>
                                setRole.mutate({ userId: u.user_id, role: "admin", add: false })
                              }
                            >
                              <KeyRound className="h-4 w-4" />
                              {isSelf ? "Can't remove own admin" : "Remove admin"}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                setRole.mutate({ userId: u.user_id, role: "admin", add: true })
                              }
                            >
                              <KeyRound className="h-4 w-4" /> Make admin
                            </DropdownMenuItem>
                          )}
                          {u.is_editor ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                setRole.mutate({ userId: u.user_id, role: "editor", add: false })
                              }
                            >
                              <KeySquare className="h-4 w-4" /> Remove editor
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                setRole.mutate({ userId: u.user_id, role: "editor", add: true })
                              }
                            >
                              <UserCog className="h-4 w-4" /> Make editor
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!expiryTarget} onOpenChange={(o) => !o && setExpiryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set subscription expiry</DialogTitle>
            <DialogDescription>
              {expiryTarget?.email
                ? `Choose when access ends for ${expiryTarget.email}.`
                : "Choose when access ends."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="expiry-date">Expiry date</Label>
            <Input
              id="expiry-date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitExpiry} disabled={!expiryDate || setExpiry.isPending}>
              {setExpiry.isPending ? "Saving…" : "Save expiry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
