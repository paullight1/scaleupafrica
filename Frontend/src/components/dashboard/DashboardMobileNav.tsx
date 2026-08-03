import { NavLink } from "react-router-dom";
import { cn } from "@shared/lib/utils";
import { DASHBOARD_NAV } from "./navItems";

/**
 * Fixed bottom tab bar for < md. Each target is ≥ 44px. Safe-area padded so it
 * clears the Android/iOS home indicator. The layout's content column gets
 * pb-20 so nothing hides behind it.
 */
export function DashboardMobileNav({ newCount = 0 }: { newCount?: number }) {
  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {DASHBOARD_NAV.map((item) => {
          const Icon = item.icon;
          const showDot = !!item.badge && newCount > 0;
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    isActive ? "text-ink-strong" : "text-muted-foreground",
                  )
                }
              >
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {showDot && (
                    <span
                      className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card"
                      aria-label={`${newCount} new this week`}
                    />
                  )}
                </span>
                {item.shortLabel}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default DashboardMobileNav;
