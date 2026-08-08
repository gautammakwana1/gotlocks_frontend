"use client";

import { useEffect, useRef, useState } from "react";

const CUE_DELAY_MS = 5_000;
const DESKTOP_QUERY = "(min-width: 768px)";

export default function LandingScrollCue({
  className,
  visibleClassName,
  arrowClassName,
}: {
  className: string;
  visibleClassName: string;
  arrowClassName: string;
}) {
  const cueRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cue = cueRef.current;
    const section = cue?.closest("section");
    if (!cue || !section) return;

    const mediaQuery = window.matchMedia?.(DESKTOP_QUERY);
    let observer: IntersectionObserver | null = null;
    let revealTimer: number | undefined;
    let sectionIsActive = false;
    let disposed = false;

    const clearRevealTimer = () => {
      if (revealTimer !== undefined) {
        window.clearTimeout(revealTimer);
        revealTimer = undefined;
      }
    };

    const hideAndReset = () => {
      clearRevealTimer();
      if (!disposed) setVisible(false);
    };

    const scheduleReveal = () => {
      hideAndReset();
      revealTimer = window.setTimeout(() => {
        revealTimer = undefined;
        if (!disposed && sectionIsActive) setVisible(true);
      }, CUE_DELAY_MS);
    };

    const disconnectObserver = () => {
      observer?.disconnect();
      observer = null;
      sectionIsActive = false;
      hideAndReset();
    };

    const observeForCurrentViewport = () => {
      disconnectObserver();

      if (mediaQuery && !mediaQuery.matches) return;

      if (typeof IntersectionObserver === "undefined") {
        sectionIsActive = true;
        scheduleReveal();
        return;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;

          const nextIsActive =
            entry.isIntersecting &&
            (typeof entry.intersectionRatio !== "number" ||
              entry.intersectionRatio >= 0.55);

          if (nextIsActive === sectionIsActive) return;
          sectionIsActive = nextIsActive;

          if (sectionIsActive) {
            scheduleReveal();
          } else {
            hideAndReset();
          }
        },
        { threshold: [0, 0.55] },
      );

      observer.observe(section);
    };

    observeForCurrentViewport();
    mediaQuery?.addEventListener?.("change", observeForCurrentViewport);

    return () => {
      disposed = true;
      clearRevealTimer();
      observer?.disconnect();
      mediaQuery?.removeEventListener?.("change", observeForCurrentViewport);
    };
  }, []);

  return (
    <span
      ref={cueRef}
      aria-hidden="true"
      data-scroll-cue
      data-visible={visible ? "true" : "false"}
      className={`${className} ${visible ? visibleClassName : ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={arrowClassName}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
}
