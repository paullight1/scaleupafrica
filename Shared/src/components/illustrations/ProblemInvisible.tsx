/** A shop hidden behind a dashed veil — nobody can find you. */
const ProblemInvisible = ({ className }: { className?: string }) => (
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
    <rect x="64" y="66" width="112" height="82" rx="4" fill="hsl(var(--surface-muted))" />
    <path d="M56 66 L68 42 H172 L184 66" />
    <path d="M56 66 h128" />
    <rect x="64" y="66" width="112" height="82" rx="4" />
    <rect x="88" y="98" width="36" height="50" rx="3" />
    <rect x="136" y="98" width="26" height="26" rx="3" />
    <path d="M28 34 v112" strokeDasharray="7 9" opacity="0.7" />
    <path d="M212 34 v112" strokeDasharray="7 9" opacity="0.7" />
    <circle cx="196" cy="46" r="17" fill="hsl(var(--primary))" opacity="0.15" stroke="none" />
    <circle cx="196" cy="46" r="17" />
    <path d="M208 58 l14 14" />
    <path d="M188 46 h16" />
  </svg>
);

export default ProblemInvisible;
