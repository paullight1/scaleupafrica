/**
 * Rocket over an arc — the closing CTA.
 *
 * THE ONE DARK-SURFACE ILLUSTRATION. It sits on `--mk-canvas`, where
 * `--surface-muted` would read as near-white, so its fills use `--mk-raised`.
 * Always render it through `<Illustration tone="dark" />`.
 */
const CtaLaunch = ({ className }: { className?: string }) => (
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
    <path d="M20 148 C64 148 92 120 120 84 C148 48 176 26 220 26" opacity="0.45" strokeDasharray="6 8" />
    <path
      d="M120 26 c20 16 30 40 30 62 l-14 16 h-32 l-14 -16 c0 -22 10 -46 30 -62 z"
      fill="hsl(var(--mk-raised))"
    />
    <path d="M120 26 c20 16 30 40 30 62 l-14 16 h-32 l-14 -16 c0 -22 10 -46 30 -62 z" />
    <circle cx="120" cy="70" r="11" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <circle cx="120" cy="70" r="11" />
    <path d="M90 90 l-20 22 l24 -4 z" fill="hsl(var(--mk-raised))" />
    <path d="M90 90 l-20 22 l24 -4 z" />
    <path d="M150 90 l20 22 l-24 -4 z" fill="hsl(var(--mk-raised))" />
    <path d="M150 90 l20 22 l-24 -4 z" />
    <path d="M110 118 c4 12 6 20 10 28 c4 -8 6 -16 10 -28" fill="hsl(var(--primary))" stroke="none" />
    <path d="M110 118 c4 12 6 20 10 28 c4 -8 6 -16 10 -28" />
    <circle cx="42" cy="46" r="3" fill="currentColor" stroke="none" opacity="0.6" />
    <circle cx="196" cy="126" r="3" fill="currentColor" stroke="none" opacity="0.6" />
    <circle cx="64" cy="96" r="2" fill="currentColor" stroke="none" opacity="0.5" />
  </svg>
);

export default CtaLaunch;
