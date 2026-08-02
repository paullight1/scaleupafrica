/** Signpost — 404 not-found page. */
const NotFound404 = ({ className }: { className?: string }) => (
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
    <path d="M60 158 h120" stroke="hsl(var(--surface-muted))" strokeWidth={8} />
    <path d="M60 158 h120" />
    <line x1="120" y1="40" x2="120" y2="152" />
    <path d="M116 56 H72 L58 68 L72 80 H116 Z" fill="hsl(var(--surface-muted))" />
    <path d="M116 56 H72 L58 68 L72 80 H116 Z" />
    <path d="M124 92 H176 L190 104 L176 116 H124 Z" fill="hsl(var(--primary))" stroke="none" />
    <path d="M124 92 H176 L190 104 L176 116 H124 Z" />
    <circle cx="120" cy="36" r="4" fill="currentColor" stroke="none" />
  </svg>
);

export default NotFound404;
