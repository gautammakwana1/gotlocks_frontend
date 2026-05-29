"use client";

import React from "react";

// Number of tab placeholders to render. The live page shows up to 5 tabs
// (Standings, Slips, Badges, Players, Settings) and lays them out as equal
// fractions, so we mirror that with a fixed 5-column grid that shrinks on mobile.
const TAB_COUNT = 5;

// Mirror LeaderboardGrid's responsive dimensions exactly:
//   HEADER_H   -> 44px mobile / 48px desktop
//   ROW_H      -> 112px mobile / 132px desktop
//   STICKY_W   -> ~108-123px mobile / ~158-210px desktop (player/rank column)
// The slip area is flex-1 so a single slip column fills the remaining width
// responsively on every screen size (matching SLIP_WIDTH = remaining area).
const HEADER_H = "h-[44px] md:h-[48px]";
const ROW_H = "h-[112px] md:h-[132px]";
const STICKY_W = "w-[112px] md:w-[170px]";
const ROWS = [0, 1, 2, 3, 4];

const PlayerCellSkeleton = () => (
  <div className="flex h-full w-full min-w-0 flex-col justify-center gap-2.5 md:gap-3">
    <div className="flex min-w-0 items-center gap-2">
      {/* Avatar + rank badge */}
      <div className="relative h-8 w-8 shrink-0 rounded-full bg-white/10 md:h-9 md:w-9">
        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border border-white/20 bg-white/15 md:h-[18px] md:w-[18px]" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Username */}
        <div className="h-2.5 w-14 rounded bg-white/10 md:h-3 md:w-20" />
        {/* pts / W-L */}
        <div className="h-2 w-10 rounded bg-white/5 md:w-14" />
      </div>
    </div>
    {/* Badges strip */}
    <div className="min-w-0 rounded-md border border-white/10 bg-black/25 px-1.5 py-1">
      <div className="flex items-center justify-between">
        <div className="h-2 w-8 rounded bg-white/5 md:h-2.5 md:w-10" />
      </div>
      <div className="mt-1 flex gap-1">
        <div className="h-5 w-5 rounded-md bg-white/5 md:h-6 md:w-6" />
        <div className="h-5 w-5 rounded-md bg-white/5 md:h-6 md:w-6" />
      </div>
    </div>
  </div>
);

const SlipCellSkeleton = () => (
  <div className="relative flex h-full w-full">
    <div className="grid h-full w-full min-w-0 grid-cols-[minmax(0,1fr)_66px] gap-1 md:grid-cols-[minmax(0,1fr)_116px] md:gap-2">
      {/* Pick card */}
      <div className="flex min-h-0 min-w-0 flex-col justify-between rounded-md border border-white/10 bg-white/[0.035] px-2 py-1.5 shadow-[inset_0_0_12px_rgba(15,23,42,0.45)] md:px-3 md:py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="h-2 w-8 rounded bg-white/10 md:h-2.5 md:w-10" />
          <div className="h-2 w-6 rounded bg-white/10 md:h-2.5 md:w-8" />
        </div>
        <div className="space-y-1">
          <div className="h-2.5 w-full rounded bg-white/10 md:h-3" />
          <div className="h-2.5 w-2/3 rounded bg-white/10 md:h-3" />
        </div>
        <div className="h-2 w-1/2 rounded bg-white/5" />
      </div>
      {/* Tier + Points stack */}
      <div className="grid min-h-0 min-w-0 grid-rows-2 gap-1">
        <div className="flex min-h-0 flex-col justify-center gap-1 overflow-hidden rounded-md border border-white/10 bg-white/[0.05] px-1 py-1 md:px-2">
          <div className="h-2.5 w-3/4 rounded bg-white/10 md:h-3" />
          <div className="h-2 w-1/2 rounded bg-white/5" />
        </div>
        <div className="flex min-h-0 flex-col justify-center gap-1 overflow-hidden rounded-md border border-white/12 bg-white/[0.06] px-1 py-1 md:px-2">
          <div className="h-2 w-1/2 rounded bg-white/5" />
          <div className="h-2.5 w-2/3 rounded bg-white/10 md:h-3" />
          <div className="h-2 w-1/3 rounded bg-white/5" />
        </div>
      </div>
    </div>
  </div>
);

export const LeaderboardGridSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="overflow-hidden rounded-md border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/[0.03]">
      <div className="w-full min-w-0 overflow-x-hidden">
        <div className="text-xs text-white md:text-sm">
          <div className="flex">
            {/* Sticky Rank + Player column */}
            <div
              className={`flex flex-col border-r border-white/10 bg-[#151515] ${STICKY_W}`}
            >
              <div
                className={`flex items-center border-b border-white/10 px-2 md:px-3 ${HEADER_H}`}
              >
                <div className="h-2.5 w-10 rounded bg-white/10" />
              </div>
              {ROWS.map((i) => (
                <div
                  key={i}
                  className={`flex items-center px-2 py-2 md:px-3 ${ROW_H} ${
                    i === ROWS.length - 1 ? "border-b-0" : "border-b border-white/10"
                  }`}
                >
                  <PlayerCellSkeleton />
                </div>
              ))}
            </div>

            {/* Slip column — flex-1 keeps the slip width responsive on mobile + desktop */}
            <div className="relative z-0 min-w-0 flex-1">
              <div className="flex">
                <div className="w-full min-w-0">
                  {/* Slip header */}
                  <div
                    className={`flex flex-col justify-center gap-1 border-b border-white/10 px-2 py-1.5 md:px-3 ${HEADER_H}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-3 w-24 rounded bg-white/10 md:h-4 md:w-32" />
                      <div className="h-2.5 w-10 rounded bg-white/5" />
                    </div>
                    <div className="h-2 w-28 rounded bg-white/5" />
                  </div>
                  {/* Slip cells */}
                  {ROWS.map((i) => (
                    <div
                      key={i}
                      className={`px-2 py-2 md:px-3 ${ROW_H} ${
                        i === ROWS.length - 1 ? "border-b-0" : "border-b border-white/10"
                      }`}
                    >
                      <SlipCellSkeleton />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ContestPageSkeleton = () => {
  return (
    <div className="flex flex-col gap-2 pb-10">
      {/* Header Skeleton — mirrors the real header (back button + meta pills, then league / contest title) */}
      <header className="-mx-5 border-b border-white/10 pl-5 pr-2 pb-3 sm:mx-0 sm:px-0 animate-pulse">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Back button */}
          <div className="flex shrink-0 items-center gap-1.5 py-1">
            <div className="h-4 w-4 rounded bg-white/10" />
            <div className="h-4 w-10 rounded bg-white/5" />
          </div>
          {/* Meta pills: date range + sport tag(s) */}
          <div className="flex flex-wrap justify-end gap-1.5">
            <div className="h-6 w-40 rounded-full bg-white/5 sm:w-52" />
            <div className="h-6 w-14 rounded-full bg-white/5" />
          </div>
        </div>
        {/* League name / contest title */}
        <div className="mt-2.5 flex min-w-0 items-center gap-2">
          <div className="h-5 w-24 max-w-[45%] rounded bg-white/5 sm:h-6 sm:w-32" />
          <div className="h-4 w-1.5 shrink-0 rounded bg-white/10" />
          <div className="h-5 w-40 flex-1 max-w-[55%] rounded bg-white/10 sm:h-6 sm:w-56" />
        </div>
      </header>

      {/* Tabs Skeleton — mirrors the equal-fraction tab row */}
      <section className="-mx-5 -mt-1 border-b border-white/10 px-5 sm:mx-0 sm:px-0 animate-pulse">
        <div
          className="relative grid w-full gap-1 py-1"
          style={{ gridTemplateColumns: `repeat(${TAB_COUNT}, minmax(0, 1fr))` }}
        >
          {/* Active tab indicator */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-1 left-0 rounded-lg border border-white/10 bg-white/[0.06]"
            style={{ width: `calc(100% / ${TAB_COUNT})` }}
          />
          {Array.from({ length: TAB_COUNT }).map((_, i) => (
            <div
              key={i}
              className="relative z-10 flex h-9 min-w-0 items-center justify-center px-2"
            >
              <div className="h-3 w-10 rounded bg-white/10 sm:w-14" />
            </div>
          ))}
        </div>
      </section>

      {/* Standings Content Skeleton — the default tab renders the leaderboard grid directly */}
      <section>
        <LeaderboardGridSkeleton />
      </section>
    </div>
  );
};

export default ContestPageSkeleton;
