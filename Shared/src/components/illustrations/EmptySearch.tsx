/** Magnifier over an empty list — no-results state. */
const EmptySearch = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 240 180"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="46" y="40" width="104" height="104" rx="6" fill="hsl(var(--surface-muted))" />
    <line x1="62" y1="62" x2="118" y2="62" />
    <line x1="62" y1="80" x2="104" y2="80" />
    <line x1="62" y1="98" x2="118" y2="98" />
    <line x1="62" y1="116" x2="96" y2="116" />
    <circle cx="158" cy="100" r="30" fill="hsl(var(--background))" />
    <circle cx="158" cy="100" r="30" stroke="hsl(var(--primary))" strokeWidth={2} />
    <line x1="180" y1="122" x2="200" y2="142" stroke="hsl(var(--primary))" strokeWidth={2.5} />
    <line x1="148" y1="100" x2="168" y2="100" />
  </svg>
);

export default EmptySearch;
