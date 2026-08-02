import { cn } from "@shared/lib/utils";
import { illustrationRegistry, type IllustrationName } from "@shared/components/illustrations";

export type { IllustrationName };

interface IllustrationProps {
  name: IllustrationName;
  /** Size via h-* w-auto. */
  className?: string;
  /** If set, the graphic is meaningful: role="img" + accessible name. Else decorative. */
  title?: string;
  /**
   * "auto" follows the app theme (navy on light, white in dark mode).
   * "dark" forces white strokes — required inside a `--mk-*` marketing band,
   * which is dark even while the app theme is light.
   */
  tone?: "auto" | "dark";
}

/**
 * Wrapper for the brand SVG illustration set. Strokes theme automatically:
 * the container sets `currentColor` to navy (light) / white (dark).
 */
export function Illustration({ name, className, title, tone = "auto" }: IllustrationProps) {
  const Svg = illustrationRegistry[name];
  if (!Svg) return null;

  return (
    <div
      className={cn(tone === "dark" ? "text-white" : "text-navy dark:text-white", className)}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <Svg className="h-full w-full" />
    </div>
  );
}

export default Illustration;
