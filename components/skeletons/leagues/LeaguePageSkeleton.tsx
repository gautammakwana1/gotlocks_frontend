
import { useIsMobile } from "@/lib/utils/helpers";
import React from "react";

const LeaguePageSkeleton = () => {
    const isMobile = useIsMobile();
    const HEADER_H = 62; // Desktop header height
    const ROW_H = 184;   // Desktop row height
    const STICKY_WIDTH = 100; // Desktop sticky width fallback
    const SCROLLABLE_AREA_WIDTH = isMobile ? 285 : 375; // Width of each scrollable column

    return (
        <div className="flex flex-col gap-8 animate-pulse pt-4">
            {/* Header Skeleton */}
            <header className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="h-4 w-32 rounded bg-white/5" />
                    <div className="h-8 w-8 rounded-2xl border border-white/10 bg-white/5" />
                </div>
                <div className="space-y-2">
                    <div className="h-10 w-64 rounded bg-white/10" />
                    <div className="h-4 w-full max-w-md rounded bg-white/5" />
                </div>
            </header>

            <section className="space-y-4">
                {/* Tabs Skeleton */}
                <div className="-mx-5 flex items-center gap-2 border-b border-white/10 pb-5 px-5 sm:mx-0 sm:px-0">
                    <div className="flex min-w-0 flex-1 gap-2 sm:gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-8 w-12 rounded bg-white/5 sm:w-24" />
                        ))}
                    </div>
                    <div className="h-7 w-7 rounded-full bg-white/5" />
                </div>

                {/* Leaderboard Header Skeleton */}
                <div className="space-y-5 pt-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="h-4 w-40 rounded bg-white/10" />
                        <div className="h-4 w-24 rounded bg-white/5" />
                    </div>

                    {/* Leaderboard List Skeleton */}
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
                                {[1, 2, 3].map((i) => (
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
                                            style={{ width: SCROLLABLE_AREA_WIDTH }}
                                        >
                                            <div
                                                className="border-b border-white/10 p-4"
                                                style={{ height: HEADER_H }}
                                            >
                                                <div className="h-5 w-32 rounded bg-white/10" />
                                            </div>
                                            {[1, 2, 3].map((row) => (
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
            </section>
        </div>
    );
};

export default LeaguePageSkeleton;
