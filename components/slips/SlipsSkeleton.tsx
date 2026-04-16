"use client";

import React from "react";

const SlipsSkeleton = () => {
    return (
        <div className="animate-pulse space-y-8">
            {/* Create Slip Button Skeleton */}
            <div className="h-20 w-full rounded-3xl border border-white/10 bg-white/5" />

            {/* Slip Type Tabs Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="flex gap-4">
                    <div className="h-4 w-24 rounded bg-white/10" />
                    <div className="h-4 w-24 rounded bg-white/10" />
                </div>
            </div>

            {/* Slip Categories Skeleton */}
            {[1, 2, 3].map((section) => (
                <div key={section} className="space-y-4">
                    <div className="h-4 w-40 rounded bg-white/10" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((card) => (
                            <div
                                key={card}
                                className="h-48 rounded-3xl border border-white/5 bg-white/5"
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SlipsSkeleton;
