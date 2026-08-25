import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@shared/components/common/ErrorBoundary";
import { DashboardSkeleton } from "@shared/components/common/LoadingState";
import { useAuth } from "@shared/hooks/useAuth";
import { useRole } from "@shared/hooks/useRole";
import { siteUrl } from "@shared/lib/crossApp";
import { Button } from "@shared/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@shared/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  Landmark,
  Building2,
  Users,
  Inbox,
  Mail,
  CreditCard,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  ExternalLink,
  Search,
  ChevronDown,
  UserRound,
} from "lucide-react";

type NavItem = { label: string; to: string; icon: typeof LayoutDashboard; end?: boolean; adminOnly?: boolean };
type NavGroup = { heading: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { heading: "Overview", items: [{ label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true, adminOnly: true }] },
  {
    heading: "Content",
    items: [
      { label: "Resources", to: "/admin/resources", icon: FileText },
      { label: "Blog", to: "/admin/blog", icon: Newspaper },
      { label: "Funding", to: "/admin/funding", icon: Landmark, adminOnly: true },
    ],
  },
  {
    heading: "Community",
    items: [
      { label: "Directory Profiles", to: "/admin/profiles", icon: Building2, adminOnly: true },
      { label: "Users", to: "/admin/users", icon: Users, adminOnly: true },
    ],
  },
  {
    heading: "Growth",
    items: [
      { label: "Inbox", to: "/admin/leads", icon: Inbox, adminOnly: true },
      { label: "Newsletter", to: "/admin/newsletter", icon: Mail, adminOnly: true },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Payments", to: "/admin/payments", icon: CreditCard, adminOnly: true },
      { label: "Settings", to: "/admin/settings", icon: Settings, adminOnly: true },
      { label: "Audit Log", to: "/admin/audit", icon: ScrollText, adminOnly: true },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useRole();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleGroups = NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        (!item.adminOnly || isAdmin) &&
        (!normalizedQuery || item.label.toLocaleLowerCase().includes(normalizedQuery)),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="flex h-full flex-col overflow-y-auto px-4 pb-4" aria-label="Admin navigation">
      <div className="sticky top-0 z-10 bg-sidebar pb-5 pt-1">
        <label className="relative block">
          <span className="sr-only">Search navigation</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/45" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search menu"
            aria-label="Search navigation"
            className="h-10 w-full rounded-xl border border-sidebar-border bg-white/5 pl-9 pr-3 text-sm text-sidebar-foreground outline-none transition placeholder:text-sidebar-foreground/35 focus:border-primary/60 focus:bg-white/10 focus:ring-2 focus:ring-primary/15"
          />
        </label>
      </div>

      <div className="flex flex-col gap-5">
        {visibleGroups.map((group) => (
          <div key={group.heading}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">{group.heading}</p>
            <ul className="space-y-1">
              {group.items.map((it) => (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.end}
                    onClick={onNavigate}
                    className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"}`}
                  >
                    <it.icon className="h-4 w-4 shrink-0" />{it.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {visibleGroups.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-sidebar-foreground/50">No menu items found.</p>
        )}
      </div>
    </nav>
  );
}

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useRole();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const fullName = typeof user?.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name.trim()
    : "";
  const profileName = fullName || "Administrator";
  const initials = fullName
    ? fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : (user?.email?.[0] ?? "A").toUpperCase();

  const handleSignOut = async () => { await signOut(); window.location.assign(siteUrl("/")); };

  return (
    <div className="admin-studio min-h-screen bg-secondary">
      <aside className="studio-sidebar fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Link to="/admin" className="flex items-center gap-2 px-6 pb-4 pt-5"><span className="font-display text-lg font-bold text-sidebar-foreground">Cresciva <span className="text-primary">Admin</span></span></Link>
        <div className="flex-1 overflow-hidden"><SidebarContent /></div>
        <div className="border-t border-sidebar-border p-4">
          <a href={siteUrl("/")} className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"><ExternalLink className="h-4 w-4" /> View site</a>
          <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/85 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden"><Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="studio-sidebar w-64 border-sidebar-border bg-sidebar p-0"><div className="px-6 py-5"><span className="font-display text-lg font-bold text-sidebar-foreground">Cresciva <span className="text-primary">Admin</span></span></div><SidebarContent onNavigate={() => setMobileOpen(false)} /></SheetContent>
            </Sheet>
            <span className="text-sm font-medium text-muted-foreground">{isAdmin ? "Admin workspace" : "Editor workspace"}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Open profile menu for ${profileName}`}
                className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy font-display text-xs font-bold text-white shadow-soft">
                  {initials}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-40 truncate text-sm font-semibold text-ink-strong">{profileName}</span>
                  <span className="block max-w-40 truncate text-xs text-muted-foreground">{isAdmin ? "Administrator" : "Editor"}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 sm:block" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <span className="block font-semibold text-ink-strong">{profileName}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/admin/settings"><UserRound className="h-4 w-4" />Profile settings</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><a href={siteUrl("/")}><ExternalLink className="h-4 w-4" />View site</a></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut} className="text-destructive-strong focus:text-destructive-strong"><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="studio-canvas p-4 lg:p-8 xl:px-10">
          <Suspense fallback={<DashboardSkeleton />}>
            <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
