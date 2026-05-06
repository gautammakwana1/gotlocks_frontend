
const HomeTabSkeleton = () => {
    return (
        <div className="flex flex-col gap-4 sm:gap-6 animate-pulse">
            {/* Welcome Section Skeleton */}
            <section className="-mx-2 -mt-3 relative overflow-hidden rounded-[18px] border border-white/10 p-4 shadow-2xl shadow-black/40 sm:mx-0 sm:mt-0 sm:p-6 lg:p-8">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/90 via-black/84 to-blue-950/16"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-[1px] rounded-[17px] bg-gradient-to-b from-white/7 via-black/32 via-62% to-black/86"
                />
                <div className="relative z-10 flex flex-col gap-5 sm:gap-6 lg:gap-8">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-center sm:gap-4">
                        <div className="max-w-xl">
                            <div className="mt-2 space-y-1 sm:mt-3">
                                <div className="h-6 w-32 rounded bg-white/10 sm:h-8 lg:h-9" />
                                <div className="h-8 w-48 rounded bg-white/10 sm:h-10 lg:h-11" />
                            </div>
                        </div>
                        <div className="w-full lg:max-w-none lg:justify-self-start">
                            <div className="flex items-center justify-between">
                                <div className="h-2.5 w-16 rounded bg-white/10" />
                                <div className="h-2.5 w-24 rounded bg-white/10" />
                            </div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 sm:mt-3 sm:h-2" />
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-3 sm:pt-4">
                        <div className="grid w-full grid-cols-4 gap-2 sm:gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex flex-col gap-1.5">
                                    <div className="h-2 w-10 rounded bg-white/5 sm:w-14" />
                                    <div className="h-5 w-8 rounded bg-white/10 sm:h-7 sm:w-12" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-4 sm:pt-6">
                        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                            <div className="h-2.5 w-24 rounded bg-white/10" />
                            <div className="h-2.5 w-12 rounded bg-white/10" />
                        </div>
                        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="relative min-h-[9rem] rounded-[18px] border border-white/10 bg-white/5 p-4">
                                    <div className="absolute right-4 top-4 h-2 w-16 rounded bg-white/5" />
                                    <div className="space-y-3">
                                        <div className="h-5 w-32 rounded bg-white/10" />
                                        <div className="h-3 w-48 rounded bg-white/5" />
                                        <div className="h-2.5 w-20 rounded bg-white/5 mt-auto pt-8" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="sm:hidden">
                            <div className="relative min-h-[7.5rem] rounded-[18px] border border-white/10 bg-white/5 p-3">
                                <div className="absolute right-3 top-3 h-2 w-12 rounded bg-white/5" />
                                <div className="space-y-2">
                                    <div className="h-4 w-28 rounded bg-white/10" />
                                    <div className="h-2.5 w-40 rounded bg-white/5" />
                                    <div className="h-2 w-16 rounded bg-white/5 mt-auto pt-6" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Actions Skeleton */}
            <section className="-mx-2 grid grid-cols-3 gap-2 sm:mx-0 sm:gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex h-[68px] items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-3 sm:h-[84px] sm:px-4 lg:h-[96px] lg:px-5">
                        <div className="space-y-1.5">
                            <div className="h-2.5 w-12 rounded bg-white/10 sm:h-3 sm:w-16" />
                            <div className="h-2.5 w-8 rounded bg-white/10 sm:h-3 sm:w-12" />
                        </div>
                        <div className="h-4 w-4 rounded bg-white/10 sm:h-5 sm:w-5" />
                    </div>
                ))}
            </section>

            {/* Activity Section Skeleton */}
            <section className="space-y-4">
                <div className="-mx-5 sm:mx-0">
                    <div className="h-px w-full bg-white/10" />
                    <div className="px-5 py-3 sm:px-0">
                        <div className="flex gap-5">
                            <div className="h-3 w-24 rounded bg-white/10" />
                            <div className="h-3 w-28 rounded bg-white/5" />
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="py-4 border-b border-white/10">
                            <div className="flex items-center justify-between px-5 pb-3 sm:px-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-white/10" />
                                    <div className="space-y-1.5">
                                        <div className="h-3 w-24 rounded bg-white/10" />
                                        <div className="h-2.5 w-16 rounded bg-white/5" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-6 w-12 rounded bg-white/5" />
                                    <div className="h-6 w-12 rounded bg-white/5" />
                                </div>
                            </div>
                            <div className="flex gap-2 px-5 sm:px-6">
                                <div className="flex flex-col gap-2 w-[140px]">
                                    <div className="h-[65px] rounded-xl border border-white/10 bg-white/5 p-2.5" />
                                    <div className="h-[65px] rounded-xl border border-white/10 bg-white/5 p-2.5" />
                                </div>
                                <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default HomeTabSkeleton;
