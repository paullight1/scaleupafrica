/** Storefront outline — directory zero-state. Strokes use currentColor (navy/white). */
const EmptyDirectory = ({ className }: { className?: string }) => (
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
    <rect x="48" y="70" width="144" height="86" rx="4" fill="hsl(var(--surface-muted))" />
    <path d="M40 70 L52 44 H188 L200 70" />
    <path d="M40 70 h160" />
    <path d="M40 70 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0" fill="hsl(var(--primary))" stroke="none" opacity="0.9" />
    <path d="M40 70 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0 a12 12 0 0 0 24 0" />
    <rect x="70" y="104" width="44" height="52" rx="3" />
    <rect x="132" y="104" width="42" height="30" rx="3" />
    <circle cx="106" cy="130" r="2.5" />
  </svg>
);

export default EmptyDirectory;
