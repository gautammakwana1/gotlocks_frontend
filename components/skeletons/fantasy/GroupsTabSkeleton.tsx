"use client";

import React from "react";

const GroupsTabSkeleton = () => {
    return (
        <div className="animate-pulse space-y-4">
            {/* Action Buttons Grid Skeleton */}
            <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-3">
                <div className="col-span-2 min-h-[88px] rounded-3xl border border-white/10 bg-white/5 lg:col-span-1" />
                <div className="min-h-[72px] rounded-3xl border border-white/10 bg-white/5 lg:min-h-[88px]" />
                <div className="min-h-[72px] rounded-3xl border border-white/10 bg-white/5 lg:min-h-[88px]" />
            </div>

            {/* Group Cards List Skeleton */}
            <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className="flex h-44 w-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg sm:p-6"
                    >
                        <div className="h-3 w-24 rounded bg-white/10" />
                        <div className="h-6 w-1/2 rounded bg-white/10" />
                        <div className="h-4 w-3/4 rounded bg-white/10" />
                        <div className="mt-auto h-3 w-16 rounded bg-white/10" />
                    </div>
                ))}
            </div>

            {/* Grid for remaining groups */}
            <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className="flex h-44 w-full flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg sm:p-6"
                    >
                        <div className="h-3 w-24 rounded bg-white/10" />
                        <div className="h-6 w-3/4 rounded bg-white/10" />
                        <div className="h-4 w-full rounded bg-white/10" />
                        <div className="mt-auto h-3 w-16 rounded bg-white/10" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GroupsTabSkeleton;
