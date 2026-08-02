/** A signpost pointing outward — what Cresciva does. */
const ReassuranceDoes = ({ className }: { className?: string }) => (
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
    <path d="M118 26 v134" />
    <path d="M96 152 h44" />
    <path d="M40 44 h74 v26 h-74 l-14 -13 z" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <path d="M40 44 h74 v26 h-74 l-14 -13 z" />
    <path d="M122 84 h74 l14 13 l-14 13 h-74 z" fill="hsl(var(--surface-muted))" />
    <path d="M122 84 h74 l14 13 l-14 13 h-74 z" />
    <path d="M56 118 h58 v24 h-58 l-14 -12 z" fill="hsl(var(--surface-muted))" />
    <path d="M56 118 h58 v24 h-58 l-14 -12 z" />
    <path d="M138 92 l6 8 l14 -16" />
  </svg>
);

export default ReassuranceDoes;
