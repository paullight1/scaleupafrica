/** Rising bar chart behind a storefront and an orange arc — the hero anchor. */
const HeroGrowth = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 320 240"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="176" cy="112" r="92" fill="hsl(var(--primary))" opacity="0.08" stroke="none" />
    <rect x="44" y="150" width="34" height="54" rx="3" fill="hsl(var(--surface-muted))" />
    <rect x="44" y="150" width="34" height="54" rx="3" />
    <rect x="94" y="120" width="34" height="84" rx="3" fill="hsl(var(--surface-muted))" />
    <rect x="94" y="120" width="34" height="84" rx="3" />
    <rect x="144" y="86" width="34" height="118" rx="3" fill="hsl(var(--primary))" opacity="0.9" stroke="none" />
    <rect x="144" y="86" width="34" height="118" rx="3" />
    <rect x="194" y="54" width="34" height="150" rx="3" fill="hsl(var(--surface-muted))" />
    <rect x="194" y="54" width="34" height="150" rx="3" />
    <path d="M40 204 h240" />
    <path d="M54 118 C104 96 150 70 214 34" />
    <path d="M196 30 h22 v22" />
    <circle cx="256" cy="72" r="20" fill="hsl(var(--surface-muted))" />
    <circle cx="256" cy="72" r="20" />
    <path d="M249 72 l5 6 l10 -12" />
  </svg>
);

export default HeroGrowth;
