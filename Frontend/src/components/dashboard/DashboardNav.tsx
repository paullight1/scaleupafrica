import { NavLink } from "react-router-dom";
import { cn } from "@shared/lib/utils";
import { DASHBOARD_NAV } from "./navItems";

/**
 * Left section-nav for the dashboard (md+). Sits beneath the global AppHeader
 * (from SiteLayout) — HubSpot-style. Mobile uses <DashboardMobileNav> instead.
 */
export function DashboardNav({ newCount = 0 }: { newCount?: number }) {
  return (
    <aside className="hidden md:block">
      <nav aria-label="Dashboard sections" className="sticky top-24 space-y-1">
        {DASHBOARD_NAV.map((item) => {
          const Icon = item.icon;
          const showDot = !!item.badge && newCount > 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary/10 text-ink-strong font-semibold"
                    : "text-foreground hover:bg-secondary",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-5 w-0.5 rounded-full",
                      isActive ? "bg-primary" : "bg-transparent",
                    )}
                  />
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {showDot && (
                    <span
                      className="h-2 w-2 rounded-full bg-primary"
                      aria-label={`${newCount} new this week`}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default DashboardNav;
