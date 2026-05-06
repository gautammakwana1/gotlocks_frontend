
import React from "react";

const NbaPickBuilderSkeleton = () => {
    const boxClasses = "h-[40px] w-full shrink-0 rounded-md border border-white/10 bg-white/5 transition sm:h-[52px] flex items-center justify-center";

    return (
        <div className="space-y-6 animate-pulse">
            {/* "choose a matchup" Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="h-3 w-32 rounded bg-white/5" />
            </div>

            {/* Matchups List Skeleton */}
            <div className="-mx-5 divide-y divide-white/10 sm:mx-0">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="py-4 px-2 space-y-0 [--table-chip-width:60px] sm:[--table-chip-width:96px]"
                    >
                        {/* Headers */}
                        <div
                            className="grid items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400"
                            style={{
                                gridTemplateColumns:
                                    "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                            }}
                        >
                            <div className="px-3" />
                            <div className="text-center">
                                <div className="mx-auto h-2 w-8 rounded bg-white/10" />
                            </div>
                            <div className="text-center">
                                <div className="mx-auto h-2 w-8 rounded bg-white/10" />
                            </div>
                            <div className="text-center">
                                <div className="mx-auto h-2 w-8 rounded bg-white/10" />
                            </div>
                        </div>

                        {/* Away Team Row */}
                        <div
                            className="grid items-stretch gap-1"
                            style={{
                                gridTemplateColumns:
                                    "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                            }}
                        >
                            <div className="flex min-h-[36px] sm:min-h-[52px] items-center px-3">
                                <div className="h-3 w-24 rounded bg-white/10" />
                            </div>
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="flex min-h-[60px] items-center justify-center px-2 py-1 sm:px-3">
                                    <div className={boxClasses} />
                                </div>
                            ))}
                        </div>

                        {/* Divider */}
                        <div
                            className="grid items-center -mt-2 sm:mt-0"
                            style={{
                                gridTemplateColumns:
                                    "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                            }}
                        >
                            <div className="px-3">
                                <div className="relative flex items-center h-px w-full overflow-hidden">
                                    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-sky-700/50 to-transparent"></div>
                                </div>
                            </div>
                            <div />
                            <div />
                            <div />
                        </div>

                        {/* Home Team Row */}
                        <div
                            className="grid items-stretch gap-1 -mt-2 sm:mt-0"
                            style={{
                                gridTemplateColumns:
                                    "minmax(0,1fr) repeat(3, var(--table-chip-width))",
                            }}
                        >
                            <div className="flex min-h-[36px] sm:min-h-[52px] items-center px-3">
                                <div className="h-3 w-28 rounded bg-white/10" />
                            </div>
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="flex min-h-[60px] items-center justify-center px-2 py-1 sm:px-3">
                                    <div className={boxClasses} />
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div
                            className="flex items-center justify-between px-3 pt-2 text-xs text-gray-400"
                        >
                            <div className="h-2.5 w-24 rounded bg-white/5" />
                            <div className="flex items-center">
                                <div className="h-3 w-3 rounded bg-white/5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NbaPickBuilderSkeleton;
