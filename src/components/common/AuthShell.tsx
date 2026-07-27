import { ReactNode } from "react";
import { Illustration, type IllustrationName } from "@/components/common/Illustration";

interface AuthShellProps {
  children: ReactNode;
  /** Brand illustration for the navy panel (hidden below lg). */
  illustration?: IllustrationName;
}

/**
 * Shared two-panel shell for /auth, /auth/forgot, /auth/reset.
 * Left: navy hero panel (desktop only). Right: white, centered form column.
 * Renders inside SiteLayout's <main>, so it uses <div>, never a nested <main>.
 */
export function AuthShell({ children, illustration = "first-run" }: AuthShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside
        className="hidden flex-col justify-between p-12 text-white lg:flex lg:w-1/2"
        style={{
          backgroundImage:
            "linear-gradient(160deg, #12263A 0%, #1B2A4A 55%, #0D1B2E 100%)",
        }}
      >
        <p className="font-display text-2xl font-bold text-white">
          Cresciva<span className="text-primary">.</span>
        </p>
        <div className="max-w-md">
          <Illustration name={illustration} className="mb-8 h-44 w-auto text-white" />
          <p className="font-display text-2xl font-semibold leading-snug text-white">
            One credible profile. Real funding leads. No hype.
          </p>
        </div>
        <p className="text-sm text-white/60">
          Trusted by founders building across Africa.
        </p>
      </aside>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

export default AuthShell;
