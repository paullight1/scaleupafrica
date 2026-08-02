import { useCallback, useEffect, useRef, useState } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION).matches
  );
}

export interface UseRevealResult {
  /** Callback ref — attach to the element that should reveal. */
  ref: (node: Element | null) => void;
  revealed: boolean;
}

/**
 * One-way scroll reveal. Fires once on first intersection and unobserves, so
 * scrolling back up never replays it.
 *
 * Under `prefers-reduced-motion: reduce` it returns `revealed: true` on the
 * first render and never constructs an observer — the consumer's transform
 * classes are therefore never applied. The preference is read once per mount
 * rather than subscribed to, so a mid-transition setting change can't strand
 * an element at opacity 0.
 */
export function useReveal(): UseRevealResult {
  const [reduced] = useState(prefersReducedMotion);
  const [revealed, setRevealed] = useState(reduced);
  const doneRef = useRef(reduced);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const disconnect = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
  }, []);

  // Identity is stable across renders, so React never re-invokes this on a
  // state change — the element is observed exactly once.
  const ref = useCallback(
    (node: Element | null) => {
      disconnect();
      if (!node || doneRef.current) return;

      if (typeof IntersectionObserver === "undefined") {
        doneRef.current = true;
        setRevealed(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          doneRef.current = true;
          setRevealed(true);
          disconnect();
        },
        { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [disconnect],
  );

  useEffect(() => disconnect, [disconnect]);

  return { ref, revealed };
}

export default useReveal;
