/** An hourglass beside a stalled progress track — hours lost hunting. */
const ProblemTime = ({ className }: { className?: string }) => (
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
    <path d="M74 30 h64 M74 150 h64" />
    <path d="M82 30 v16 c0 16 24 26 24 44 c0 18 -24 28 -24 44 v16" fill="hsl(var(--surface-muted))" />
    <path d="M130 30 v16 c0 16 -24 26 -24 44 c0 18 24 28 24 44 v16" fill="hsl(var(--surface-muted))" />
    <path d="M92 132 c0 -10 28 -10 28 0 v14 h-28 z" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <path d="M106 90 v22" strokeDasharray="3 6" />
    <rect x="158" y="52" width="58" height="10" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="158" y="52" width="58" height="10" rx="5" />
    <rect x="158" y="52" width="20" height="10" rx="5" fill="hsl(var(--primary))" stroke="none" />
    <rect x="158" y="84" width="58" height="10" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="158" y="84" width="58" height="10" rx="5" />
    <rect x="158" y="84" width="12" height="10" rx="5" fill="hsl(var(--primary))" stroke="none" />
    <rect x="158" y="116" width="58" height="10" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="158" y="116" width="58" height="10" rx="5" />
  </svg>
);

export default ProblemTime;
