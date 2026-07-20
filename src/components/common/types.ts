/** Shared action spec used by common primitives (EmptyState, ErrorState, …). */
export type ActionSpec = {
  label: string;
  /** When set, the action renders a router <Link> via Button asChild. */
  to?: string;
  /** When set (and no `to`), the action renders a plain Button. */
  onClick?: () => void;
};
