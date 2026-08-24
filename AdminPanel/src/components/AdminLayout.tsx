import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@shared/components/common/ErrorBoundary";
import { useAuth } from "@shared/hooks/useAuth";
import { useRole } from "@shared/hooks/useRole";
import { siteUrl } from "@shared/lib/crossApp";
import { Button } from "@shared/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@shared/components/ui/sheet";
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  Landmark,
  Radar,
  Flag,
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
      { label: "Funding", to: "/admin/funding", icon: Landmark, end: true, adminOnly: true },
      { label: "Funding source health", to: "/admin/funding/sources", icon: Radar, adminOnly: true },
      { label: "Funding reports", to: "/admin/funding/reports", icon: Flag, adminOnly: true },
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
      { label: "Leads", to: "/admin/leads", icon: Inbox, adminOnly: true },
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
  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      {NAV.map((group) => {
        const items = group.items.filter((it) => !it.adminOnly || isAdmin);
        if (items.length === 0) return null;
        return (
          <div key={group.heading}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">{group.heading}</p>
            <ul className="space-y-1">
              {items.map((it) => (
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
        );
      })}
    </nav>
  );
}

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useRole();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); window.location.assign(siteUrl("/")); };

  return (
    <div className="min-h-screen bg-secondary">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Link to="/admin" className="flex items-center gap-2 px-6 py-5"><span className="font-display text-lg font-bold text-sidebar-foreground">Cresciva <span className="text-primary">Admin</span></span></Link>
        <div className="flex-1 overflow-hidden"><SidebarContent /></div>
        <div className="border-t border-sidebar-border p-4">
          <a href={siteUrl("/")} className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"><ExternalLink className="h-4 w-4" /> View site</a>
          <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden"><Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0"><div className="px-6 py-5"><span className="font-display text-lg font-bold text-sidebar-foreground">Cresciva <span className="text-primary">Admin</span></span></div><SidebarContent onNavigate={() => setMobileOpen(false)} /></SheetContent>
            </Sheet>
            <span className="text-sm font-medium text-muted-foreground">{isAdmin ? "Administrator" : "Editor"}</span>
          </div>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span><Button variant="ghost" size="sm" onClick={handleSignOut} className="lg:hidden"><LogOut className="h-4 w-4" /></Button></div>
        </header>
        <main className="p-4 lg:p-8"><ErrorBoundary key={pathname}><Outlet /></ErrorBoundary></main>
      </div>
    </div>
  );
};

export default AdminLayout;
