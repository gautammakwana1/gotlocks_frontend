"use client";

import { useEffect, useRef, useState } from "react";
import animationStyles from "./HowItWorksSteps.module.css";

const STEP_DURATION_MS = 7000;

type PlaybackState = "waiting" | "playing" | "stopped" | "complete";

type JourneyStep = {
  title: string;
  description: string;
};

export default function HowItWorksSteps({ steps }: { steps: JourneyStep[] }) {
  const [activeStep, setActiveStep] = useState(0);
  const [playbackState, setPlaybackState] =
    useState<PlaybackState>("waiting");
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    );
    const reducedMotion = reducedMotionQuery?.matches;

    if (reducedMotion) {
      setPlaybackState("stopped");
    }

    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") {
      setPlaybackState(reducedMotion ? "stopped" : "playing");
      return;
    }
    const observedArea = list.closest("section") ?? list;

    let wasVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;

        const isVisible =
          entry.isIntersecting &&
          (typeof entry.intersectionRatio !== "number" ||
            entry.intersectionRatio >= 0.35);

        if (isVisible) {
          if (!wasVisible) {
            setActiveStep(0);
            setPlaybackState(reducedMotion ? "stopped" : "playing");
          }

          wasVisible = true;
          return;
        }

        if (wasVisible) {
          setActiveStep(0);
          setPlaybackState("waiting");
        }

        wasVisible = false;
      },
      { threshold: 0.35 },
    );

    observer.observe(observedArea);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (playbackState !== "playing" || steps.length === 0) return;

    const timer = window.setTimeout(() => {
      if (activeStep < steps.length - 1) {
        setActiveStep((current) => current + 1);
        return;
      }

      setPlaybackState("complete");
    }, STEP_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeStep, playbackState, steps.length]);

  const selectStep = (index: number) => {
    setPlaybackState("stopped");
    setActiveStep(index);
  };

  return (
    <div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Step {activeStep + 1} of {steps.length}: {steps[activeStep]?.title}
      </p>

      <ol
        ref={listRef}
        className={`${animationStyles.stepGrid} mt-8 grid items-start gap-3 sm:mt-12 sm:gap-4 lg:mt-10 xl:mt-12 ${activeStep === 1
            ? animationStyles.secondStepActive
            : activeStep === 2
              ? animationStyles.thirdStepActive
              : ""
          }`}
        onFocusCapture={() => {
          setPlaybackState((current) =>
            current === "playing" ? "stopped" : current,
          );
        }}
      >
        {steps.map((step, index) => {
          const active = activeStep === index;
          const completed =
            playbackState === "complete" || index < activeStep;
          const timed = active && playbackState === "playing";
          const staticallyFilled =
            completed || (active && playbackState === "stopped");
          const buttonId = `journey-step-${index + 1}-button`;
          const panelId = `journey-step-${index + 1}-panel`;

          return (
            <li
              key={step.title}
              className={`group relative overflow-hidden rounded-[22px] border transition-colors duration-300 motion-reduce:transition-none md:h-[19rem] md:duration-500 lg:h-72 xl:h-64 ${active
                  ? "border-sky-300/30 bg-gradient-to-br from-sky-300/[0.095] via-white/[0.055] to-white/[0.025]"
                  : "border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.018] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute right-5 top-2 text-6xl font-black tracking-tighter transition-colors duration-300 motion-reduce:transition-none sm:text-7xl md:duration-500 ${active ? "text-sky-200/[0.09]" : "text-white/[0.04]"
                  }`}
              >
                0{index + 1}
              </span>

              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={active}
                  aria-controls={panelId}
                  onClick={() => selectStep(index)}
                  className={`relative z-10 flex min-h-20 w-full items-center justify-between gap-4 px-5 py-5 pr-20 text-left text-xl font-black tracking-[-0.025em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-200 sm:min-h-24 sm:px-6 sm:py-6 sm:pr-24 sm:text-2xl md:items-start md:text-[1.35rem] lg:text-2xl ${active ? "text-white" : "text-slate-300 hover:text-white"
                    }`}
                >
                  {index === 0 ? (
                    <span>
                      <span className={!active ? "md:block" : undefined}>
                        Create or Join
                      </span>{" "}
                      <span className={!active ? "md:block" : undefined}>
                        a Community
                      </span>
                    </span>
                  ) : (
                    step.title
                  )}
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                aria-hidden={!active}
                className={`${animationStyles.stepPanel} ${active ? animationStyles.activeStepPanel : ""
                  }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="px-5 pb-6 text-base leading-7 text-slate-300 sm:px-6 sm:pb-7 sm:text-lg sm:leading-8 md:max-w-2xl lg:text-xl lg:leading-9">
                    {step.description}
                  </p>
                </div>
              </div>

              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/[0.035]"
              >
                <span
                  key={`${index}-${activeStep}-${playbackState}`}
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-300 ${timed
                      ? animationStyles.progressFill
                      : staticallyFilled
                        ? "w-full"
                        : "w-0"
                    }`}
                  style={
                    timed
                      ? { animationDuration: `${STEP_DURATION_MS}ms` }
                      : undefined
                  }
                />
              </span>
            </li>
          );
        })}
      </ol>

    </div>
  );
}
