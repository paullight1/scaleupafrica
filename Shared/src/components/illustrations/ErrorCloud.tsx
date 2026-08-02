/** Unplugged cable — generic error / connection-lost state. */
const ErrorCloud = ({ className }: { className?: string }) => (
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
    <rect x="40" y="60" width="160" height="60" rx="10" fill="hsl(var(--surface-muted))" />
    <path d="M40 84 h30" />
    <path d="M170 84 h30" />
    <path d="M70 84 c8 -18 20 -18 28 0 M170 84 c-8 18 -20 18 -28 0" stroke="hsl(var(--primary))" strokeWidth={2} />
    <path d="M98 84 l-10 6 l6 4 l-8 8" stroke="hsl(var(--primary))" strokeWidth={2} />
    <path d="M142 84 l10 -6 l-6 -4 l8 -8" stroke="hsl(var(--primary))" strokeWidth={2} />
    <path d="M118 40 v10 M132 46 l-6 8 M104 46 l6 8" opacity="0.6" />
  </svg>
);

export default ErrorCloud;
