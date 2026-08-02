import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@shared/lib/utils";
import { Button } from "@shared/components/ui/button";
import { Illustration, type IllustrationName } from "@shared/components/common/Illustration";
import type { ActionSpec } from "@shared/components/common/types";

interface CTABandProps {
  illustration?: IllustrationName;
  title: string;
  lead?: string;
  primary: ActionSpec;
  secondary?: ActionSpec;
  /** Slot beneath the actions — the homepage puts the newsletter form here. */
  children?: ReactNode;
  className?: string;
}

function Action({ spec, variant }: { spec: ActionSpec; variant: "hero" | "onDark" }) {
  if (spec.to) {
    return (
      <Button asChild variant={variant} size="lg">
        <Link to={spec.to}>{spec.label}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} size="lg" onClick={spec.onClick}>
      {spec.label}
    </Button>
  );
}

/** The page's single dark band. Uses `--mk-*`, which is dark in both themes. */
export function CTABand({
  illustration,
  title,
  lead,
  primary,
  secondary,
  children,
  className,
}: CTABandProps) {
  return (
    <div
      className={cn(
        "grid items-center gap-10 rounded-2xl border border-mk-border bg-mk-surface p-8 md:p-12 lg:grid-cols-[1.2fr_1fr]",
        className,
      )}
    >
      <div>
        <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">
          {title}
        </h2>
        {lead && <p className="mt-4 max-w-xl text-lg leading-relaxed text-mk-ink-muted">{lead}</p>}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Action spec={primary} variant="hero" />
          {secondary && <Action spec={secondary} variant="onDark" />}
        </div>

        {children && <div className="mt-8 max-w-sm">{children}</div>}
      </div>

      {illustration && (
        <Illustration
          name={illustration}
          tone="dark"
          className="mx-auto h-40 w-full max-w-xs md:h-56"
        />
      )}
    </div>
  );
}

export default CTABand;
