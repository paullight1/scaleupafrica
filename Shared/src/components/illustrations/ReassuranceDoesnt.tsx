/** A closed boundary line — what Cresciva doesn't do. Neutral, never alarming. */
const ReassuranceDoesnt = ({ className }: { className?: string }) => (
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
    <rect x="36" y="40" width="168" height="100" rx="10" fill="hsl(var(--surface-muted))" />
    <rect x="36" y="40" width="168" height="100" rx="10" strokeDasharray="8 8" />
    <path d="M64 74 h50 M64 94 h34" />
    <path d="M136 66 h44 M136 86 h30 M136 106 h38" opacity="0.55" />
    <circle cx="56" cy="74" r="3" fill="currentColor" stroke="none" />
    <circle cx="56" cy="94" r="3" fill="currentColor" stroke="none" />
    <circle cx="128" cy="66" r="3" fill="currentColor" stroke="none" opacity="0.55" />
    <circle cx="128" cy="86" r="3" fill="currentColor" stroke="none" opacity="0.55" />
    <circle cx="128" cy="106" r="3" fill="currentColor" stroke="none" opacity="0.55" />
    <path d="M120 32 v116" strokeDasharray="5 7" />
  </svg>
);

export default ReassuranceDoesnt;
