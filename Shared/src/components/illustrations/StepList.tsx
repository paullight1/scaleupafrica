/** A form being filled in — step one, list your business. */
const StepList = ({ className }: { className?: string }) => (
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
    <rect x="52" y="22" width="136" height="140" rx="8" fill="hsl(var(--surface-muted))" />
    <rect x="52" y="22" width="136" height="140" rx="8" />
    <path d="M74 46 h44" />
    <rect x="74" y="60" width="92" height="14" rx="4" fill="hsl(var(--background))" />
    <rect x="74" y="60" width="92" height="14" rx="4" />
    <path d="M74 92 h30" />
    <rect x="74" y="102" width="92" height="14" rx="4" fill="hsl(var(--background))" />
    <rect x="74" y="102" width="92" height="14" rx="4" />
    <rect x="74" y="130" width="56" height="18" rx="6" fill="hsl(var(--primary))" stroke="none" />
    <rect x="74" y="130" width="56" height="18" rx="6" />
    <path d="M166 116 l24 -26 l14 13 l-24 26 l-18 4 z" fill="hsl(var(--primary))" opacity="0.15" />
    <path d="M166 116 l24 -26 l14 13 l-24 26 l-18 4 z" />
    <path d="M186 96 l14 13" />
  </svg>
);

export default StepList;
