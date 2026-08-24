import { NavLink, Outlet } from "react-router-dom";
import { SEO } from "@shared/components/common/SEO";
import { PageHeader } from "@shared/components/common/PageHeader";

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
      <PageHeader
        title="Funding"
        subtitle="Manage opportunities, source reliability, member reports and funding intelligence from one workspace."
      />

      <nav
        aria-label="Funding sections"
        className="mb-8 mt-6 flex gap-1 overflow-x-auto border-b border-border"
      >
        {FUNDING_SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            end={section.end}
            className={({ isActive }) =>
              `shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
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
