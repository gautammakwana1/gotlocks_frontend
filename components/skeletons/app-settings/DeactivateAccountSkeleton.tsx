
import React from "react";

const DeactivateAccountSkeleton = () => {
    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <header className="space-y-3 border-b border-white/10 pb-5">
                <div className="h-3 w-32 rounded bg-white/5" />
                <div className="h-8 w-64 rounded bg-white/10" />
            </header>

            {/* Warning Section Skeleton */}
            <section className="space-y-4 border-b border-white/10 pb-5">
                <div className="space-y-2">
                    <div className="h-4 w-full rounded bg-white/5" />
                    <div className="h-4 w-3/4 rounded bg-white/5" />
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                    <div className="h-10 w-40 rounded-full bg-white/10" />
                    <div className="h-10 w-20 rounded-full border border-white/10 bg-white/5" />
                </div>
            </section>

            {/* Blockers Section Placeholder (Optional looking) */}
            <div className="space-y-4">
                <div className="h-6 w-48 rounded bg-white/10" />
                <div className="h-4 w-full max-w-md rounded bg-white/5" />

                <div className="space-y-3 pt-2">
                    <div className="h-3 w-32 rounded bg-white/5 uppercase" />
                    <div className="space-y-4 border-y border-white/10 py-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                                <div className="space-y-2 flex-1">
                                    <div className="h-5 w-40 rounded bg-white/10" />
                                    <div className="h-3 w-32 rounded bg-white/5" />
                                </div>
                                <div className="h-4 w-24 rounded bg-white/5" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
                <div className="h-10 w-20 rounded-full border border-white/10 bg-white/5" />
            </div>
        </div>
    );
};

export default DeactivateAccountSkeleton;
