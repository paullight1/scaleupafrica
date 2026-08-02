import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Mounted once inside <BrowserRouter>, outside <Routes>.
 * - On pathname change: scroll to top (instant — never smooth, for reduced motion)
 *   and move focus to #main so SR/keyboard users start at the content.
 * - On a hash (e.g. cross-page "/#pricing"): scroll the target into view after paint,
 *   retrying briefly for lazy content.
 * - Hash-only changes within the same pathname don't re-scroll to top.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    const pathnameChanged = prevPathname.current !== pathname;
    prevPathname.current = pathname;

    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      let frames = 0;
      let raf = 0;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ block: "start" });
          return;
        }
        // Retry for a handful of frames while lazy content mounts.
        if (frames++ < 20) raf = requestAnimationFrame(tryScroll);
      };
      raf = requestAnimationFrame(tryScroll);
      return () => cancelAnimationFrame(raf);
    }

    if (!pathnameChanged) return;

    window.scrollTo(0, 0);
    const main = document.getElementById("main");
    if (main) {
      main.focus({ preventScroll: true });
    }
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
