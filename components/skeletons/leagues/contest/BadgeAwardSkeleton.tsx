"use client";

import React from "react";

const CARD_COUNT = 8;
const CATEGORY_COUNT = 3;

/**
 * Mirrors the fixed-height badge card on the Capture the Badge board: a title +
 * reserved points rail, the description block, and the full-bleed holder footer.
 */
const BadgeCardSkeleton = () => (
    <div className="relative flex h-[14.25rem] w-full flex-col rounded-lg border border-white/10 bg-white/[0.03] p-2.5 min-[360px]:h-56 min-[390px]:h-[13.25rem] sm:h-[17rem] sm:rounded-xl sm:p-4 lg:h-64">
        <div className="grid h-28 min-w-0 grid-cols-[minmax(0,1fr)_4rem] grid-rows-[2.5rem_minmax(0,1fr)] gap-x-2 min-[360px]:h-[6.75rem] min-[390px]:h-24 sm:h-[8rem] sm:grid-cols-[minmax(0,1fr)_5rem] sm:grid-rows-[3.5rem_minmax(0,1fr)] sm:gap-x-4 lg:grid-cols-[minmax(0,1fr)_5.5rem]">
            {/* Badge name */}
            <div className="col-start-1 row-start-1 flex min-w-0 items-start pt-1">
                <div className="h-2.5 w-4/5 max-w-[7rem] rounded bg-white/10 sm:h-3.5" />
            </div>
            {/* Reserved points rail */}
            <div className="col-start-2 row-start-1 flex items-start justify-end">
                <div className="h-9 w-full rounded-lg border border-sky-200/10 bg-white/[0.04] sm:h-12 sm:rounded-xl" />
            </div>
            {/* Description + minimum */}
            <div className="col-span-2 row-start-2 flex min-h-0 flex-col gap-1 pt-1 sm:gap-1.5 sm:pt-[0.25rem]">
                <div className="h-2 w-full rounded bg-white/[0.06] sm:h-2.5" />
                <div className="h-2 w-11/12 rounded bg-white/[0.06] sm:h-2.5" />
                <div className="h-2 w-1/2 rounded bg-white/[0.04] sm:h-2.5" />
            </div>
        </div>

        {/* Artwork zone */}
        <div className="relative -mr-2.5 h-12 shrink-0 overflow-hidden sm:-mr-4 sm:h-14">
            <div className="absolute -bottom-1 -right-1.5 h-12 w-12 rounded-full bg-white/[0.03] sm:-right-2 sm:h-14 sm:w-14" />
        </div>

        {/* Holder footer */}
        <div className="-mx-2.5 mt-auto h-12 shrink-0 space-y-1.5 border-t border-white/10 px-2.5 pt-2 sm:-mx-4 sm:h-14 sm:px-4 sm:pt-3">
            <div className="flex items-baseline justify-between gap-2">
                <div className="h-2.5 w-24 max-w-[60%] rounded bg-white/10" />
                <div className="h-2.5 w-10 shrink-0 rounded bg-white/[0.06]" />
            </div>
            <div className="h-2 w-4/5 rounded bg-white/[0.05]" />
        </div>
    </div>
);

const BadgesSkeleton = () => {
    return (
        <section className="space-y-5 pt-4 animate-pulse sm:space-y-7 sm:pt-6 lg:space-y-8 lg:pt-7">
            {/* Capture the Badge board summary */}
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-5 sm:rounded-xl sm:px-6 lg:px-8 lg:py-6">
                <div className="pr-20 sm:pr-28 lg:pr-32">
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Title */}
                        <div className="h-3.5 w-40 max-w-[55%] rounded bg-white/10 sm:h-4" />
                        {/* On/off state */}
                        <div className="h-2 w-8 rounded bg-white/[0.06]" />
                    </div>
                    {/* Two-line state description */}
                    <div className="mt-1.5 space-y-1.5 sm:mt-2">
                        <div className="h-2.5 w-full max-w-2xl rounded bg-white/[0.06]" />
                        <div className="h-2.5 w-4/5 max-w-xl rounded bg-white/[0.05]" />
                    </div>
                </div>
                {/* Counts + reserved save slot */}
                <div className="mt-3 flex h-7 items-center justify-between gap-3 sm:mt-4 sm:h-9 lg:mt-5 lg:h-10">
                    <div className="flex items-center gap-x-3 sm:gap-x-5">
                        <div className="h-2.5 w-20 rounded bg-white/[0.06]" />
                        <div className="h-2.5 w-16 rounded bg-white/[0.06]" />
                    </div>
                    <div className="h-7 w-11 shrink-0 rounded-md bg-white/[0.08] sm:h-9 sm:w-16 sm:rounded-lg lg:h-10 lg:w-20" />
                </div>
            </div>

            {/* Category rail */}
            <div className="-mx-1 px-1">
                <div className="flex min-w-max items-center gap-4 border-b border-white/[0.08] sm:gap-6 lg:gap-8">
                    {Array.from({ length: CATEGORY_COUNT }).map((_, i) => (
                        <div key={i} className="flex h-8 shrink-0 items-center gap-1.5 px-0.5 sm:h-11 sm:gap-2 lg:h-12">
                            <div className="h-1.5 w-1.5 rounded-full bg-white/[0.12] sm:h-2 sm:w-2" />
                            <div className="h-2.5 w-16 rounded bg-white/[0.08]" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Badge board */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
                {Array.from({ length: CARD_COUNT }).map((_, i) => (
                    <BadgeCardSkeleton key={i} />
                ))}
            </div>
        </section>
    );
};

export default BadgesSkeleton;
