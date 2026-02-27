"use client";

import { Pick, PickReaction, Picks } from "@/lib/interfaces/interfaces";
import PostCard from "./PostCard";

type PostFeedProps = {
    picks: Picks;
    totalCount: number;
    displayName: string;
    mode: "self" | "public";
    variant?: "card" | "embedded";
    canDeletePick: (pick: Pick) => boolean;
    onDeletePick: (pickId: string) => void;
    onReaction: (reaction: PickReaction, pickId: string) => void;
    lastItemRef?: (node: HTMLDivElement | null) => void;
    loading?: boolean;
};

const PostFeed = ({
    picks,
    totalCount,
    displayName,
    mode,
    variant = "card",
    canDeletePick,
    onDeletePick,
    onReaction,
    lastItemRef,
    loading,
}: PostFeedProps) => {
    const countLabel =
        totalCount === picks.length
            ? `${picks.length} total`
            : `${picks.length} of ${totalCount}`;
    const description =
        mode === "self"
            ? "Your latest straight picks and combo posts."
            : `Latest straight picks and combo posts from ${displayName}.`;
    const emptyMessage =
        mode === "self"
            ? "No posts yet. Share a pick from the builder to show it here."
            : "No posts yet. Check back once they share new picks.";
    const showFooterCount = variant === "embedded";
    const showHeader = variant === "card";

    const wrapperClass = `space-y-4 ${variant === "card"
        ? "rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-soft)]"
        : ""
        }`;

    return (
        <section className={wrapperClass}>
            {showHeader ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            recent posts
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
                    </div>
                    <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                        {countLabel}
                    </span>
                </div>
            ) : null}

            <div className="-mx-5 divide-y divide-white/10 sm:mx-0">
                {picks.map((pick, index) => (
                    <div
                        key={pick.id}
                        ref={index === picks.length - 1 ? lastItemRef : undefined}
                    >
                        <PostCard
                            pick={pick}
                            displayName={displayName}
                            mode={mode}
                            canDelete={canDeletePick(pick)}
                            onDelete={onDeletePick}
                            onReaction={onReaction}
                        />
                    </div>
                ))}

                {picks.length === 0 && (
                    <div className="px-5 py-4 sm:px-6">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
                            {emptyMessage}
                        </div>
                    </div>
                )}
                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
                    </div>
                )}
            </div>
            {showFooterCount ? (
                <div>
                    <div className="-mx-5 h-px bg-white/10 sm:mx-0" />
                    <div className="mt-3 flex justify-end text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {countLabel}
                    </div>
                </div>
            ) : null}
        </section>
    );
};

export default PostFeed;
