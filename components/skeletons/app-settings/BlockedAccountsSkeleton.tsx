
import React from "react";

const BlockedAccountsSkeleton = () => {
    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 pb-20 animate-pulse">
            {/* Header Skeleton */}
            <header className="space-y-3 border-b border-white/10 pb-5">
                <div className="h-3 w-32 rounded bg-white/5" />
                <div className="h-8 w-64 rounded bg-white/10" />
                <div className="h-4 w-full max-w-md rounded bg-white/5" />
            </header>

            {/* Blocked Users List Skeleton */}
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4"
                    >
                        {/* Profile Info */}
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-4 w-32 rounded bg-white/10" />
                                <div className="h-3 w-20 rounded bg-white/5" />
                            </div>
                        </div>

                        {/* Unblock Button */}
                        <div className="h-9 w-20 rounded-full bg-white/10" />
                    </div>
                ))}
            </div>

            {/* Info Box Skeleton */}
            <div className="h-16 w-full rounded-3xl border border-white/10 bg-white/5" />

            {/* Back Button Skeleton */}
            <div className="h-10 w-20 rounded-full border border-white/10 bg-white/5" />
        </div>
    );
};

export default BlockedAccountsSkeleton;
