// ─── Skeleton card — mirrors the exact layout of a real user row ────────────
// Mobile: badges sit below the username (column layout)
// Desktop: badges float to the right (row layout)
const UserSearchSkeleton = ({ count = 5 }: { count?: number }) => (
    <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
            <div
                key={i}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                aria-hidden="true"
            >
                {/* Left section: avatar + text */}
                <div className="flex min-w-0 items-center gap-3">
                    {/* Avatar circle */}
                    <div className="h-11 w-11 shrink-0 rounded-full skeleton-shimmer" />

                    <div className="flex flex-col justify-between gap-1.5 min-w-0">
                        {/* Username line */}
                        <div
                            className="h-3 rounded-full skeleton-shimmer"
                            style={{ width: `${88 + (i % 3) * 24}px` }}
                        />

                        {/* Mobile-only badge pills (below username) */}
                        <div className="flex items-center gap-2 sm:hidden">
                            <div className="h-4 w-14 rounded-full skeleton-shimmer" />
                            <div className="h-4 w-12 rounded-full skeleton-shimmer" />
                        </div>
                    </div>
                </div>

                {/* Desktop-only badge pills (right side) */}
                <div className="hidden sm:flex shrink-0 items-center gap-2">
                    <div className="h-5 w-16 rounded-full skeleton-shimmer" />
                    <div className="h-5 w-14 rounded-full skeleton-shimmer" />
                </div>
            </div>
        ))}
    </div>
);

export default UserSearchSkeleton;