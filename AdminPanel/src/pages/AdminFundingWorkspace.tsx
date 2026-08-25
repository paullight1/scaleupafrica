import { NavLink, Outlet } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";

const FUNDING_SECTIONS = [
  { label: "Opportunities", to: "/admin/funding", end: true },
  { label: "Source Health", to: "/admin/funding/sources", end: false },
  { label: "Reports", to: "/admin/funding/reports", end: false },
  { label: "Funding Engine", to: "/admin/funding/engine", end: false },
] as const;

export default function AdminFundingWorkspace() {
  return (
    <div>
      <SEO title="Funding" noindex />
      <nav
        aria-label="Funding sections"
        className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-2 shadow-soft"
      >
        {FUNDING_SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            end={section.end}
            className={({ isActive }) =>
              `shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 font-semibold text-navy"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
