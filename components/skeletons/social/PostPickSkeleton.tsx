const PostPickSkeleton = () => {
    return (
        <div className="py-4 animate-pulse">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 sm:px-6">
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
                    <div className="h-4 w-4 rounded bg-white/5" />
                </div>
            </div>
            <div className="space-y-3 px-5 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <div className="order-2 flex w-full gap-2 sm:order-1 sm:w-[140px] sm:flex-col">
                        <div className="h-[65px] flex-1 rounded-xl border border-white/10 bg-white/5 p-2.5" />
                        <div className="h-[65px] flex-1 rounded-xl border border-white/10 bg-white/5 p-2.5" />
                    </div>
                    <div className="relative order-1 flex-1 rounded-xl border border-white/10 bg-white/5 p-3 sm:order-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-3">
                                <div className="h-2.5 w-20 rounded bg-white/10" />
                                <div className="h-px w-full bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-2 w-16 rounded bg-white/5" />
                                        <div className="h-3 w-3/4 rounded bg-white/10" />
                                        <div className="h-2 w-1/2 rounded bg-white/5" />
                                    </div>
                                </div>
                            </div>
                            <div className="h-3 w-10 rounded bg-white/10" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="h-5 w-16 rounded-full bg-white/5" />
                    <div className="h-3 w-32 rounded bg-white/5" />
                </div>
            </div>
        </div>
    );
};

export default PostPickSkeleton;
