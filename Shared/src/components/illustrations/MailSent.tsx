/** Envelope with a check — email-confirm / newsletter success. */
const MailSent = ({ className }: { className?: string }) => (
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
    <rect x="52" y="52" width="136" height="92" rx="8" fill="hsl(var(--surface-muted))" />
    <rect x="52" y="52" width="136" height="92" rx="8" />
    <path d="M52 62 L120 104 L188 62" />
    <circle cx="176" cy="52" r="20" fill="hsl(var(--primary))" stroke="none" />
    <path d="M167 52 l6 7 l12 -14" stroke="hsl(var(--primary-foreground))" strokeWidth={2.5} />
  </svg>
);

export default MailSent;
