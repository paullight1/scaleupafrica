/** Radar sweep — funding-radar zero-state. */
const EmptyFunding = ({ className }: { className?: string }) => (
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
    <circle cx="120" cy="92" r="66" fill="hsl(var(--surface-muted))" />
    <circle cx="120" cy="92" r="66" />
    <circle cx="120" cy="92" r="44" />
    <circle cx="120" cy="92" r="22" />
    <line x1="54" y1="92" x2="186" y2="92" />
    <line x1="120" y1="26" x2="120" y2="158" />
    <path d="M120 92 L120 32 A60 60 0 0 1 172 62 Z" fill="hsl(var(--primary))" stroke="none" opacity="0.85" />
    <circle cx="150" cy="66" r="4" fill="hsl(var(--primary))" stroke="none" />
    <circle cx="120" cy="92" r="4" fill="currentColor" stroke="none" />
  </svg>
);

export default EmptyFunding;
