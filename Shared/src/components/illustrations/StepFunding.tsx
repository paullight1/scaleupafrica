/** A radar sweep picking up funding calls — step three. */
const StepFunding = ({ className }: { className?: string }) => (
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
    <circle cx="110" cy="92" r="70" fill="hsl(var(--surface-muted))" />
    <circle cx="110" cy="92" r="70" />
    <circle cx="110" cy="92" r="46" />
    <circle cx="110" cy="92" r="22" />
    <path d="M110 92 L110 22 A70 70 0 0 1 172 58 Z" fill="hsl(var(--primary))" opacity="0.2" stroke="none" />
    <path d="M110 92 L110 22" />
    <path d="M110 92 L172 58" />
    <circle cx="142" cy="52" r="5" fill="hsl(var(--primary))" stroke="none" />
    <circle cx="142" cy="52" r="5" />
    <circle cx="82" cy="126" r="4" />
    <circle cx="150" cy="118" r="4" />
    <circle cx="66" cy="66" r="4" />
    <rect x="186" y="60" width="42" height="14" rx="7" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <rect x="186" y="60" width="42" height="14" rx="7" />
    <rect x="186" y="88" width="42" height="14" rx="7" fill="hsl(var(--surface-muted))" />
    <rect x="186" y="88" width="42" height="14" rx="7" />
  </svg>
);

export default StepFunding;
