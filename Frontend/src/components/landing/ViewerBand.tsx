import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Illustration } from "@shared/components/common/Illustration";
import { useViewerState, VIEWER_CTA } from "@/hooks/useViewerState";

/**
 * A nudge for the one viewer with unfinished business: signed in, no listing.
 * Every other state — including a failed subscription read, which resolves to
 * "anonymous" — renders nothing.
 */
const ViewerBand = () => {
  const viewer = useViewerState();
  if (viewer !== "no-profile") return null;

  const { primary } = VIEWER_CTA["no-profile"];

  return (
    <div className="bg-surface-subtle">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-8 sm:flex-row lg:px-8">
        <Illustration name="profile-incomplete" className="h-20 shrink-0" />
        <div className="flex-1 text-center sm:text-left">
          <p className="font-display text-lg font-semibold text-ink-strong">
            Your listing isn't live yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Finish your profile and become discoverable to buyers and partners across the
            continent. It takes a few minutes.
          </p>
        </div>
        <Button asChild variant="default" size="lg" className="shrink-0">
          <Link to={primary.to!}>
            {primary.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ViewerBand;
