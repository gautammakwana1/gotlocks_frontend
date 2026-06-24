"use client";

import React from "react";

const HeaderSkeleton = () => (
    <header className="relative overflow-visible -mx-5 bg-black sm:-mx-6">
        <div className="relative px-5 pt-2 pb-5 sm:px-6 sm:pt-3 sm:pb-6">
            <div className="relative">
                <div className="pointer-events-none absolute -inset-y-2 inset-x-0 rounded-[18px] bg-gradient-to-br from-slate-950/80 via-slate-900/65 to-blue-900/35 ring-1 ring-white/10 sm:-inset-y-3">
                    <div className="absolute inset-[1px] rounded-[17px] bg-gradient-to-b from-white/10 via-white/5 to-black/70" />
                    <div className="absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%)]" />
                </div>
                <div className="relative px-4 py-2 sm:px-5">
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
                        {/* Left column */}
                        <div className="flex flex-col">
                            {/* Identity */}
                            <div className="relative -mx-4 flex items-center gap-3 border-b border-white/10 px-4 pb-2 sm:-mx-5 sm:px-5 lg:mr-0">
                                <span className="absolute right-4 top-0 h-4 w-12 rounded-full bg-white/10 sm:right-5" />
                                <div className="relative -ml-1 flex h-16 w-16 shrink-0 items-center justify-center">
                                    <div className="h-12 w-12 rounded-full bg-white/10" />
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                    <div className="h-8 w-44 max-w-full rounded-lg bg-white/10" />
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-20 rounded bg-white/10" />
                                        <span className="h-3 w-px bg-white/15" />
                                        <div className="h-3 w-20 rounded bg-white/10" />
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="-mx-4 space-y-2.5 border-b border-white/10 px-4 py-3 sm:-mx-5 sm:px-5 lg:mr-0 lg:border-b-0">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                                    <div className="h-6 w-20 rounded bg-white/10 sm:h-7" />
                                    <div className="flex items-baseline gap-6 sm:gap-8">
                                        <div className="h-6 w-10 rounded bg-white/10 sm:h-7" />
                                        <div className="h-6 w-10 rounded bg-white/10 sm:h-7" />
                                        <div className="h-6 w-10 rounded bg-white/10 sm:h-7" />
                                    </div>
                                </div>
                                <div className="h-2 w-full rounded-full bg-white/10" />
                                <div className="flex items-start justify-between gap-3">
                                    <div className="h-3 w-24 rounded bg-white/10" />
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="h-2.5 w-24 rounded bg-white/10" />
                                        <div className="h-2.5 w-20 rounded bg-white/5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Badges column */}
                        <div className="pt-3 lg:relative lg:pt-0 lg:pl-6">
                            <div
                                aria-hidden
                                className="hidden lg:absolute lg:-top-4 lg:-bottom-4 lg:left-0 lg:block lg:w-px lg:bg-white/10"
                            />
                            <div className="flex w-full flex-col gap-2.5 lg:h-full lg:justify-between lg:gap-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="h-3 w-16 rounded bg-white/10" />
                                    <div className="h-2.5 w-14 rounded bg-white/10" />
                                </div>
                                <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div
                                            key={i}
                                            className="h-8 w-8 rounded-full bg-white/10 lg:h-10 lg:w-10"
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <div className="h-4 w-4 rounded bg-white/10" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>
);

export const PostCardSkeleton = () => (
    <div className="py-4 space-y-3 animate-pulse">
        <div className="flex items-center justify-between px-5 sm:px-6">
            <div className="h-4 w-32 rounded bg-white/10" />
            <div className="flex gap-2">
                <div className="h-7 w-12 rounded-md bg-white/5 border border-white/10" />
                <div className="h-7 w-12 rounded-md bg-white/5 border border-white/10" />
                <div className="h-7 w-7 rounded-md bg-white/5 border border-white/10" />
            </div>
        </div>
        <div className="px-5 sm:px-6 flex flex-col gap-2 sm:flex-row">
            <div className="order-2 flex w-full gap-2 sm:order-1 sm:w-[140px] sm:h-[140px] sm:flex-col">
                <div className="h-16 w-full rounded-xl bg-white/[0.04] border border-white/10 p-2.5 sm:h-[65px]">
                    <div className="h-2 w-8 rounded bg-white/10" />
                    <div className="mt-2 h-3 w-16 rounded bg-white/10" />
                </div>
                <div className="h-16 w-full rounded-xl bg-white/[0.04] border border-white/10 p-2.5 sm:h-[65px]">
                    <div className="h-2 w-12 rounded bg-white/10" />
                    <div className="mt-2 h-3 w-20 rounded bg-white/10" />
                </div>
            </div>
            <div className="order-1 flex-1 h-36 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:order-2 sm:min-h-[140px] sm:h-auto">
                <div className="h-2.5 w-24 rounded bg-white/10" />
                <div className="mt-3 h-px w-full bg-white/10" />
                <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-white/20" />
                        <div className="space-y-2">
                            <div className="h-3 w-32 rounded bg-white/10" />
                            <div className="h-2.5 w-48 rounded bg-white/5" />
                        </div>
                    </div>
                    <div className="h-3 w-10 rounded bg-white/10" />
                </div>
            </div>
        </div>
        <div className="flex justify-end px-5 sm:px-6">
            <div className="h-3 w-40 rounded bg-white/5" />
        </div>
    </div>
);

const ProfileSkeleton = () => {
    return (
        <div className="animate-pulse space-y-0">
            <HeaderSkeleton />
            <div className="space-y-4 pt-4">
                <div className="flex flex-wrap gap-2 px-1">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-9 w-24 rounded-xl border border-white/10 bg-white/5" />
                    ))}
                </div>
                <div className="mt-4">
                    <div className="-mx-5 h-px bg-white/10 sm:mx-0" />
                    <div className="divide-y divide-white/10">
                        {[1, 2, 3].map((i) => (
                            <PostCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSkeleton;
