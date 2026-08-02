/** Funding calls strewn across disconnected cards — nothing joins up. */
const ProblemScattered = ({ className }: { className?: string }) => (
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
    <g transform="rotate(-7 53 48)">
      <rect x="20" y="26" width="66" height="44" rx="4" fill="hsl(var(--surface-muted))" />
      <rect x="20" y="26" width="66" height="44" rx="4" />
      <path d="M31 41 h34 M31 52 h24" />
    </g>
    <g transform="rotate(9 173 40)">
      <rect x="140" y="18" width="66" height="44" rx="4" fill="hsl(var(--surface-muted))" />
      <rect x="140" y="18" width="66" height="44" rx="4" />
      <path d="M151 33 h34 M151 44 h20" />
    </g>
    <g transform="rotate(6 67 134)">
      <rect x="34" y="112" width="66" height="44" rx="4" fill="hsl(var(--surface-muted))" />
      <rect x="34" y="112" width="66" height="44" rx="4" />
      <path d="M45 127 h34 M45 138 h26" />
    </g>
    <g transform="rotate(-5 179 126)">
      <rect x="146" y="104" width="66" height="44" rx="4" fill="hsl(var(--primary))" opacity="0.14" stroke="none" />
      <rect x="146" y="104" width="66" height="44" rx="4" />
      <path d="M157 119 h34 M157 130 h18" />
    </g>
    <circle cx="120" cy="88" r="13" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <circle cx="120" cy="88" r="13" />
    <path d="M120 82 v7 M120 94 v0.5" />
  </svg>
);

export default ProblemScattered;
