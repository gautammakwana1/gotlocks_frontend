import React from "react";

const TransactionHistorySkeleton = () => {
    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 pb-20 animate-pulse">
            {/* Header Skeleton */}
            <header className="space-y-3 border-b border-white/10 pb-5">
                <div className="h-3 w-32 rounded bg-white/5" />
                <div className="h-8 w-64 rounded bg-white/10" />
                <div className="h-4 w-full max-w-md rounded bg-white/5" />
            </header>

            {/* Transaction Rows Skeleton */}
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-4"
                    >
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-4 w-28 rounded bg-white/10" />
                            <div className="h-3 w-40 rounded bg-white/5" />
                            <div className="h-3 w-24 rounded bg-white/5" />
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                            <div className="h-4 w-16 rounded bg-white/10" />
                            <div className="h-5 w-20 rounded-full bg-white/5" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Back Button Skeleton */}
            <div className="h-10 w-20 rounded-full border border-white/10 bg-white/5" />
        </div>
    );
};

export default TransactionHistorySkeleton;
