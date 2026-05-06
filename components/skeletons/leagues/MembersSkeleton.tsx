"use client";

import React from "react";

const MembersSkeleton = () => {
    return (
        <div className="animate-pulse space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                        key={i}
                        className="relative flex aspect-square w-full flex-col rounded-2xl border border-white/5 bg-white/5 p-4 shadow-sm"
                    >
                        <div className="flex flex-1 flex-col items-center gap-3 pt-3">
                            <div className="h-14 w-14 rounded-xl bg-white/10" />
                            <div className="flex flex-col items-center gap-2">
                                <div className="h-4 w-20 rounded bg-white/10" />
                                <div className="h-3 w-16 rounded bg-white/10" />
                            </div>
                        </div>
                        <div className="mt-auto h-8 w-full rounded-lg bg-white/5" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MembersSkeleton;
