"use client";

import React from "react";

const PlayersSkeleton = () => {
    return (
        <section className="space-y-4">
            <div>
                <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-2.5 w-56 animate-pulse rounded bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-3.5 w-24 animate-pulse rounded bg-white/10" />
                            <div className="h-2.5 w-14 animate-pulse rounded bg-white/[0.06]" />
                        </div>
                        <div className="h-7 w-16 flex-shrink-0 animate-pulse rounded-lg bg-white/10" />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default PlayersSkeleton;
