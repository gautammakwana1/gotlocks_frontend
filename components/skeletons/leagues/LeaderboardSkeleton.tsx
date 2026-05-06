"use client";

import React from "react";

const LeaderboardSkeleton = () => {
    // Mimic the heights and widths from LeaderboardGrid
    const HEADER_H = 62; // Desktop header height
    const ROW_H = 184;   // Desktop row height
    const STICKY_WIDTH = 130; // Desktop sticky width fallback

    return (
        <div className="animate-pulse space-y-3">
            {/* Grid Container */}
            <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
                <div className="flex">
                    {/* Sticky Column */}
                    <div
                        className="flex flex-col border-r border-white/10 bg-[#151515]"
                        style={{ width: STICKY_WIDTH }}
                    >
                        <div
                            className="border-b border-white/10"
                            style={{ height: HEADER_H }}
                        />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="border-b border-white/10 p-4"
                                style={{ height: ROW_H }}
                            >
                                <div className="space-y-4">
                                    <div className="h-14 w-14 rounded-full bg-white/10" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-12 rounded bg-white/10" />
                                        <div className="h-3 w-8 rounded bg-white/10" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Scrollable Area */}
                    <div className="flex-1 overflow-hidden">
                        <div className="flex">
                            {[1, 2, 3].map((col) => (
                                <div
                                    key={col}
                                    className="flex-shrink-0 border-r border-white/10"
                                    style={{ width: 320 }}
                                >
                                    <div
                                        className="border-b border-white/10 p-4"
                                        style={{ height: HEADER_H }}
                                    >
                                        <div className="h-5 w-32 rounded bg-white/10" />
                                    </div>
                                    {[1, 2, 3, 4, 5].map((row) => (
                                        <div
                                            key={row}
                                            className="border-b border-white/10 p-4"
                                            style={{ height: ROW_H }}
                                        >
                                            <div className="h-full w-full rounded-2xl border border-white/5 bg-white/5" />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardSkeleton;
