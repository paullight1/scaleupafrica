/** An empty article shelf — no posts published yet. */
const EmptyInsights = ({ className }: { className?: string }) => (
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
    <rect x="34" y="34" width="60" height="76" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="34" y="34" width="60" height="76" rx="5" strokeDasharray="7 7" />
    <rect x="90" y="34" width="60" height="76" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="90" y="34" width="60" height="76" rx="5" strokeDasharray="7 7" />
    <rect x="146" y="34" width="60" height="76" rx="5" fill="hsl(var(--surface-muted))" />
    <rect x="146" y="34" width="60" height="76" rx="5" strokeDasharray="7 7" />
    <path d="M26 124 h188" />
    <path d="M26 124 v10 M214 124 v10" />
    <circle cx="120" cy="72" r="19" fill="hsl(var(--primary))" opacity="0.14" stroke="none" />
    <circle cx="120" cy="72" r="19" />
    <path d="M112 72 h16" />
    <path d="M62 152 h116" opacity="0.4" strokeDasharray="4 8" />
  </svg>
);

export default EmptyInsights;
