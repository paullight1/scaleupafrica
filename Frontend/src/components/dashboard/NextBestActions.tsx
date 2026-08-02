import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Action } from "@/lib/dashboard/types";

/**
 * Pillar D guidance. Numbered rows (not a card grid — anti-slop §1.4): orange
 * number circle, title, one-line why, chevron link. Renders up to 3.
 */
export function NextBestActions({ actions }: { actions: Action[] }) {
  const top = actions.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <section aria-labelledby="nba-heading" className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <h2 id="nba-heading" className="font-display text-lg font-semibold text-ink-strong">
        What to do next
      </h2>
      <ol className="mt-4 space-y-1">
        {top.map((action, i) => (
          <li key={action.key}>
            <Link
              to={action.href}
              className="group flex items-center gap-4 rounded-lg px-2 py-3 hover:bg-secondary"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-ink-strong"
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink-strong">{action.title}</span>
                <span className="block text-xs text-muted-foreground">{action.why}</span>
              </span>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default NextBestActions;
