
const HomeTabSkeleton = () => {
    return (
        <div className="flex animate-pulse flex-col">
            {/* Hero: welcome title + groups carousel */}
            <section className="relative -mx-5 overflow-hidden bg-[#050505] px-5 pb-5 pt-4 sm:-mx-6 sm:px-6 sm:pb-6 sm:pt-5 lg:pb-8 lg:pt-6">
                <div className="absolute right-5 top-4 h-8 w-8 rounded-full border border-white/10 bg-white/5 sm:right-6 sm:top-6 lg:right-8 lg:top-8" />
                <div className="relative z-10 flex flex-col gap-4 sm:gap-5 lg:gap-6">
                    <div className="max-w-xl space-y-2 pr-12">
                        <div className="h-7 w-40 rounded bg-white/10 sm:h-9 sm:w-48" />
                        <div className="h-7 w-56 rounded bg-white/10 sm:h-9 sm:w-72" />
                    </div>
                    <div className="-mx-5 border-t border-white/10 px-5 pt-4 sm:-mx-6 sm:px-6 sm:pt-6">
                        <div className="mb-3 sm:mb-4">
                            <div className="h-2.5 w-24 rounded bg-white/10" />
                        </div>
                        <div className="sm:hidden">
                            <div className="relative min-h-[152px] rounded-[22px] border border-sky-200/15 bg-[linear-gradient(145deg,rgba(14,42,67,0.82),rgba(8,15,27,0.98))] p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="h-2 w-24 rounded bg-white/10" />
                                    <div className="h-2 w-16 rounded bg-white/5" />
                                </div>
                                <div className="py-4">
                                    <div className="h-6 w-40 rounded bg-white/10" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-2 w-16 rounded bg-white/5" />
                                    <div className="h-2 w-20 rounded bg-white/5" />
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-white/20" />
                                ))}
                            </div>
                        </div>
                        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-4">
                            {[1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="relative min-h-[164px] rounded-[22px] border border-sky-200/15 bg-[linear-gradient(145deg,rgba(14,42,67,0.82),rgba(8,15,27,0.98))] p-6"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="h-2 w-24 rounded bg-white/10" />
                                        <div className="h-2 w-16 rounded bg-white/5" />
                                    </div>
                                    <div className="py-4">
                                        <div className="h-7 w-44 rounded bg-white/10" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="h-2 w-16 rounded bg-white/5" />
                                        <div className="h-2 w-20 rounded bg-white/5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Pick builder */}
            <section className="-mx-5 border-t border-white/10 px-5 pt-3 sm:-mx-6 sm:px-6 sm:pt-3.5">
                <div className="mb-1 flex items-center justify-between gap-4">
                    <div className="h-2.5 w-20 rounded bg-white/10" />
                    <div className="h-2.5 w-16 rounded bg-white/5" />
                </div>
                <div className="space-y-3 py-3">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-7 w-16 rounded-full bg-white/5" />
                        ))}
                    </div>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 rounded-2xl border border-white/10 bg-white/5" />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default HomeTabSkeleton;
