import { OpportunityRow } from "./OpportunityRow";
import { useSavedMap } from "./useSavedMap";

/**
 * Pillar A "Saved by you". Kept calm per plan 03 §4: empty is a one-line hint,
 * not a full EmptyState. Errors are surfaced by the parent page, not here.
 */
export function SavedOpportunities() {
  const { query, toggle, pending } = useSavedMap();
  const saved = query.data ?? [];

  return (
    <section aria-labelledby="saved-heading" className="space-y-4">
      <h2 id="saved-heading" className="font-display text-xl font-semibold text-ink-strong">
        Saved by you
      </h2>

      {saved.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing saved yet. Tap the bookmark on any opportunity.
        </p>
      ) : (
        <div className="space-y-3">
          {saved
            .filter((s) => s.funding_opportunities)
            .map((s) => (
              <OpportunityRow
                key={s.id}
                opportunity={s.funding_opportunities!}
                saved
                onToggleSave={() => toggle(s.opportunity_id)}
                savePending={pending}
              />
            ))}
        </div>
      )}
    </section>
  );
}

export default SavedOpportunities;
