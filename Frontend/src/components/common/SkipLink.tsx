/**
 * Visually-hidden-until-focus "Skip to content" link — the first tabbable node.
 * Sends keyboard/SR users straight to <main id="main">.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Skip to content
    </a>
  );
}

export default SkipLink;
