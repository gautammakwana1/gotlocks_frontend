"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, TouchEvent } from "react";
import animationStyles from "./FeatureAudienceTabs.module.css";

type FeatureAudience = "league" | "arena";

type AudienceFeature = {
  title: string;
  description: string;
};

const audiences: Array<{
  id: FeatureAudience;
  label: string;
}> = [
    { id: "league", label: "Leagues" },
    { id: "arena", label: "Arenas" },
  ];

const leagueFeatures: AudienceFeature[] = [
  {
    title: "Slip Contests",
    description:
      "Each member submits one pick before the deadline, building a shared League slip that competes based on the group’s overall results.",
  },
  {
    title: "Contest Badges",
    description:
      "Select which Capture the Badge awards are active and customize their point values.",
  },
  {
    title: "Advanced Controls",
    description:
      "Manage members, contest settings, and League activity from one place.",
  },
];

const arenaFeatures: AudienceFeature[] = [
  {
    title: "Location Check-In",
    description:
      "Connect people with an Arena and its community at participating locations.",
  },
  {
    title: "Custom Prizes",
    description: "Add prizes tailored to your business and community.",
  },
  {
    title: "Return Visits",
    description:
      "Use ongoing contests, Arena Points, and leaderboards to give customers and members reasons to return.",
  },
];

const FeatureList = ({
  features,
  accent,
}: {
  features: AudienceFeature[];
  accent: FeatureAudience;
}) => (
  <div className="grid gap-4 sm:gap-7 md:gap-5 xl:gap-6">
    {features.map((feature, index) => (
      <article
        key={feature.title}
        className={`${animationStyles.featureCascade} grid grid-cols-[2.25rem_minmax(7.5rem,0.7fr)_minmax(0,1fr)] items-start gap-x-3 sm:grid-cols-[3.25rem_minmax(10rem,0.65fr)_minmax(0,1fr)] sm:gap-x-5`}
      >
        <span
          aria-hidden="true"
          className={`pt-0.5 text-sm font-black tracking-[0.16em] sm:pt-1 sm:text-base md:text-sm xl:text-base ${accent === "league" ? "text-sky-300/55" : "text-violet-300/55"
            }`}
        >
          0{index + 1}
        </span>
        <h4 className="break-words text-base font-black leading-[1.15] tracking-[-0.03em] text-white min-[360px]:text-lg min-[430px]:text-xl sm:text-[1.75rem] md:text-xl xl:text-2xl">
          {feature.title}
        </h4>
        <p className="col-start-3 row-start-1 text-[0.95rem] leading-6 text-slate-300 sm:text-xl sm:leading-8 md:text-base md:leading-6 xl:text-lg xl:leading-7">
          {feature.description}
        </p>
      </article>
    ))}
  </div>
);

export default function FeatureAudienceTabs() {
  const [activeAudience, setActiveAudience] =
    useState<FeatureAudience>("league");
  const [transitionDirection, setTransitionDirection] = useState<
    "forward" | "backward"
  >("forward");
  const [transitionVersion, setTransitionVersion] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const activeIndex = audiences.findIndex(
    (audience) => audience.id === activeAudience,
  );
  const activeContent =
    activeAudience === "league"
      ? {
        eyebrow: "Leagues",
        heading: "Private competition for your crew.",
        description:
          "Create an invite-only League for friends and fellow fans, with commissioner-led tools for running the competition.",
        features: leagueFeatures,
      }
      : {
        eyebrow: "Arenas",
        heading: "Turn game days into community events.",
        description:
          "Businesses, workplaces, and larger groups of any kind can create an Arena and operate an ongoing sports community built around the games they follow.",
        features: arenaFeatures,
      };

  const selectAudience = (
    audience: FeatureAudience,
    direction?: "forward" | "backward",
  ) => {
    if (audience === activeAudience) return;
    setTransitionDirection(
      direction ?? (audience === "arena" ? "forward" : "backward"),
    );
    setTransitionVersion((version) => version + 1);
    setActiveAudience(audience);
  };

  const rotateAudience = (direction: "forward" | "backward") => {
    const offset = direction === "forward" ? 1 : -1;
    const nextIndex =
      (activeIndex + offset + audiences.length) % audiences.length;

    selectAudience(audiences[nextIndex].id, direction);
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
      selectAudience("league", "backward");
      return;
    }

    if (event.key === "End") {
      selectAudience("arena", "forward");
      return;
    }

    rotateAudience(event.key === "ArrowRight" ? "forward" : "backward");
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current;
    if (startX === null) return;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (endX === undefined) return;

    const distance = endX - startX;

    if (Math.abs(distance) < 48) return;
    rotateAudience(distance < 0 ? "forward" : "backward");
  };

  const panelAnimationClass =
    transitionVersion === 0
      ? ""
      : transitionDirection === "forward"
        ? animationStyles.slideForward
        : animationStyles.slideBackward;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Feature audiences"
      data-active-audience={activeAudience}
      tabIndex={0}
      className={`relative isolate mt-7 touch-pan-y rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 sm:mt-12 md:mt-8 xl:mt-10 ${activeAudience === "league"
        ? "focus-visible:outline-sky-200"
        : "focus-visible:outline-violet-200"
        }`}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartX.current = null;
      }}
    >
      <div className="mb-4 flex items-center justify-end gap-3 sm:mb-8 md:mb-5 xl:mb-7">
        <p
          aria-live="polite"
          aria-atomic="true"
          className={`mr-1 text-sm font-bold tabular-nums tracking-[0.16em] ${activeAudience === "league" ? "text-sky-200" : "text-violet-200"
            }`}
        >
          <span className="sr-only">
            Showing {audiences[activeIndex].label} features, slide {activeIndex + 1}
            {" of "}
            {audiences.length}
          </span>
          <span aria-hidden="true">
            0{activeIndex + 1}
            <span className="text-slate-600"> / 02</span>
          </span>
        </p>
        <button
          type="button"
          aria-label={`Previous audience: ${audiences[(activeIndex - 1 + audiences.length) % audiences.length].label}`}
          onClick={() => rotateAudience("backward")}
          className={`grid size-11 place-items-center rounded-full border bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:size-12 md:size-10 xl:size-11 ${activeAudience === "league"
            ? "border-sky-200/20 focus-visible:outline-sky-200"
            : "border-violet-200/20 focus-visible:outline-violet-200"
            }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            data-directional-arrow="left"
            className="ui-directional-arrow size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Next audience: ${audiences[(activeIndex + 1) % audiences.length].label}`}
          onClick={() => rotateAudience("forward")}
          className={`grid size-11 place-items-center rounded-full border bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:size-12 md:size-10 xl:size-11 ${activeAudience === "league"
            ? "border-sky-200/20 focus-visible:outline-sky-200"
            : "border-violet-200/20 focus-visible:outline-violet-200"
            }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            data-directional-arrow="right"
            className="ui-directional-arrow size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div
        key={`${activeAudience}-${transitionVersion}`}
        role="group"
        aria-roledescription="slide"
        aria-label={`${activeIndex + 1} of ${audiences.length}: ${audiences[activeIndex].label}`}
        className={`grid gap-6 sm:gap-8 md:grid-cols-[0.78fr_1.22fr] md:items-start md:gap-8 xl:gap-14 ${panelAnimationClass}`}
      >
        <div>
          <p
            className={`text-lg font-semibold uppercase tracking-[0.2em] sm:text-xl md:text-lg xl:text-xl ${activeAudience === "league" ? "text-sky-300" : "text-violet-300"
              }`}
          >
            {activeContent.eyebrow}
          </p>
          <h3 className="mt-2 text-[2rem] font-black leading-[0.98] tracking-[-0.045em] text-white sm:mt-3 sm:text-5xl md:text-3xl xl:text-4xl">
            {activeContent.heading}
          </h3>
          <p className="mt-4 text-base leading-6 text-slate-300 sm:text-xl sm:leading-9 md:mt-3 md:text-base md:leading-6 xl:text-lg xl:leading-8">
            {activeContent.description}
          </p>
        </div>
        <FeatureList features={activeContent.features} accent={activeAudience} />
      </div>
    </div>
  );
}
