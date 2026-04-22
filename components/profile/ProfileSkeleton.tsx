"use client";

import React from "react";

const HeaderSkeleton = () => (
    <header className="relative overflow-visible -mx-5 bg-black sm:-mx-6">
        <div className="relative px-5 pt-2 pb-5 sm:px-6 sm:pt-3 sm:pb-6">
            <div className="relative">
                <div className="pointer-events-none absolute -inset-y-2 inset-x-0 rounded-[18px] bg-gradient-to-br from-slate-950/80 via-slate-900/65 to-blue-900/35 ring-1 ring-white/10 sm:-inset-y-3" />
                <div className="relative origin-top-left scale-[0.95] pl-1 sm:scale-100 sm:pl-2">
                    <div className="relative grid gap-5 sm:gap-6 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,250px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
                        <div className="relative h-full w-full p-3 sm:p-4">
                            <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto_auto] gap-3 sm:gap-4 sm:grid-rows-[auto_1fr] sm:items-start">
                                <div className="relative col-start-1 row-start-2 -ml-1 flex h-18 w-18 items-center justify-center sm:h-22 sm:w-22 sm:col-start-1 sm:row-span-2 sm:row-start-1">
                                    <div className="h-14 w-14 rounded-full bg-white/10 sm:h-18 sm:w-18" />
                                </div>
                                <div className="min-w-0 col-span-2 row-start-1 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                                    <div className="h-7 w-48 rounded-lg bg-white/10 sm:h-8" />
                                </div>
                                <div className="min-w-0 col-start-2 row-start-2 flex flex-col gap-3 self-center sm:col-start-2 sm:row-start-2 sm:h-full sm:self-auto">
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 w-10 rounded bg-white/10" />
                                        <div className="h-1.5 flex-1 rounded-full bg-white/10 min-w-[100px] sm:min-w-[140px]" />
                                        <div className="h-3 w-20 rounded bg-white/10 hidden sm:block" />
                                    </div>
                                    <div className="mt-auto hidden sm:flex items-center gap-3">
                                        <div className="h-4 w-24 rounded bg-white/10" />
                                        <div className="h-4 w-24 rounded bg-white/10" />
                                    </div>
                                </div>
                                <div className="col-start-1 row-start-3 col-span-2 sm:hidden flex flex-col gap-2">
                                    <div className="h-4 w-40 rounded bg-white/10" />
                                    <div className="h-3 w-24 rounded bg-white/10 opacity-50" />
                                </div>
                            </div>
                        </div>
                        <div className="flex h-full flex-col gap-4 border-l border-white/10 pl-4 sm:gap-5 sm:pl-5 lg:pl-6">
                            <div className="space-y-3 pt-2">
                                <div className="h-3 w-24 rounded bg-white/10" />
                                <div className="flex gap-3">
                                    <div className="h-5 w-12 rounded bg-white/10" />
                                    <div className="h-5 w-12 rounded bg-white/10" />
                                    <div className="h-5 w-12 rounded bg-white/10" />
                                </div>
                                <div className="h-3 w-32 rounded bg-white/10" />
                            </div>
                            <div className="mt-auto border-t border-white/10 pt-4 pb-1 space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="h-3 w-12 rounded bg-white/10" />
                                    <div className="h-2 w-16 rounded bg-white/5" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-7 w-7 rounded-full bg-white/10" />
                                    <div className="h-7 w-7 rounded-full bg-white/10" />
                                    <div className="h-7 w-7 rounded-full bg-white/10" />
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
