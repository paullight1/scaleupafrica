import { cn } from "@/lib/utils";
import { illustrationRegistry, type IllustrationName } from "@/components/illustrations";

export type { IllustrationName };

interface IllustrationProps {
  name: IllustrationName;
  /** Size via h-* w-auto. */
  className?: string;
  /** If set, the graphic is meaningful: role="img" + accessible name. Else decorative. */
  title?: string;
}

/**
 * Wrapper for the brand SVG illustration set. Strokes theme automatically:
 * the container sets `currentColor` to navy (light) / white (dark).
 */
export function Illustration({ name, className, title }: IllustrationProps) {
  const Svg = illustrationRegistry[name];
  if (!Svg) return null;

  return (
    <div
      className={cn("text-navy dark:text-white", className)}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <Svg className="h-full w-full" />
    </div>
  );
}

export default Illustration;
