/** Flag planted on a hill — onboarding / first-run state. */
const FirstRun = ({ className }: { className?: string }) => (
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
    <path d="M28 150 Q92 108 120 122 T212 138 V158 H28 Z" fill="hsl(var(--surface-muted))" />
    <path d="M28 150 Q92 108 120 122 T212 138" />
    <line x1="120" y1="30" x2="120" y2="124" />
    <path d="M120 34 H172 L160 50 L172 66 H120 Z" fill="hsl(var(--primary))" stroke="none" />
    <path d="M120 34 H172 L160 50 L172 66 H120 Z" />
    <circle cx="120" cy="28" r="4" fill="currentColor" stroke="none" />
    <path d="M64 150 v-14 M180 138 v-12" opacity="0.6" />
  </svg>
);

export default FirstRun;
