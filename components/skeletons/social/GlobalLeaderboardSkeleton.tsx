"use client";

import React from "react";

// Mirrors LEADERBOARD_GRID in app/social/page.tsx so the skeleton lines up with
// the real Global Leaderboard header/rows on both viewports.
const LEADERBOARD_GRID =
    "grid grid-cols-[22px_minmax(0,1fr)_56px_72px] gap-2 sm:grid-cols-[36px_minmax(0,1fr)_96px_104px] sm:gap-4";

const ROWS = [0, 1, 2, 3, 4, 5];

const GlobalLeaderboardSkeleton = () => (
    <div className="animate-pulse space-y-3 px-2 sm:px-3">
        {/* Header: "weekly xp" label + subtitle on the left, range toggle on the right */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <div className="space-y-1.5">
                <div className="h-2.5 w-20 rounded bg-white/20" />
                <div className="h-2 w-32 rounded bg-white/10" />
            </div>
            <div className="flex items-center gap-4">
                <div className="h-2.5 w-16 rounded bg-white/20" />
                <div className="h-2.5 w-16 rounded bg-white/10" />
            </div>
        </div>

        {/* Column headers */}
        <div className={`${LEADERBOARD_GRID} items-center border-b border-white/10 pb-2`}>
            <div className="h-2 w-3 rounded bg-white/20" />
            <div className="h-2 w-12 rounded bg-white/20" />
            <div className="h-2 w-8 rounded bg-white/20" />
            <div className="h-2 w-8 justify-self-end rounded bg-white/20" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/10">
            {ROWS.map((i) => (
                <div key={i} className={`${LEADERBOARD_GRID} items-center py-2.5`}>
                    {/* Rank */}
                    <div className="flex items-center justify-center">
                        <div className="h-4 w-4 rounded-full bg-white/20" />
                    </div>

                    {/* Avatar + name + win count */}
                    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                        <div className="h-7 w-7 shrink-0 rounded-full bg-white/20 sm:h-8 sm:w-8" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="h-3 w-24 rounded bg-white/20" />
                            <div className="h-2 w-12 rounded bg-white/10" />
                        </div>
                    </div>

                    {/* Biggest hit (odds + xp stacked) */}
                    <div className="space-y-1.5">
                        <div className="h-3 w-10 rounded bg-white/20" />
                        <div className="h-2 w-8 rounded bg-white/10" />
                    </div>

                    {/* Total XP */}
                    <div className="h-3 w-10 justify-self-end rounded bg-white/20" />
                </div>
            ))}
        </div>
    </div>
);

export default GlobalLeaderboardSkeleton;
