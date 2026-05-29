"use client";

import React from "react";

const CARD_COUNT = 4;

const BadgeCardSkeleton = ({ hasHolder }: { hasHolder: boolean }) => (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] p-4">
        {/* Header: icon + text on the left, points pill on the right */}
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 gap-3">
                {/* Icon tile */}
                <div className="h-10 w-10 shrink-0 rounded-xl border border-white/10 bg-black/30" />
                <div className="min-w-0 flex-1 space-y-2">
                    {/* Badge name */}
                    <div className="h-3.5 w-2/3 max-w-[8rem] rounded bg-white/10" />
                    {/* Category · subtitle */}
                    <div className="h-2 w-1/2 max-w-[6rem] rounded bg-white/[0.06]" />
                    {/* Description */}
                    <div className="h-2.5 w-full max-w-[12rem] rounded bg-white/[0.06]" />
                </div>
            </div>
            {/* Points pill */}
            <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="h-5 w-10 rounded-full bg-white/10" />
            </div>
        </div>

        {/* Holder / empty-state sub-box */}
        <div className="mt-4 space-y-2 rounded-md border border-white/10 bg-black/30 px-3 py-2">
            {hasHolder ? (
                <>
                    <div className="flex items-center justify-between gap-3">
                        <div className="h-3 w-24 max-w-[60%] rounded bg-white/10" />
                        <div className="h-2.5 w-12 shrink-0 rounded bg-white/[0.06]" />
                    </div>
                    <div className="h-2 w-32 max-w-[70%] rounded bg-white/[0.06]" />
                    <div className="h-2 w-28 max-w-[60%] rounded bg-white/[0.05]" />
                </>
            ) : (
                <div className="h-2.5 w-40 max-w-[75%] rounded bg-white/[0.06]" />
            )}
        </div>
    </div>
);

const BadgesSkeleton = () => {
    return (
        <section className="space-y-6 animate-pulse">
            {/* Intro heading block */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                        {/* Section title */}
                        <div className="h-3.5 w-40 max-w-[60%] rounded bg-white/10" />
                        {/* Description (two lines) */}
                        <div className="h-2.5 w-full max-w-3xl rounded bg-white/[0.06]" />
                        <div className="h-2.5 w-3/4 max-w-2xl rounded bg-white/[0.06]" />
                    </div>
                </div>
            </div>

            {/* Badge cards grid */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.from({ length: CARD_COUNT }).map((_, i) => (
                    <BadgeCardSkeleton key={i} hasHolder={i % 3 !== 2} />
                ))}
            </div>
        </section>
    );
};

export default BadgesSkeleton;
