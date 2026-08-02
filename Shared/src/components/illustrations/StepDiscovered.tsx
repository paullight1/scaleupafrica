/** A profile card surfacing in search results — step two, get discovered. */
const StepDiscovered = ({ className }: { className?: string }) => (
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
    <rect x="30" y="26" width="150" height="20" rx="10" fill="hsl(var(--surface-muted))" />
    <rect x="30" y="26" width="150" height="20" rx="10" />
    <circle cx="46" cy="36" r="5" />
    <path d="M50 40 l7 7" />
    <path d="M66 36 h60" />
    <rect x="30" y="62" width="150" height="40" rx="6" fill="hsl(var(--primary))" opacity="0.14" stroke="none" />
    <rect x="30" y="62" width="150" height="40" rx="6" />
    <rect x="42" y="72" width="20" height="20" rx="5" fill="hsl(var(--primary))" stroke="none" />
    <path d="M74 76 h72 M74 90 h44" />
    <rect x="30" y="116" width="150" height="40" rx="6" fill="hsl(var(--surface-muted))" />
    <rect x="30" y="116" width="150" height="40" rx="6" />
    <rect x="42" y="126" width="20" height="20" rx="5" />
    <path d="M74 130 h60 M74 144 h36" />
    <circle cx="196" cy="82" r="18" fill="hsl(var(--surface-muted))" />
    <circle cx="196" cy="82" r="18" />
    <path d="M189 82 l5 6 l10 -13" />
  </svg>
);

export default StepDiscovered;
