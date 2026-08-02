/** A half-filled profile card — the signed-in-without-a-listing nudge. */
const ProfileIncomplete = ({ className }: { className?: string }) => (
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
    <rect x="40" y="30" width="160" height="120" rx="8" fill="hsl(var(--surface-muted))" />
    <rect x="40" y="30" width="160" height="120" rx="8" />
    <circle cx="76" cy="66" r="16" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <circle cx="76" cy="66" r="16" />
    <path d="M70 64 a6 6 0 1 1 12 0 a6 6 0 1 1 -12 0" />
    <path d="M66 78 c3 -6 17 -6 20 0" />
    <path d="M104 58 h64 M104 72 h40" />
    <rect x="64" y="100" width="112" height="9" rx="4.5" fill="hsl(var(--background))" />
    <rect x="64" y="100" width="112" height="9" rx="4.5" />
    <rect x="64" y="100" width="62" height="9" rx="4.5" fill="hsl(var(--primary))" stroke="none" />
    <path d="M64 126 h50" strokeDasharray="6 7" />
    <path d="M126 126 h50" strokeDasharray="6 7" opacity="0.5" />
  </svg>
);

export default ProfileIncomplete;
