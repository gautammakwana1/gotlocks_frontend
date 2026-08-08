/*
 * Shared slide-in motion for right/left side drawers. Panels animate transform
 * only (not opacity) so the slide stays GPU-composited, and every surface that
 * uses these tokens honours prefers-reduced-motion for free.
 */
export const SIDE_DRAWER_TRANSITION_MS = 300;

export const SIDE_DRAWER_MOTION = {
  panel:
    "transform-gpu transition-transform duration-300 ease-out motion-reduce:transition-none",
  backdrop:
    "bg-black/65 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none",
  open: "translate-x-0",
  closedLeft: "-translate-x-full",
  closedRight: "translate-x-full",
  backdropOpen: "opacity-100",
  backdropClosed: "opacity-0",
} as const;
