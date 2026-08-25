import { cn } from "@shared/lib/utils";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function StudioAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const classes = cn(
    "studio-avatar flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-sm font-semibold text-navy",
    className,
  );

  if (src) {
    return <img src={src} alt="" className={cn(classes, "object-cover")} />;
  }

  return (
    <span className={classes} aria-label={`${name} avatar`}>
      {initialsFor(name)}
    </span>
  );
}

export default StudioAvatar;
