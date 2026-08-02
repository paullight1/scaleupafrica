import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReveal } from "@shared/hooks/useReveal";

type Cb = (entries: Pick<IntersectionObserverEntry, "isIntersecting">[]) => void;

const instances: {
  cb: Cb;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];

class FakeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(cb: Cb) {
    instances.push({ cb, observe: this.observe, disconnect: this.disconnect });
  }
}

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

describe("useReveal", () => {
  beforeEach(() => {
    instances.length = 0;
    setReducedMotion(false);
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts hidden and reveals on first intersection", () => {
    const { result } = renderHook(() => useReveal());
    expect(result.current.revealed).toBe(false);

    act(() => result.current.ref(document.createElement("div")));
    expect(instances).toHaveLength(1);

    act(() => instances[0].cb([{ isIntersecting: true }]));
    expect(result.current.revealed).toBe(true);
  });

  it("unobserves after firing, so it never re-runs", () => {
    const { result } = renderHook(() => useReveal());
    act(() => result.current.ref(document.createElement("div")));
    act(() => instances[0].cb([{ isIntersecting: true }]));
    expect(instances[0].disconnect).toHaveBeenCalled();
  });

  it("stays hidden while the element is out of view", () => {
    const { result } = renderHook(() => useReveal());
    act(() => result.current.ref(document.createElement("div")));
    act(() => instances[0].cb([{ isIntersecting: false }]));
    expect(result.current.revealed).toBe(false);
  });

  it("is revealed immediately and creates no observer under reduced motion", () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useReveal());
    expect(result.current.revealed).toBe(true);
    act(() => result.current.ref(document.createElement("div")));
    expect(instances).toHaveLength(0);
  });

  it("reveals immediately when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() => useReveal());
    act(() => result.current.ref(document.createElement("div")));
    expect(result.current.revealed).toBe(true);
  });
});
