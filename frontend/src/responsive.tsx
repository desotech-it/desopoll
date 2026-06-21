// Responsive foundation (issue #7): a spacing scale, a small SSR/jsdom-safe
// useMediaQuery hook, and a single global <style> with mobile-first CSS classes.
//
// The codebase is 100% inline-style, so we use BOTH approaches the diagnosis
// proposes: (a) a global stylesheet (GlobalStyles) for the few hot layout
// primitives that benefit from real @media rules (answer grids, card grid,
// stage padding, hero type via clamp()), and (b) a useMediaQuery hook for the
// handful of screens that must branch JS layout on width.
import React, { useEffect, useState } from "react";

// ---- Spacing scale (px) — centralizes the ad-hoc paddings/gaps. ----
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

// Single breakpoint system (mobile-first). "narrow" ~ phones, "wide" ~ desktop.
export const BREAKPOINT_NARROW = 640; // app shell / top bars stack below this
export const BREAKPOINT_GRID = 520; // answer/option grids go single-column below this

// SSR/jsdom-safe media-query hook. Returns false when matchMedia is missing
// (e.g. some test environments) so components render their wide layout in tests.
export function useMediaQuery(query: string): boolean {
  const get = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;
  const [matches, setMatches] = useState<boolean>(get);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    // addEventListener is the modern API; fall back to addListener for old envs.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}

// Convenience flags used across the hot screens.
export function useIsNarrow(): boolean {
  return useMediaQuery(`(max-width:${BREAKPOINT_NARROW}px)`);
}

// ---- Global stylesheet (injected once at the app root). ----
// Mobile-first: base rules target ~360-380px; min-width media queries scale up.
const CSS = `
/* Answer/option grids: single column on phones, two columns on wider screens. */
.poll-answer-grid{display:grid;grid-template-columns:1fr;gap:${space.md}px;}
@media (min-width:${BREAKPOINT_GRID}px){
  .poll-answer-grid{grid-template-columns:1fr 1fr;}
}

/* Dashboard / picker card grid: fill width on phones, auto-fill tracks above. */
.poll-card-grid{display:grid;grid-template-columns:1fr;gap:${space.md}px;}
@media (min-width:${BREAKPOINT_GRID}px){
  .poll-card-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:${space.lg}px;}
}

/* Game stage outer padding tightens on phones. */
.poll-stage{padding:${space.md}px;}
@media (min-width:${BREAKPOINT_NARROW}px){
  .poll-stage{padding:${space.xl}px;}
}

/* App shell content padding tightens on phones. */
.poll-shell{padding:${space.lg}px;}
@media (min-width:${BREAKPOINT_NARROW}px){
  .poll-shell{padding:${space.xxl}px;}
}

/* Hero display type scales with viewport but is clamped for desktop. */
.poll-pin{font-size:clamp(40px,12vw,60px);letter-spacing:clamp(2px,1.5vw,8px);}
.poll-prompt{font-size:clamp(19px,5vw,24px);}
.poll-countdown-num{font-size:clamp(20px,6vw,24px);}
`;

export function GlobalStyles() {
  return <style>{CSS}</style>;
}
