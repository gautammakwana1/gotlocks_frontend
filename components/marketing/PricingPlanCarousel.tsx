"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
} from "react";

export default function PricingPlanCarousel({
  children,
  className,
  planLabels,
}: {
  children: ReactNode;
  className: string;
  planLabels: readonly string[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const getPlanCards = () => {
    const carousel = carouselRef.current;
    if (!carousel) return [];

    return Array.from(
      carousel.querySelectorAll<HTMLElement>("[data-pricing-plan]"),
    );
  };

  const goToPlan = (index: number) => {
    const nextIndex = Math.max(0, Math.min(planLabels.length - 1, index));
    const carousel = carouselRef.current;
    const cards = getPlanCards();
    const target = cards[nextIndex];

    setActiveIndex(nextIndex);
    if (!carousel || !target) return;

    const firstCardLeft = cards[0]?.offsetLeft ?? 0;
    const left = target.offsetLeft - firstCardLeft;
    const reducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    if (typeof carousel.scrollTo === "function") {
      carousel.scrollTo({
        left,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    } else {
      carousel.scrollLeft = left;
    }
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const carousel = event.currentTarget;
    const cards = getPlanCards();
    if (cards.length === 0) return;

    const firstCardLeft = cards[0]?.offsetLeft ?? 0;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardLeft = card.offsetLeft - firstCardLeft;
      const distance = Math.abs(carousel.scrollLeft - cardLeft);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    event.preventDefault();

    if (event.key === "Home") {
      goToPlan(0);
      return;
    }

    if (event.key === "End") {
      goToPlan(planLabels.length - 1);
      return;
    }

    goToPlan(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 lg:hidden">
        <div
          role="group"
          aria-label="Choose a pricing plan"
          className="flex items-center gap-2"
        >
          {planLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-label={`Show ${label} plan`}
              aria-current={activeIndex === index ? "true" : undefined}
              onClick={() => goToPlan(index)}
              className={`h-2.5 rounded-full transition-[width,background-color] motion-reduce:transition-none ${activeIndex === index
                  ? "w-7 bg-sky-300"
                  : "w-2.5 bg-white/20 hover:bg-white/35"
                }`}
            />
          ))}
        </div>
        <p aria-hidden="true" className="shrink-0 tabular-nums text-sky-300/70">
          0{activeIndex + 1} / 0{planLabels.length}
        </p>
      </div>

      <p id="pricing-plans-description" className="sr-only">
        Compare the Free, Pro Lifetime, and Arena Hosting plans.
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Showing plan {activeIndex + 1} of {planLabels.length}:{" "}
        {planLabels[activeIndex]}
      </p>

      <div
        ref={carouselRef}
        role="region"
        aria-label="Pricing plans"
        aria-describedby="pricing-plans-description"
        tabIndex={0}
        className={className}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </>
  );
}
