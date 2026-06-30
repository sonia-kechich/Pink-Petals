/**
 * Reduced-motion helpers for framer-motion's JS-driven animations.
 *
 * The global CSS rule in index.css only zeroes *CSS* animations/transitions;
 * framer animates inline via JS, so it ignores that rule. These builders take
 * the user's reduced-motion preference and, when set, collapse the transition
 * to zero duration — the component still mounts/unmounts and the FINAL state is
 * presented immediately, so functionality (expand/collapse, drag-and-drop) is
 * fully preserved while the motion flourish is dropped.
 *
 * The builders are pure (the `reduce` flag is an argument) so they're trivially
 * unit-testable; the `use*` hooks just read the preference and delegate.
 */
import { useReducedMotion } from "framer-motion";

export interface ExpandMotion {
  initial: { height: number; opacity: number };
  animate: { height: "auto"; opacity: number };
  exit: { height: number; opacity: number };
  transition: { duration: number; ease?: string };
}

/** Height/opacity expand-collapse props used across the app's disclosures. */
export function expandMotion(reduce: boolean, duration = 0.24): ExpandMotion {
  return {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: reduce ? { duration: 0 } : { duration, ease: "easeOut" },
  };
}

/** Fade/slide props for view transitions (e.g. the auth mode switch). When
 *  reduced, the slide offset is removed and the cross-fade is instantaneous. */
export function fadeSlide(reduce: boolean, y = 8, duration = 0.2) {
  return {
    initial: { opacity: 0, y: reduce ? 0 : y },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : -y },
    transition: reduce ? { duration: 0 } : { duration, ease: "easeOut" },
  };
}

/** Hook form of {@link expandMotion} — reads the live motion preference. */
export function useExpandMotion(duration?: number): ExpandMotion {
  return expandMotion(!!useReducedMotion(), duration);
}
