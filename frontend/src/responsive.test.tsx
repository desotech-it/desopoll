// Tests for the responsive foundation (issue #7): the spacing scale, the
// SSR/jsdom-safe useMediaQuery hook, and the GlobalStyles stylesheet.
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import {
  BREAKPOINT_GRID,
  BREAKPOINT_NARROW,
  GlobalStyles,
  space,
  useIsNarrow,
  useMediaQuery,
} from "./responsive";

afterEach(() => {
  // Remove any matchMedia stub a test installed.
  // @ts-expect-error allow deleting the optional jsdom property
  delete window.matchMedia;
  vi.restoreAllMocks();
});

// Install a controllable matchMedia stub. `matches` decides the result; the
// returned handle lets a test flip the value and fire the change listener.
function stubMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return matches;
    },
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    addListener: (cb: () => void) => listeners.add(cb),
    removeListener: (cb: () => void) => listeners.delete(cb),
    dispatchEvent: () => true,
  })) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

describe("space scale", () => {
  it("is a monotonically increasing px scale", () => {
    expect(space.xs).toBeLessThan(space.sm);
    expect(space.sm).toBeLessThan(space.md);
    expect(space.md).toBeLessThan(space.lg);
    expect(space.lg).toBeLessThan(space.xl);
    expect(space.xl).toBeLessThan(space.xxl);
  });

  it("exposes sensible breakpoints (grid < narrow)", () => {
    expect(BREAKPOINT_GRID).toBeLessThan(BREAKPOINT_NARROW);
  });
});

describe("useMediaQuery", () => {
  it("returns false when matchMedia is unavailable (SSR/jsdom-safe)", () => {
    // jsdom has no matchMedia by default — the hook must not throw.
    const { result } = renderHook(() => useMediaQuery("(max-width:640px)"));
    expect(result.current).toBe(false);
  });

  it("reflects the initial matchMedia result", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(max-width:640px)"));
    expect(result.current).toBe(true);
  });

  it("updates when the media query changes", () => {
    const handle = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width:640px)"));
    expect(result.current).toBe(false);
    act(() => handle.set(true));
    expect(result.current).toBe(true);
  });
});

describe("useIsNarrow", () => {
  it("is true when the narrow query matches", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(true);
  });

  it("is false on wide screens / without matchMedia", () => {
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(false);
  });
});

describe("GlobalStyles", () => {
  it("injects the responsive layout classes and a mobile breakpoint", () => {
    const { container } = render(<GlobalStyles />);
    const css = container.querySelector("style")?.textContent ?? "";
    // Hot layout primitives the screens depend on:
    expect(css).toContain(".poll-answer-grid");
    expect(css).toContain(".poll-card-grid");
    expect(css).toContain(".poll-stage");
    expect(css).toContain(".poll-shell");
    expect(css).toContain(".poll-pin");
    // Mobile-first: base is single column, two columns above the grid breakpoint.
    expect(css).toContain("grid-template-columns:1fr");
    expect(css).toContain("grid-template-columns:1fr 1fr");
    expect(css).toContain(`min-width:${BREAKPOINT_GRID}px`);
    // Hero type uses clamp() so it shrinks on phones.
    expect(css).toContain("clamp(");
  });
});
