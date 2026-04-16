"use client";

import React from "react";

const ActivitiesSkeleton = () => {
    return (
        <div className="animate-pulse space-y-5 pb-10">
            {/* Limit selection skeleton */}
            <div className="flex justify-end">
                <div className="h-8 w-32 rounded-xl bg-white/10" />
            </div>

            {/* Activity list skeletons */}
            {[1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/60 p-5 shadow-inner"
                >
                    <div className="flex items-center justify-between">
                        <div className="h-3 w-16 rounded bg-white/10" />
                        <div className="h-3 w-24 rounded bg-white/10" />
                    </div>
                    <div className="h-4 w-full rounded bg-white/10" />
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                </div>
            ))}

            {/* Pagination skeleton */}
            <div className="flex justify-center items-center gap-3 pt-6">
                <div className="h-10 w-16 rounded-xl bg-white/10" />
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-10 w-16 rounded-xl bg-white/10" />
            </div>
        </div>
    );
};

export default ActivitiesSkeleton;
