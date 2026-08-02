/** A stack of cards behind a padlock — the honest members-only teaser. */
const LockedVault = ({ className }: { className?: string }) => (
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
    <rect x="46" y="30" width="148" height="30" rx="6" fill="hsl(var(--surface-muted))" opacity="0.5" />
    <rect x="46" y="30" width="148" height="30" rx="6" opacity="0.5" />
    <rect x="34" y="68" width="172" height="34" rx="6" fill="hsl(var(--surface-muted))" opacity="0.75" />
    <rect x="34" y="68" width="172" height="34" rx="6" opacity="0.75" />
    <path d="M50 85 h58" opacity="0.75" />
    <rect x="34" y="112" width="172" height="42" rx="6" fill="hsl(var(--surface-muted))" />
    <rect x="34" y="112" width="172" height="42" rx="6" />
    <path d="M50 128 h74 M50 142 h48" />
    <rect x="96" y="70" width="48" height="40" rx="7" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <rect x="96" y="70" width="48" height="40" rx="7" />
    <path d="M106 70 v-11 a14 14 0 0 1 28 0 v11" />
    <circle cx="120" cy="88" r="4" />
    <path d="M120 92 v7" />
  </svg>
);

export default LockedVault;
