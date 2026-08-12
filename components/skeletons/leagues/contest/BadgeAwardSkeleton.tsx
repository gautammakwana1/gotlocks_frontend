"use client";

import React from "react";

const CARD_COUNT = 6;
const STEP_COUNT = 3;

const BadgeCardSkeleton = ({ hasHolder }: { hasHolder: boolean }) => (
    <div className="relative flex min-h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025)_55%,rgba(0,0,0,0.35))] p-5 sm:p-6">
        {/* Medallion + name / category / description */}
        <div className="relative flex items-start gap-4 sm:gap-5">
            <div className="h-16 w-16 shrink-0 rounded-full border border-white/10 bg-black/30" />
            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                    {/* Badge name */}
                    <div className="h-4 w-2/3 max-w-[9rem] rounded bg-white/10" />
                    {/* +N pts */}
                    <div className="h-3 w-12 shrink-0 rounded bg-white/[0.08]" />
                </div>
                {/* Category · subtitle */}
                <div className="h-2.5 w-1/2 max-w-[7rem] rounded bg-white/[0.06]" />
                {/* Description (two lines) */}
                <div className="h-2.5 w-full rounded bg-white/[0.06]" />
                <div className="h-2.5 w-4/5 rounded bg-white/[0.05]" />
            </div>
        </div>

        {/* Holder / unclaimed footer */}
        <div className="relative mt-5 border-t border-white/10 pt-4 space-y-2">
            <div className="h-2 w-24 rounded bg-white/[0.06]" />
            {hasHolder ? (
                <>
                    <div className="flex items-baseline justify-between gap-3">
                        <div className="h-3.5 w-28 max-w-[60%] rounded bg-white/10" />
                        <div className="h-3 w-12 shrink-0 rounded bg-white/[0.06]" />
                    </div>
                    <div className="h-2.5 w-full max-w-[16rem] rounded bg-white/[0.05]" />
                </>
            ) : (
                <div className="h-2.5 w-40 max-w-[75%] rounded bg-white/[0.05]" />
            )}
        </div>
    </div>
);

const BadgesSkeleton = () => {
    return (
        <section className="space-y-7 animate-pulse sm:space-y-8">
            {/* Capture the Badge hero */}
            <div className="relative overflow-hidden rounded-[28px] border border-sky-300/20 bg-[linear-gradient(145deg,rgba(14,165,233,0.16),rgba(15,23,42,0.72)_48%,rgba(0,0,0,0.92))]">
                <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10 lg:p-8">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
                        <div className="h-16 w-16 shrink-0 rounded-full border border-white/10 bg-black/30 sm:h-20 sm:w-20" />
                        <div className="min-w-0 flex-1 space-y-3">
                            {/* Eyebrow */}
                            <div className="h-2.5 w-32 rounded bg-white/[0.08]" />
                            {/* Title */}
                            <div className="h-6 w-56 max-w-full rounded bg-white/10" />
                            {/* Blurb (two lines) */}
                            <div className="h-3 w-full max-w-2xl rounded bg-white/[0.06]" />
                            <div className="h-3 w-3/4 max-w-xl rounded bg-white/[0.05]" />
                        </div>
                    </div>

                    {/* Active badges / Captured now */}
                    <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-5 lg:min-w-64 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                        <div className="space-y-2 pr-4">
                            <div className="h-2.5 w-20 rounded bg-white/[0.06]" />
                            <div className="h-6 w-10 rounded bg-white/10" />
                        </div>
                        <div className="space-y-2 pl-4">
                            <div className="h-2.5 w-20 rounded bg-white/[0.06]" />
                            <div className="h-6 w-10 rounded bg-white/10" />
                        </div>
                    </div>
                </div>

                {/* Three-step rail */}
                <div className="grid border-t border-white/10 bg-black/20 sm:grid-cols-3 sm:divide-x sm:divide-white/10">
                    {Array.from({ length: STEP_COUNT }).map((_, i) => (
                        <div key={i} className="flex gap-3 px-5 py-4 sm:px-6 sm:py-5">
                            <div className="h-8 w-8 shrink-0 rounded-full border border-sky-300/20 bg-sky-500/10" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-3 w-28 max-w-full rounded bg-white/10" />
                                <div className="h-2.5 w-full max-w-[13rem] rounded bg-white/[0.06]" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Badge board heading */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-2.5 w-24 rounded bg-white/[0.08]" />
                    <div className="h-5 w-52 max-w-[70%] rounded bg-white/10" />
                    <div className="h-3 w-full max-w-2xl rounded bg-white/[0.06]" />
                </div>
                <div className="h-3 w-24 shrink-0 rounded bg-white/[0.06]" />
            </div>

            {/* Badge board */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: CARD_COUNT }).map((_, i) => (
                    <BadgeCardSkeleton key={i} hasHolder={i % 3 !== 2} />
                ))}
            </div>
        </section>
    );
};

export default BadgesSkeleton;
