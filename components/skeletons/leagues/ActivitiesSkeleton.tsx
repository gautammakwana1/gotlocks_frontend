"use client";

import React from "react";

const ActivitiesSkeleton = () => {
    return (
        <div className="animate-pulse space-y-3 pb-6">
            {/* Header row skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="h-7 w-24 rounded-lg bg-white/10" />
            </div>

            {/* Activity list skeleton */}
            <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <li key={i} className="flex items-start gap-3 px-3.5 py-3 sm:px-4">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="h-3 w-24 rounded bg-white/10" />
                                <div className="h-3 w-12 rounded bg-white/10" />
                            </div>
                            <div className="h-3 w-4/5 rounded bg-white/10" />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ActivitiesSkeleton;
