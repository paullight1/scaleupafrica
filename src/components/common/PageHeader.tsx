import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned actions (buttons). */
  actions?: React.ReactNode;
  /** Slot rendered above the title (e.g. breadcrumb). */
  breadcrumb?: React.ReactNode;
  /** true on navy page headers (Directory/Funding): white text. */
  onDark?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  onDark = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
        <h1
          className={cn(
            "font-display text-3xl font-bold md:text-4xl",
            onDark ? "text-white" : "text-ink-strong",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              "mt-2 text-sm",
              onDark ? "text-white/80" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>
      )}
    </div>
  );
}

export default PageHeader;
