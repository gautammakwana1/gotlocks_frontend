import React from "react";

export const ContestCardSkeleton = () => {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 space-y-4 animate-pulse w-full">
      {/* Contest Title & Players count */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2 flex-1">
          <div className="h-5 w-2/3 rounded bg-white/10" />
          <div className="h-4 w-3/4 rounded bg-white/5" />
        </div>
        <div className="h-4 w-16 rounded bg-white/5" />
      </div>

      {/* Contest Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((j) => (
          <div
            key={j}
            className="rounded-md border border-white/5 bg-black/20 p-2 flex flex-col items-center gap-1.5"
          >
            <div className="h-4 w-6 rounded bg-white/10" />
            <div className="h-3 w-8 rounded bg-white/5" />
          </div>
        ))}
      </div>

      {/* Tags/Sports */}
      <div className="flex gap-2">
        <div className="h-5 w-12 rounded-full bg-white/5" />
        <div className="h-5 w-12 rounded-full bg-white/5" />
      </div>

      {/* Time Range */}
      <div className="h-3 w-40 rounded bg-white/5" />
    </div>
  );
};

const LeaguePageSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 pb-10 animate-pulse">
      {/* Back Button Skeleton */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="h-4 w-4 rounded bg-white/5" />
        <div className="h-4 w-12 rounded bg-white/5" />
      </div>

      {/* Header Skeleton */}
      <header className="-mx-5 space-y-3 border-b border-white/10 px-5 pb-5 sm:mx-0 sm:px-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="h-4 w-20 rounded-full bg-white/10" />
            <div className="h-4 w-20 rounded-full bg-white/10" />
          </div>
          {/* Scoring Info Button Placeholder */}
          <div className="h-8 w-8 rounded-full bg-white/10" />
        </div>
        <div className="min-w-0 space-y-2 flex-1">
          {/* Title Placeholder */}
          <div className="h-9 w-48 rounded bg-white/10 sm:w-64" />
          {/* Description Placeholder */}
          <div className="h-4 w-5/6 max-w-2xl rounded bg-white/5 sm:w-3/4" />
          <div className="flex items-start gap-3">
            <div className="h-4 w-30 rounded bg-white/10" />
            <div className="h-4 w-30 rounded bg-white/10" />
          </div>
        </div>
      </header>

      {/* Tabs Skeleton: Feed / Contests / Members / Settings */}
      <section className="-mx-5 -mt-6 border-b border-white/10 px-1 pt-2 sm:mx-0">
        <div className="grid w-full grid-cols-4 items-end gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex h-10 min-w-0 items-center justify-center rounded-t-xl px-1 sm:px-3"
            >
              <div className="h-3 w-14 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </section>

      {/* Active Tab Content Skeleton: Default to Feed */}
      <div className="space-y-4">
        {/* Activity / Standings toggle placeholder */}
        <div className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-white/5 bg-black/25 p-1">
          {[1, 2].map((i) => (
            <div key={i} className="flex min-h-11 items-center justify-center rounded-xl">
              <div className="h-3 w-16 rounded bg-white/5" />
            </div>
          ))}
        </div>

        {/* Feed rows placeholder */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-4"
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/5 rounded bg-white/10" />
              <div className="h-3 w-4/5 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaguePageSkeleton;
