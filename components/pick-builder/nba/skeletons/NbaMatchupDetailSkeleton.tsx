
import React from "react";

const NbaMatchupDetailSkeleton = () => {
    const boxClasses = "h-[40px] w-full shrink-0 rounded-md border border-white/10 bg-white/5 transition sm:h-[52px] flex items-center justify-center";

    return (
        <div className="space-y-4 animate-pulse">
            <div className="-mx-5 px-5 sm:-mx-6 sm:px-6">
                {/* Header Skeleton */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="h-3 w-32 rounded bg-white/10" />
                    <div className="h-3 w-40 rounded bg-white/5" />
                </div>

                {/* Matchup Title Skeleton */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                        <div className="h-5 w-64 rounded bg-white/10" />
                        <div className="h-3 w-32 rounded bg-white/5" />
                    </div>
                </div>

                {/* Tabs Skeleton */}
                <div className="scrollbar-hide -mx-5 mt-4 flex gap-3 overflow-x-auto border-b border-white/10 px-5 pb-2 sm:mx-0 sm:px-0">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-4 w-20 shrink-0 rounded bg-white/5" />
                    ))}
                </div>
            </div>

            <div className="-mx-5 divide-y divide-white/10 sm:mx-0">
                {/* Game Lines Section Skeleton */}
                <section className="px-5 pb-6 pt-3 sm:px-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-24 rounded bg-white/10" />
                        <div className="h-3 w-3 rounded bg-white/5" />
                    </div>

                    <div className="mt-4 space-y-0 [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                        <div
                            className="grid items-center gap-2 text-xs uppercase tracking-wide text-gray-400"
                            style={{
                                gridTemplateColumns: "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                            }}
                        >
                            <div className="h-2 w-12 rounded bg-white/5" />
                            <div className="mx-auto h-2 w-8 rounded bg-white/10" />
                            <div className="mx-auto h-2 w-8 rounded bg-white/10" />
                            <div className="mx-auto h-2 w-8 rounded bg-white/10" />
                        </div>

                        {[1, 2].map((team) => (
                            <div
                                key={team}
                                className="grid items-stretch gap-1 mt-1"
                                style={{
                                    gridTemplateColumns: "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                                }}
                            >
                                <div className="flex min-h-[52px] min-w-0 items-center gap-2 px-0 sm:gap-3">
                                    <div className="h-9 w-9 rounded-full bg-white/5 sm:h-10 sm:w-10" />
                                    <div className="h-3 w-32 rounded bg-white/10" />
                                </div>
                                {[1, 2, 3].map((box) => (
                                    <div key={box} className="flex min-h-[60px] flex-col items-center justify-center px-2 py-1 sm:px-3">
                                        <div className={boxClasses} />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Alternate Run Line Section Skeleton */}
                <section className="px-5 py-6 sm:px-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-4 w-40 rounded bg-white/10" />
                        <div className="h-3 w-3 rounded bg-white/5" />
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                            <div className="min-w-full w-max text-xs text-white [--table-chip-width:60px] sm:[--table-chip-width:96px]">
                                <div
                                    className="grid gap-2 text-xs uppercase tracking-wide text-gray-400"
                                    style={{
                                        gridTemplateColumns: "minmax(0,1fr) var(--table-chip-width)",
                                    }}
                                >
                                    <div className="h-2 w-12 rounded bg-white/5" />
                                    <div className="text-center h-2 w-8 mx-auto rounded bg-white/5" />
                                </div>

                                {[1, 2].map((row) => (
                                    <div
                                        key={row}
                                        className="grid items-center gap-2 border-b border-white/5 text-left bg-transparent"
                                        style={{
                                            gridTemplateColumns: "minmax(0,1fr) var(--table-chip-width)",
                                        }}
                                    >
                                        <div className="py-2.5 space-y-2">
                                            <div className="h-3.5 w-48 rounded bg-white/10" />
                                            <div className="h-2.5 w-12 rounded bg-white/5" />
                                        </div>
                                        <div className="flex justify-center px-3 py-3">
                                            <div className={boxClasses} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Line Scroller Skeleton */}
                        <div className="flex items-center justify-center gap-4 py-2 opacity-50">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-3 w-8 rounded bg-white/10" />
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default NbaMatchupDetailSkeleton;
