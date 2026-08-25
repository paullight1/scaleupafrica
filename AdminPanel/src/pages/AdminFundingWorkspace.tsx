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
      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-[4px_4px_0_rgb(20_33_61_/_0.1)] md:flex-row md:items-center md:justify-between">
        <div className="shrink-0">
          <p className="studio-section-label text-primary">Funding workspace</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">Funding</h1>
        </div>

        <nav
          aria-label="Funding sections"
          className="flex gap-2 overflow-x-auto pb-1 md:pb-0"
        >
          {FUNDING_SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              end={section.end}
              className={({ isActive }) =>
                `shrink-0 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
