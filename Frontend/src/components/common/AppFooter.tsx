import { Link } from "react-router-dom";
import NewsletterSignup from "@/components/NewsletterSignup";
import { adminUrl } from "@shared/lib/crossApp";
import { openCookieSettings } from "@shared/lib/consent";

const footerNav: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Directory", to: "/directory" },
      { label: "Funding", to: "/dashboard/funding" },
      { label: "List your business", to: "/dashboard/profile/edit" },
      { label: "Pricing", to: "/#pricing" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Resource Library", to: "/resources" },
      { label: "Blog", to: "/blog" },
      { label: "FAQ", to: "/faq" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Disclaimer", to: "/disclaimer" },
    ],
  },
];

/** Global footer with real legal links. Replaces landing/Footer.tsx. */
export function AppFooter() {
  return (
    <footer className="border-t border-white/10 bg-navy-dark text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <p className="font-display text-xl font-bold text-white">
              Cresciva<span className="text-primary">.</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-white/60">
              Visibility and funding intelligence for Pan-African SME founders. One credible
              profile. Real funding leads. No hype.
            </p>
          </div>

          {footerNav.map((col) => (
            <div key={col.heading}>
              <p className="mb-3 text-sm font-semibold text-white">{col.heading}</p>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="inline-block py-2.5 text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Stay in the loop</p>
              <NewsletterSignup source="footer" variant="inline" className="max-w-sm" />
            </div>
            <p className="flex items-center gap-3 text-sm text-white/70">
              <span>© {new Date().getFullYear()} Cresciva</span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <button type="button" onClick={openCookieSettings} className="transition-colors hover:text-white">
                Cookie settings
              </button>
              <span aria-hidden="true" className="text-white/30">·</span>
              {/* Always visible: /admin is the other bundle (real document nav),
                  and AdminGuard + RLS — not this link's visibility — gate access. */}
              <a href={adminUrl()} className="transition-colors hover:text-white">
                Admin
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default AppFooter;
